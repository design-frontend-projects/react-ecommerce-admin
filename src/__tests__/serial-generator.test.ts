import { describe, it, expect } from 'vitest'
import {
  deriveProductPrefix,
  deriveProductAcronym,
  formatDateStamp,
  generateSerials,
  generateDefaultSerialsForProduct,
} from '@/features/goods-receipts/utils/serial-generator'

describe('Serial Number Generator Utility', () => {
  describe('deriveProductPrefix', () => {
    it('cleans product name and converts to uppercase hyphenated string', () => {
      const prefix = deriveProductPrefix('Apple iPhone 15 Pro')
      expect(prefix).toBe('APPLE-IPHONE-15')
    })

    it('handles special characters and extra spaces', () => {
      const prefix = deriveProductPrefix('  Sony WH-1000XM5 / Black (Wireless)  ')
      expect(prefix).toContain('SONY')
      expect(prefix).not.toContain('(')
      expect(prefix).not.toContain('/')
    })

    it('falls back to SN if product name is empty or symbols only', () => {
      expect(deriveProductPrefix('')).toBe('SN')
      expect(deriveProductPrefix('   ')).toBe('SN')
      expect(deriveProductPrefix('---***///')).toBe('SN')
    })

    it('supports unicode and Arabic characters gracefully', () => {
      const prefix = deriveProductPrefix('قهوة عربية فاخرة')
      expect(prefix.length).toBeGreaterThan(0)
      expect(prefix).not.toBe('SN')
    })
  })

  describe('deriveProductAcronym', () => {
    it('creates acronym from initial letters and numbers', () => {
      expect(deriveProductAcronym('PlayStation 5 Console')).toBe('PS5C')
      expect(deriveProductAcronym('Apple iPhone 15 Pro Max')).toBe('AIP15PM')
    })

    it('handles single word or camelCase product', () => {
      expect(deriveProductAcronym('AirPods')).toBe('AP')
      expect(deriveProductAcronym('Monitor')).toBe('M')
    })

    it('falls back to SN if empty', () => {
      expect(deriveProductAcronym('')).toBe('SN')
    })
  })

  describe('formatDateStamp', () => {
    it('formats a date as YYYYMMDD', () => {
      const testDate = new Date(2026, 8, 28) // Sep 28, 2026
      expect(formatDateStamp(testDate, 'YYYYMMDD')).toBe('20260928')
    })

    it('formats a date as YYMM', () => {
      const testDate = new Date(2026, 8, 28)
      expect(formatDateStamp(testDate, 'YYMM')).toBe('2609')
    })

    it('returns empty string for none', () => {
      expect(formatDateStamp(new Date(), 'none')).toBe('')
    })
  })

  describe('generateSerials', () => {
    it('generates exact number of unique sequential serials based on product name', () => {
      const serials = generateSerials({
        productName: 'Dell XPS 15',
        count: 5,
        startSequence: 1,
        paddingDigits: 3,
        separator: '-',
      })

      expect(serials).toHaveLength(5)
      expect(serials[0]).toBe('DELL-XPS-15-001')
      expect(serials[1]).toBe('DELL-XPS-15-002')
      expect(serials[2]).toBe('DELL-XPS-15-003')
      expect(serials[3]).toBe('DELL-XPS-15-004')
      expect(serials[4]).toBe('DELL-XPS-15-005')
      expect(new Set(serials).size).toBe(5)
    })

    it('allows custom prefix based on product name', () => {
      const serials = generateSerials({
        productName: 'MacBook Pro M3',
        prefix: 'MBP-M3',
        count: 3,
        paddingDigits: 4,
      })

      expect(serials).toEqual(['MBP-M3-0001', 'MBP-M3-0002', 'MBP-M3-0003'])
    })

    it('includes date stamp when enabled', () => {
      const fixedDate = new Date(2026, 8, 28)
      const serials = generateSerials({
        productName: 'Logitech MX Master 3S',
        prefix: 'MX3S',
        includeDate: true,
        date: fixedDate,
        count: 2,
        paddingDigits: 3,
      })

      expect(serials).toEqual(['MX3S-20260928-001', 'MX3S-20260928-002'])
    })

    it('avoids collision with existing serials by incrementing sequence', () => {
      const existing = ['PROD-001', 'PROD-002']
      const serials = generateSerials({
        productName: 'Product',
        prefix: 'PROD',
        count: 2,
        startSequence: 1,
        paddingDigits: 3,
        existingSerials: existing,
      })

      expect(serials).toEqual(['PROD-003', 'PROD-004'])
    })

    it('returns empty array when count is 0 or negative', () => {
      expect(generateSerials({ productName: 'Item', count: 0 })).toEqual([])
      expect(generateSerials({ productName: 'Item', count: -2 })).toEqual([])
    })
  })

  describe('generateDefaultSerialsForProduct', () => {
    it('produces quick default serials for line items', () => {
      const serials = generateDefaultSerialsForProduct('iPad Air 11', 3)
      expect(serials).toHaveLength(3)
      expect(serials[0]).toMatch(/^IPAD-AIR-11-001/)
      expect(serials[1]).toMatch(/^IPAD-AIR-11-002/)
      expect(serials[2]).toMatch(/^IPAD-AIR-11-003/)
    })
  })
})
