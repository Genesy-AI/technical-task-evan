export type PhoneLookupInput = {
  firstName: string
  lastName: string
  email: string
  jobTitle: string | null
}

export type ProviderId = 'orionConnect' | 'astraDialer' | 'nimbusLookup'

export type ProviderRequest = {
  url: string
  headers: Record<string, string>
  body: unknown
}

export interface PhoneProvider {
  id: ProviderId
  /** Returns null when the lead lacks this provider's required inputs, so the provider is skipped */
  buildRequest(input: PhoneLookupInput): ProviderRequest | null
  parsePhone(json: unknown): string | null
}

export type PhoneLookupResult = { skipped: true } | { skipped: false; phone: string | null }

export type PhoneEnrichmentStatus = 'IN_PROGRESS' | 'FOUND' | 'NOT_FOUND' | 'FAILED'

export type EnrichPhoneResult =
  | { status: 'FOUND'; phoneNumber: string; providerId: ProviderId }
  | { status: 'NOT_FOUND' }
