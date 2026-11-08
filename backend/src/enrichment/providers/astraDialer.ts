import { PROVIDER_BASE_URL, providerCredentials } from '../config'
import { PhoneProvider } from '../types'
import { toPhoneString } from './parse'

export const astraDialer: PhoneProvider = {
  id: 'astraDialer',
  buildRequest(input) {
    return {
      url: `${PROVIDER_BASE_URL}/astraDialer`,
      headers: { apiKey: providerCredentials.astraDialer },
      body: { email: input.email },
    }
  },
  parsePhone(json) {
    return toPhoneString((json as { phoneNmbr?: unknown } | null)?.phoneNmbr)
  },
}
