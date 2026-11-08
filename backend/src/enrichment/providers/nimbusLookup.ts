import { PROVIDER_BASE_URL, providerCredentials } from '../config'
import { PhoneProvider } from '../types'
import { toPhoneString } from './parse'

export const nimbusLookup: PhoneProvider = {
  id: 'nimbusLookup',
  buildRequest(input) {
    if (!input.jobTitle?.trim()) return null

    const url = new URL(`${PROVIDER_BASE_URL}/numbusLookup`)
    url.searchParams.set('api', providerCredentials.nimbusLookup)
    return {
      url: url.toString(),
      headers: {},
      body: { email: input.email, jobTitle: input.jobTitle },
    }
  },
  parsePhone(json) {
    // Documented as `number`, but the live API returns `phoneNmbr`.
    const body = json as { phoneNmbr?: unknown; number?: unknown } | null
    return toPhoneString(body?.phoneNmbr ?? body?.number)
  },
}
