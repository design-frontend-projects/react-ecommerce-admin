import { describe, it, expect } from 'vitest'
import { channelFormSchema } from '@/features/channels/data/schema'

describe('channelFormSchema Validation', () => {
  it('validates valid channel inputs correctly', () => {
    const validData = {
      code: 'ONLINE',
      name: 'Online Web Store',
      name_ar: 'المتجر الإلكتروني',
      description: 'Main e-commerce storefront',
      is_active: true,
    }

    const result = channelFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.code).toBe('ONLINE')
      expect(result.data.name).toBe('Online Web Store')
      expect(result.data.is_active).toBe(true)
    }
  })

  it('accepts optional Arabic name and description as empty strings or null', () => {
    const minimalData = {
      code: 'POS_MAIN',
      name: 'POS Terminal 1',
      name_ar: '',
      description: '',
      is_active: false,
    }

    const result = channelFormSchema.safeParse(minimalData)
    expect(result.success).toBe(true)
  })

  it('rejects codes shorter than 2 characters', () => {
    const invalidData = {
      code: 'A',
      name: 'Store',
      is_active: true,
    }

    const result = channelFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at least 2 characters')
    }
  })

  it('rejects invalid characters in channel code', () => {
    const invalidData = {
      code: 'POS STORE!#',
      name: 'Store',
      is_active: true,
    }

    const result = channelFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('letters, numbers, hyphens')
    }
  })

  it('rejects empty channel name', () => {
    const invalidData = {
      code: 'MOBILE_APP',
      name: '',
      is_active: true,
    }

    const result = channelFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at least 2 characters')
    }
  })
})
