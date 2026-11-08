import { PROVIDER_BASE_URL, providerCredentials } from '../config'
import { companyWebsiteFromEmail } from '../emailDomain'
import { PhoneProvider } from '../types'
import { toPhoneString } from './parse'

export const orionConnect: PhoneProvider = {
  id: 'orionConnect',
  buildRequest(input) {
    const companyWebsite = companyWebsiteFromEmail(input.email)
    if (!companyWebsite) return null

    return {
      url: `${PROVIDER_BASE_URL}/orionConnect`,
      headers: { 'x-auth-me': providerCredentials.orionConnect },
      body: { fullName: `${input.firstName} ${input.lastName}`.trim(), companyWebsite },
    }
  },
  parsePhone(json) {
    return toPhoneString((json as { phone?: unknown } | null)?.phone)
  },
}
