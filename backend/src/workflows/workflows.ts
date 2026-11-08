import { ActivityFailure, CancellationScope, log, proxyActivities } from '@temporalio/workflow'
import type * as activities from './activities'
import { PROVIDER_ORDER, PROVIDER_SETTINGS, providerTaskQueue } from '../enrichment/settings'
import type { EnrichPhoneResult, PhoneLookupInput, ProviderId } from '../enrichment/types'

const { verifyEmail } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 seconds',
  retry: {
    maximumAttempts: 3,
    initialInterval: '1 second',
    backoffCoefficient: 2,
  },
})

export async function verifyEmailWorkflow(
  email: string
): Promise<{ email: string; verified: boolean }> {
  return { email, verified: await verifyEmail(email) }
}

const { markPhoneEnrichmentProgress, savePhoneEnrichmentResult } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 seconds',
  retry: { maximumAttempts: 5 },
})

const providerLookups = {} as Record<ProviderId, (typeof activities)['lookupPhone']>
for (const id of PROVIDER_ORDER) {
  providerLookups[id] = proxyActivities<typeof activities>({
    taskQueue: providerTaskQueue(id),
    startToCloseTimeout: PROVIDER_SETTINGS[id].timeoutMs,
    // Bounds time spent queued behind a rate limit, so one slow provider can't stall the chain.
    scheduleToCloseTimeout: '90 seconds',
    retry: {
      maximumAttempts: 3,
      initialInterval: '1 second',
      backoffCoefficient: 2,
    },
  }).lookupPhone
}

export async function enrichPhoneWorkflow(leadId: number, input: PhoneLookupInput): Promise<EnrichPhoneResult> {
  const { email } = input
  try {
    let anyProviderAnswered = false
    let anyProviderFailed = false

    for (const providerId of PROVIDER_ORDER) {
      await markPhoneEnrichmentProgress(leadId, email, providerId)

      let result
      try {
        result = await providerLookups[providerId](providerId, input)
      } catch (err) {
        if (!(err instanceof ActivityFailure)) throw err
        log.warn('Phone provider failed, trying next provider', { leadId, providerId, error: err.cause?.message })
        anyProviderFailed = true
        continue
      }

      if (result.skipped) {
        log.info('Phone provider skipped, missing required lead data', { leadId, providerId })
        continue
      }

      anyProviderAnswered = true
      if (result.phone) {
        await savePhoneEnrichmentResult(leadId, email, { status: 'FOUND', phoneNumber: result.phone, providerId })
        return { status: 'FOUND', phoneNumber: result.phone, providerId }
      }
    }

    // "No data" is only trustworthy if some provider actually answered.
    if (anyProviderFailed && !anyProviderAnswered) {
      await savePhoneEnrichmentResult(leadId, email, { status: 'FAILED' })
      return { status: 'FAILED' }
    }

    await savePhoneEnrichmentResult(leadId, email, { status: 'NOT_FOUND' })
    return { status: 'NOT_FOUND' }
  } catch (err) {
    await CancellationScope.nonCancellable(() => savePhoneEnrichmentResult(leadId, email, { status: 'FAILED' }))
    throw err
  }
}
