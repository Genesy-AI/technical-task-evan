import { describe, it, expect } from 'vitest'
import { companyWebsiteFromEmail } from './emailDomain'

describe('companyWebsiteFromEmail', () => {
  it('returns the domain of a work email', () => {
    expect(companyWebsiteFromEmail('Jane@Acme.CO.uk ')).toBe('acme.co.uk')
  })

  it('returns null for free-mail and malformed addresses', () => {
    expect(companyWebsiteFromEmail('jane@gmail.com')).toBeNull()
    expect(companyWebsiteFromEmail('jane@yahoo.com')).toBeNull()
    expect(companyWebsiteFromEmail('invalid email')).toBeNull()
    expect(companyWebsiteFromEmail('jane@localhost')).toBeNull()
  })
})
