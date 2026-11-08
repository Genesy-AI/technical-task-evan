const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'gmx.com',
  'mail.com',
])

/** Company website inferred from a work email, or null for free-mail or malformed addresses. */
export function companyWebsiteFromEmail(email: string): string | null {
  const domain = email.trim().toLowerCase().split('@')[1]
  if (!domain || !domain.includes('.') || FREE_EMAIL_DOMAINS.has(domain)) {
    return null
  }
  return domain
}
