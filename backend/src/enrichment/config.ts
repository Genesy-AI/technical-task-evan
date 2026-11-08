export const PROVIDER_BASE_URL = process.env.PHONE_PROVIDER_BASE_URL ?? 'https://api.enginy.ai/api/tmp'

export const providerCredentials = {
  orionConnect: process.env.ORION_CONNECT_API_KEY ?? 'mySecretKey123',
  astraDialer: process.env.ASTRA_DIALER_API_KEY ?? '1234jhgf',
  nimbusLookup: process.env.NIMBUS_LOOKUP_API_KEY ?? '000099998888',
}
