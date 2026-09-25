import { describe, it, expect } from 'vitest'
import enTranslation from '@/assets/i18n/en.json'
import arTranslation from '@/assets/i18n/ar.json'

describe('Reorder Rules Localization (i18n & RTL) Dictionary Integrity', () => {
  it('defines reorderRules in both en.json and ar.json', () => {
    expect((enTranslation as any).reorderRules).toBeDefined()
    expect((arTranslation as any).reorderRules).toBeDefined()
  })

  it('has matching primary sub-sections in both languages', () => {
    const enSections = Object.keys((enTranslation as any).reorderRules).sort()
    const arSections = Object.keys((arTranslation as any).reorderRules).sort()

    expect(arSections).toEqual(enSections)
  })

  it('has identical keys for metrics in English and Arabic', () => {
    const enMetrics = Object.keys(
      (enTranslation as any).reorderRules.metrics
    ).sort()
    const arMetrics = Object.keys(
      (arTranslation as any).reorderRules.metrics
    ).sort()

    expect(arMetrics).toEqual(enMetrics)
    expect(enMetrics).toContain('totalRules')
    expect(enMetrics).toContain('activeRules')
    expect(enMetrics).toContain('inactiveRules')
    expect(enMetrics).toContain('storesCount')
  })

  it('has identical keys for columns in English and Arabic', () => {
    const enColumns = Object.keys(
      (enTranslation as any).reorderRules.columns
    ).sort()
    const arColumns = Object.keys(
      (arTranslation as any).reorderRules.columns
    ).sort()

    expect(arColumns).toEqual(enColumns)
    expect(enColumns).toContain('reorderPoint')
    expect(enColumns).toContain('safetyStock')
    expect(enColumns).toContain('leadTime')
    expect(enColumns).toContain('active')
    expect(enColumns).toContain('inactive')
  })

  it('has identical keys for variantPicker in English and Arabic', () => {
    const enPicker = Object.keys(
      (enTranslation as any).reorderRules.variantPicker
    ).sort()
    const arPicker = Object.keys(
      (arTranslation as any).reorderRules.variantPicker
    ).sort()

    expect(arPicker).toEqual(enPicker)
    expect(enPicker).toContain('placeholder')
    expect(enPicker).toContain('searchPlaceholder')
    expect(enPicker).toContain('noVariantsFound')
  })

  it('has identical keys for dialog in English and Arabic', () => {
    const enDialog = Object.keys(
      (enTranslation as any).reorderRules.dialog
    ).sort()
    const arDialog = Object.keys(
      (arTranslation as any).reorderRules.dialog
    ).sort()

    expect(arDialog).toEqual(enDialog)
    expect(enDialog).toContain('createTitle')
    expect(enDialog).toContain('editTitle')
    expect(enDialog).toContain('deleteTitle')
    expect(enDialog).toContain('deleteDesc')
  })

  it('contains Arabic script in Arabic translation values', () => {
    const ar = (arTranslation as any).reorderRules
    const arabicRegex = /[\u0600-\u06FF]/

    expect(arabicRegex.test(ar.title)).toBe(true)
    expect(arabicRegex.test(ar.newRule)).toBe(true)
    expect(arabicRegex.test(ar.metrics.totalRules)).toBe(true)
    expect(arabicRegex.test(ar.columns.reorderPoint)).toBe(true)
    expect(arabicRegex.test(ar.variantPicker.placeholder)).toBe(true)
    expect(arabicRegex.test(ar.dialog.deleteTitle)).toBe(true)
  })
})
