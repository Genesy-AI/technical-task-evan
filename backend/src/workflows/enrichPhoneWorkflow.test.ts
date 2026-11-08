import path from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TestWorkflowEnvironment } from '@temporalio/testing'
import { DefaultLogger, Runtime, Worker } from '@temporalio/worker'
import { ApplicationFailure } from '@temporalio/common'
import { enrichPhoneWorkflow } from './workflows'
import { PROVIDER_ORDER, providerTaskQueue } from '../enrichment/settings'
import type { PhoneLookupInput, PhoneLookupResult, ProviderId } from '../enrichment/types'

type LookupMock = (providerId: ProviderId, attempt: number) => PhoneLookupResult

const input: PhoneLookupInput = { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@analytical.io', jobTitle: 'CTO' }

let env: TestWorkflowEnvironment

beforeAll(async () => {
  Runtime.install({ logger: new DefaultLogger('WARN') })
  env = await TestWorkflowEnvironment.createTimeSkipping()
}, 120_000)

afterAll(async () => {
  await env?.teardown()
})

async function runEnrichment(lookup: LookupMock) {
  const calls: ProviderId[] = []
  const attempts: Partial<Record<ProviderId, number>> = {}
  const saved: unknown[] = []
  const progress: ProviderId[] = []
  const taskQueue = `test-${Math.random()}`

  const dbActivities = {
    async markPhoneEnrichmentProgress(_leadId: number, providerId: ProviderId) {
      progress.push(providerId)
    },
    async savePhoneEnrichmentResult(_leadId: number, result: unknown) {
      saved.push(result)
    },
  }

  const mainWorker = await Worker.create({
    connection: env.nativeConnection,
    taskQueue,
    workflowsPath: path.resolve(__dirname, 'workflows.ts'),
    activities: dbActivities,
  })

  const providerWorkers = await Promise.all(
    PROVIDER_ORDER.map((id) =>
      Worker.create({
        connection: env.nativeConnection,
        taskQueue: providerTaskQueue(id),
        activities: {
          async lookupPhone(providerId: ProviderId) {
            calls.push(providerId)
            attempts[providerId] = (attempts[providerId] ?? 0) + 1
            return lookup(providerId, attempts[providerId]!)
          },
        },
      })
    )
  )

  const runAll = <T>(fn: () => Promise<T>) =>
    providerWorkers.reduce<() => Promise<T>>((inner, worker) => () => worker.runUntil(inner), () =>
      mainWorker.runUntil(fn)
    )()

  const result = await runAll(() =>
    env.client.workflow.execute(enrichPhoneWorkflow, {
      taskQueue,
      workflowId: `enrich-phone-test-${Math.random()}`,
      args: [1, input],
    })
  )

  return { result, calls, saved, progress }
}

describe('enrichPhoneWorkflow', () => {
  it('stops at the first provider that finds a phone', async () => {
    const { result, calls, saved } = await runEnrichment((providerId) =>
      providerId === 'orionConnect' ? { skipped: false, phone: '111' } : { skipped: false, phone: '999' }
    )

    expect(result).toEqual({ status: 'FOUND', phoneNumber: '111', providerId: 'orionConnect' })
    expect(calls).toEqual(['orionConnect'])
    expect(saved).toEqual([{ status: 'FOUND', phoneNumber: '111', providerId: 'orionConnect' }])
  }, 60_000)

  it('retries a flaky provider before moving on', async () => {
    const { result, calls } = await runEnrichment((providerId, attempt) => {
      if (providerId === 'orionConnect' && attempt < 3) throw new Error('500 Internal server error')
      return { skipped: false, phone: providerId === 'orionConnect' ? '111' : null }
    })

    expect(result).toEqual({ status: 'FOUND', phoneNumber: '111', providerId: 'orionConnect' })
    expect(calls).toEqual(['orionConnect', 'orionConnect', 'orionConnect'])
  }, 60_000)

  it('falls through skipped, empty and failing providers in order', async () => {
    const { result, calls, progress } = await runEnrichment((providerId) => {
      if (providerId === 'orionConnect') return { skipped: true }
      if (providerId === 'astraDialer') throw ApplicationFailure.nonRetryable('401 Unauthorized')
      return { skipped: false, phone: '333' }
    })

    expect(result).toEqual({ status: 'FOUND', phoneNumber: '333', providerId: 'nimbusLookup' })
    expect(calls).toEqual(['orionConnect', 'astraDialer', 'nimbusLookup'])
    expect(progress).toEqual(['orionConnect', 'astraDialer', 'nimbusLookup'])
  }, 60_000)

  it('gives up after 3 attempts per provider and marks NOT_FOUND when nobody has data', async () => {
    const { result, calls, saved } = await runEnrichment((providerId) => {
      if (providerId === 'astraDialer') throw new Error('500 Internal server error')
      return { skipped: false, phone: null }
    })

    expect(result).toEqual({ status: 'NOT_FOUND' })
    expect(calls).toEqual(['orionConnect', 'astraDialer', 'astraDialer', 'astraDialer', 'nimbusLookup'])
    expect(saved).toEqual([{ status: 'NOT_FOUND' }])
  }, 60_000)
})
