// Imported by workflow code, so this module must stay free of Node APIs and side effects.
import type { ProviderId } from './types'

export type ProviderSettings = {
  /** Per-attempt startToCloseTimeout, in milliseconds */
  timeoutMs: number
  /** Server-enforced cap on this provider's task queue; undefined means unlimited */
  rateLimitPerSecond?: number
}

export const PROVIDER_ORDER: ProviderId[] = ['orionConnect', 'astraDialer', 'nimbusLookup']

export const PROVIDER_SETTINGS: Record<ProviderId, ProviderSettings> = {
  orionConnect: { timeoutMs: 10_000 },
  astraDialer: { timeoutMs: 5_000 },
  nimbusLookup: { timeoutMs: 5_000 },
}

export const providerTaskQueue = (id: ProviderId) => `phone-${id}`
