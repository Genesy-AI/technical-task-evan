import { describe, it, expect } from 'vitest'
import { orionConnect } from './orionConnect'
import { astraDialer } from './astraDialer'
import { nimbusLookup } from './nimbusLookup'
import { PhoneLookupInput } from '../types'

const workLead: PhoneLookupInput = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@analytical.io',
  jobTitle: 'CTO',
}

describe('orionConnect', () => {
  it('derives companyWebsite from a work email and authenticates via x-auth-me', () => {
    const request = orionConnect.buildRequest(workLead)
    expect(request?.url).toMatch(/\/orionConnect$/)
    expect(request?.headers).toEqual({ 'x-auth-me': 'mySecretKey123' })
    expect(request?.body).toEqual({ fullName: 'Ada Lovelace', companyWebsite: 'analytical.io' })
  })

  it('is skipped for free-mail addresses', () => {
    expect(orionConnect.buildRequest({ ...workLead, email: 'ada@gmail.com' })).toBeNull()
  })

  it('parses phone or no data', () => {
    expect(orionConnect.parsePhone({ phone: '5799740751' })).toBe('5799740751')
    expect(orionConnect.parsePhone({ phone: null })).toBeNull()
  })
})

describe('astraDialer', () => {
  it('authenticates via apiKey header and sends only the email', () => {
    const request = astraDialer.buildRequest(workLead)
    expect(request?.headers).toEqual({ apiKey: '1234jhgf' })
    expect(request?.body).toEqual({ email: 'ada@analytical.io' })
  })

  it('treats {}, null and empty values as no data', () => {
    expect(astraDialer.parsePhone({ phoneNmbr: '5288471712' })).toBe('5288471712')
    expect(astraDialer.parsePhone({})).toBeNull()
    expect(astraDialer.parsePhone({ phoneNmbr: null })).toBeNull()
    expect(astraDialer.parsePhone({ phoneNmbr: '  ' })).toBeNull()
  })
})

describe('nimbusLookup', () => {
  it('authenticates via the api query parameter and sends email and jobTitle', () => {
    const request = nimbusLookup.buildRequest(workLead)
    expect(new URL(request!.url).searchParams.get('api')).toBe('000099998888')
    expect(request?.body).toEqual({ email: 'ada@analytical.io', jobTitle: 'CTO' })
  })

  it('is skipped when jobTitle is missing', () => {
    expect(nimbusLookup.buildRequest({ ...workLead, jobTitle: null })).toBeNull()
    expect(nimbusLookup.buildRequest({ ...workLead, jobTitle: ' ' })).toBeNull()
  })

  it('parses the numeric phoneNmbr the live API returns, and the documented number field', () => {
    expect(nimbusLookup.parsePhone({ phoneNmbr: 9352307380, countryCode: 'ES' })).toBe('9352307380')
    expect(nimbusLookup.parsePhone({ number: 9352307380, countryCode: 'ES' })).toBe('9352307380')
    expect(nimbusLookup.parsePhone({})).toBeNull()
  })
})
