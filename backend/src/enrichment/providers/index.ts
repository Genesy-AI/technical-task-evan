import { PhoneProvider, ProviderId } from '../types'
import { astraDialer } from './astraDialer'
import { nimbusLookup } from './nimbusLookup'
import { orionConnect } from './orionConnect'

const providers: Record<ProviderId, PhoneProvider> = { orionConnect, astraDialer, nimbusLookup }

export function getProvider(id: ProviderId): PhoneProvider {
  return providers[id]
}
