import { describe, it, expect } from 'vitest'
import { onboardingSchema } from '@/lib/validation/onboarding'

describe('Onboarding Validation Schema', () => {
  it('validates a correct onboarding payload', () => {
    const result = onboardingSchema.safeParse({
      company_name: 'Acme Restaurant Group',
      billing_contact: 'billing@acme.com',
      timezone: 'America/New_York',
      industry: 'Food & Beverage',
    })
    expect(result.success).toBe(true)
  })

  it('rejects short company names', () => {
    const result = onboardingSchema.safeParse({
      company_name: 'A',
      billing_contact: 'billing@acme.com',
      timezone: 'America/New_York',
      industry: 'Food & Beverage',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Company name must be at least 2 characters')
    }
  })

  it('rejects invalid billing contact email', () => {
    const result = onboardingSchema.safeParse({
      company_name: 'Acme Restaurant Group',
      billing_contact: 'not-an-email',
      timezone: 'America/New_York',
      industry: 'Food & Beverage',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing fields', () => {
    const result = onboardingSchema.safeParse({
      company_name: 'Acme',
    })
    expect(result.success).toBe(false)
  })
})
