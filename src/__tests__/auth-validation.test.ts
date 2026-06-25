import { describe, it, expect } from 'vitest'
import { emailSchema, otpSchema } from '@/lib/validation/auth'

describe('Auth Validation Schemas', () => {
  describe('emailSchema', () => {
    it('validates a correct email address', () => {
      const result = emailSchema.safeParse({ email: 'user@example.com' })
      expect(result.success).toBe(true)
    })

    it('rejects an invalid email address', () => {
      const result = emailSchema.safeParse({ email: 'not-an-email' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid email address')
      }
    })

    it('rejects empty email', () => {
      const result = emailSchema.safeParse({ email: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('otpSchema', () => {
    it('validates a correct email and 6-digit OTP', () => {
      const result = otpSchema.safeParse({ email: 'user@example.com', token: '123456' })
      expect(result.success).toBe(true)
    })

    it('rejects an invalid email in OTP form', () => {
      const result = otpSchema.safeParse({ email: 'bad-email', token: '123456' })
      expect(result.success).toBe(false)
    })

    it('rejects an OTP that is too short', () => {
      const result = otpSchema.safeParse({ email: 'user@example.com', token: '12345' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('OTP must be exactly 6 digits')
      }
    })

    it('rejects an OTP that is too long', () => {
      const result = otpSchema.safeParse({ email: 'user@example.com', token: '1234567' })
      expect(result.success).toBe(false)
    })
  })
})
