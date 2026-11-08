import { ApplicationFailure } from '@temporalio/common'
import { prisma } from '../../db'
import { getProvider } from '../../enrichment/providers'
import { PROVIDER_SETTINGS } from '../../enrichment/settings'
import {
  PhoneEnrichmentStatus,
  PhoneLookupInput,
  PhoneLookupResult,
  ProviderId,
} from '../../enrichment/types'

const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404])

export async function lookupPhone(providerId: ProviderId, input: PhoneLookupInput): Promise<PhoneLookupResult> {
  const provider = getProvider(providerId)
  const request = provider.buildRequest(input)
  if (!request) {
    return { skipped: true }
  }

  // Abort just before Temporal's startToCloseTimeout so a timed-out attempt doesn't leave a request running.
  const response = await fetch(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...request.headers },
    body: JSON.stringify(request.body),
    signal: AbortSignal.timeout(PROVIDER_SETTINGS[providerId].timeoutMs - 500),
  })

  if (response.ok) {
    return { skipped: false, phone: provider.parsePhone(await response.json()) }
  }

  const detail = `${providerId} responded ${response.status}: ${await response.text()}`

  if (NON_RETRYABLE_STATUSES.has(response.status)) {
    throw ApplicationFailure.nonRetryable(detail, 'ProviderRequestRejected')
  }

  if (response.status === 429) {
    const retryAfterSeconds = Number(response.headers.get('retry-after'))
    throw ApplicationFailure.create({
      message: detail,
      type: 'ProviderRateLimited',
      nextRetryDelay: Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : undefined,
    })
  }

  throw new Error(detail)
}

// Writes are scoped to the email the run started with, so a run for an edited email can't overwrite the lead.
export async function markPhoneEnrichmentProgress(leadId: number, email: string, providerId: ProviderId): Promise<void> {
  await prisma.lead.updateMany({
    where: { id: leadId, email },
    data: { phoneEnrichmentStatus: 'IN_PROGRESS', phoneEnrichmentProvider: providerId },
  })
}

export async function savePhoneEnrichmentResult(
  leadId: number,
  email: string,
  result: { status: Exclude<PhoneEnrichmentStatus, 'IN_PROGRESS'>; phoneNumber?: string; providerId?: ProviderId }
): Promise<void> {
  await prisma.lead.updateMany({
    where: { id: leadId, email },
    data: {
      phoneEnrichmentStatus: result.status,
      phoneEnrichmentProvider: result.providerId ?? null,
      ...(result.phoneNumber && { phoneNumber: result.phoneNumber }),
    },
  })
}
