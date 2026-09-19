import { describe, expect, it } from 'vitest'
import { calculateTax, getTaxRateValidity, formatTaxRate } from '../utils/tax-math'
import { taxRateFormSchema } from '../schemas/tax-rate-schema'
import { TAX_PRESETS } from '../data/tax-presets'
import { getTaxRateColumns } from '../components/tax-rates-columns'

describe('Tax Math Engine', () => {
  it('calculates exclusive tax correctly for standard retail items', () => {
    // Net: $100, Rate: 15% exclusive
    const result = calculateTax({
      amount: 100,
      rate: 15,
      isInclusive: false,
    })

    expect(result.netAmount).toBe(100)
    expect(result.taxAmount).toBe(15)
    expect(result.grossAmount).toBe(115)
    expect(result.effectiveRate).toBe(15)
    expect(result.isInclusive).toBe(false)
  })

  it('calculates inclusive tax correctly (backing out tax from gross price)', () => {
    // Gross: $115, Rate: 15% inclusive -> Net: $100, Tax: $15
    const result = calculateTax({
      amount: 115,
      rate: 15,
      isInclusive: true,
    })

    expect(result.grossAmount).toBe(115)
    expect(result.netAmount).toBe(100)
    expect(result.taxAmount).toBe(15)
    expect(result.isInclusive).toBe(true)
  })

  it('handles zero percent and exempt tax rates cleanly', () => {
    const result = calculateTax({
      amount: 250.5,
      rate: 0,
      isInclusive: false,
    })

    expect(result.netAmount).toBe(250.5)
    expect(result.taxAmount).toBe(0)
    expect(result.grossAmount).toBe(250.5)
  })

  it('correctly incorporates quantities and line item discounts', () => {
    // 3 items @ $50 = $150 base. Discount $30 = $120 net base.
    // At 10% exclusive -> Tax = $12, Gross = $132
    const result = calculateTax({
      amount: 50,
      rate: 10,
      isInclusive: false,
      quantity: 3,
      discount: 30,
    })

    expect(result.netAmount).toBe(120)
    expect(result.taxAmount).toBe(12)
    expect(result.grossAmount).toBe(132)
    expect(result.unitTax).toBe(4) // $12 / 3
  })

  it('formats tax rates with mode indicators', () => {
    expect(formatTaxRate(15, false)).toBe('15% (Exc)')
    expect(formatTaxRate(20, true)).toBe('20% (Inc)')
    expect(formatTaxRate(7.25, false)).toBe('7.25% (Exc)')
  })
})

describe('Tax Rate Validity Evaluator', () => {
  const refDate = new Date('2026-06-15T00:00:00Z')

  it('identifies upcoming rates whose effective_from is in the future', () => {
    const status = getTaxRateValidity('2026-07-01', '2026-12-31', refDate)
    expect(status).toBe('upcoming')
  })

  it('identifies expired rates whose effective_to has passed', () => {
    const status = getTaxRateValidity('2026-01-01', '2026-05-31', refDate)
    expect(status).toBe('expired')
  })

  it('identifies currently effective rates within the valid window', () => {
    const status = getTaxRateValidity('2026-01-01', '2026-12-31', refDate)
    expect(status).toBe('current')
  })

  it('handles indefinite rates with no effective_to', () => {
    const status = getTaxRateValidity('2026-01-01', null, refDate)
    expect(status).toBe('current')
  })
})

describe('Tax Rate Form Zod Validation Schema', () => {
  it('accepts a valid tax rate configuration', () => {
    const validData = {
      tax_type: 'Standard VAT',
      rate: 15,
      country_id: '11111111-1111-1111-1111-111111111111',
      description: 'ZATCA compliance tax rate',
      effective_from: '2026-01-01',
      effective_to: '2026-12-31',
      is_active: true,
      is_inclusive: false,
    }

    const result = taxRateFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects empty or whitespace-only tax_type', () => {
    const data = {
      tax_type: '   ',
      rate: 10,
      effective_from: '2026-01-01',
    }

    const result = taxRateFormSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('tax_type'))).toBe(
        true
      )
    }
  })

  it('rejects negative rates and rates exceeding 100%', () => {
    const negative = taxRateFormSchema.safeParse({
      tax_type: 'VAT',
      rate: -5,
      effective_from: '2026-01-01',
    })
    expect(negative.success).toBe(false)

    const overHundred = taxRateFormSchema.safeParse({
      tax_type: 'VAT',
      rate: 105,
      effective_from: '2026-01-01',
    })
    expect(overHundred.success).toBe(false)
  })

  it('rejects effective_to dates that are before effective_from', () => {
    const invalidDateOrder = {
      tax_type: 'Temporary Surcharge',
      rate: 5,
      effective_from: '2026-06-01',
      effective_to: '2026-05-01', // Before from!
    }

    const result = taxRateFormSchema.safeParse(invalidDateOrder)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes('effective_to')
      )
      expect(issue).toBeDefined()
      expect(issue?.message).toContain('Effective to date must be on or after')
    }
  })
})

describe('Tax Presets Integrity', () => {
  it('contains expected presets with valid rates and fields', () => {
    expect(TAX_PRESETS.length).toBeGreaterThanOrEqual(8)

    for (const preset of TAX_PRESETS) {
      expect(preset.id).toBeTruthy()
      expect(preset.label).toBeTruthy()
      expect(preset.tax_type).toBeTruthy()
      expect(preset.rate).toBeGreaterThanOrEqual(0)
      expect(preset.rate).toBeLessThanOrEqual(100)
      expect(typeof preset.is_inclusive).toBe('boolean')
    }
  })

  it('includes key Middle East jurisdictions (Saudi, UAE, Egypt, Qatar)', () => {
    const types = TAX_PRESETS.map((p) => p.tax_type)
    expect(types.some((t) => t.includes('15%'))).toBe(true) // Saudi
    expect(types.some((t) => t.includes('5%'))).toBe(true) // UAE/Oman
    expect(types.some((t) => t.includes('14%'))).toBe(true) // Egypt
    expect(types.some((t) => t.includes('Zero-Rated'))).toBe(true)
  })
})

describe('Tax Rates i18n & Bilingual Support', () => {
  it('generates dynamic columns with translation function', () => {
    const mockT = ((key: string, options?: { defaultValue?: string }) => {
      if (key === 'taxRates.columns.taxType') return 'نوع الضريبة'
      if (key === 'taxRates.columns.rate') return 'النسبة (%)'
      return options?.defaultValue || key
    }) as never

    const cols = getTaxRateColumns(mockT)
    expect(cols.length).toBeGreaterThan(5)

    const taxTypeCol = cols.find((c: { accessorKey?: string }) => c.accessorKey === 'tax_type')
    expect(taxTypeCol).toBeDefined()
  })

  it('verifies that en.json and ar.json have complete taxRates parity', () => {
    const fs = require('fs')
    const en = JSON.parse(fs.readFileSync('src/assets/i18n/en.json', 'utf8'))
    const ar = JSON.parse(fs.readFileSync('src/assets/i18n/ar.json', 'utf8'))

    expect(en.taxRates).toBeDefined()
    expect(ar.taxRates).toBeDefined()

    const checkKeys = (enObj: Record<string, unknown>, arObj: Record<string, unknown>, prefix = '') => {
      for (const k of Object.keys(enObj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k
        expect(arObj[k], `Missing key in ar.json: ${fullKey}`).toBeDefined()
        if (typeof enObj[k] === 'object' && enObj[k] !== null) {
          checkKeys(
            enObj[k] as Record<string, unknown>,
            arObj[k] as Record<string, unknown>,
            fullKey
          )
        } else {
          expect(typeof arObj[k]).toBe('string')
          expect((arObj[k] as string).trim().length).toBeGreaterThan(0)
        }
      }
    }

    checkKeys(en.taxRates, ar.taxRates, 'taxRates')
  })
})

