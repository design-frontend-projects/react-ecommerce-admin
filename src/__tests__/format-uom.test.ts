import { describe, it, expect } from 'vitest'
import { getLocalizedUomDescription } from '@/features/purchase-orders/utils/format-uom'

describe('getLocalizedUomDescription', () => {
  it('handles null and undefined safely', () => {
    expect(getLocalizedUomDescription(null, 'en')).toBe('—')
    expect(getLocalizedUomDescription(undefined, 'ar')).toBe('—')
    expect(getLocalizedUomDescription({ name: '', code: '' }, 'en')).toBe('—')
  })

  it('extracts English name from bilingual parenthesized string', () => {
    expect(getLocalizedUomDescription({ name: 'Carton (كرتونة)', code: 'ctn' }, 'en')).toBe('Carton')
    expect(getLocalizedUomDescription({ name: 'Piece (قطعة)', code: 'pc' }, 'en')).toBe('Piece')
    expect(getLocalizedUomDescription({ name: 'Box (صندوق / علبة)', code: 'box' }, 'en')).toBe('Box')
  })

  it('extracts Arabic name from bilingual parenthesized string', () => {
    expect(getLocalizedUomDescription({ name: 'Carton (كرتونة)', code: 'ctn' }, 'ar')).toBe('كرتونة')
    expect(getLocalizedUomDescription({ name: 'Piece (قطعة)', code: 'pc' }, 'ar')).toBe('قطعة')
    expect(getLocalizedUomDescription({ name: 'Box (صندوق / علبة)', code: 'box' }, 'ar')).toBe('صندوق / علبة')
  })

  it('translates English UOM name without parentheses to Arabic', () => {
    expect(getLocalizedUomDescription({ name: 'Kilogram', code: 'kg' }, 'ar')).toBe('كيلوجرام')
    expect(getLocalizedUomDescription({ name: 'Gram', code: 'g' }, 'ar')).toBe('جرام')
    expect(getLocalizedUomDescription({ name: 'Liter', code: 'l' }, 'ar')).toBe('لتر')
    expect(getLocalizedUomDescription({ name: 'Meter', code: 'm' }, 'ar')).toBe('متر')
  })

  it('keeps English name when language is en', () => {
    expect(getLocalizedUomDescription({ name: 'Kilogram', code: 'kg' }, 'en')).toBe('Kilogram')
    expect(getLocalizedUomDescription({ name: 'Gram', code: 'g' }, 'en')).toBe('Gram')
  })

  it('resolves description from raw code when name is missing', () => {
    expect(getLocalizedUomDescription({ code: 'kg' }, 'en')).toBe('Kilogram')
    expect(getLocalizedUomDescription({ code: 'kg' }, 'ar')).toBe('كيلوجرام')
    expect(getLocalizedUomDescription({ code: 'ctn' }, 'en')).toBe('Carton')
    expect(getLocalizedUomDescription({ code: 'ctn' }, 'ar')).toBe('كرتونة')
  })

  it('handles custom / unknown UOM names gracefully', () => {
    expect(getLocalizedUomDescription({ name: 'CustomPallet', code: 'cp' }, 'en')).toBe('CustomPallet')
    expect(getLocalizedUomDescription({ name: 'CustomPallet', code: 'cp' }, 'ar')).toBe('CustomPallet')
  })
})
