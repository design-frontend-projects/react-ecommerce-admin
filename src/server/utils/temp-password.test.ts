import { describe, expect, it } from 'vitest'
import { generateTempPassword } from './temp-password'

describe('generateTempPassword', () => {
  it('is at least 16 characters even when a smaller length is requested', () => {
    expect(generateTempPassword(8).length).toBeGreaterThanOrEqual(16)
    expect(generateTempPassword().length).toBeGreaterThanOrEqual(16)
  })

  it('honours a larger requested length', () => {
    expect(generateTempPassword(32)).toHaveLength(32)
  })

  it('always includes at least one of each character class', () => {
    for (let i = 0; i < 200; i++) {
      const password = generateTempPassword()
      expect(password).toMatch(/[A-Z]/)
      expect(password).toMatch(/[a-z]/)
      expect(password).toMatch(/[0-9]/)
      expect(password).toMatch(/[^A-Za-z0-9]/)
    }
  })

  it('produces distinct values across calls (CSPRNG)', () => {
    const values = new Set(
      Array.from({ length: 50 }, () => generateTempPassword())
    )
    expect(values.size).toBe(50)
  })
})
