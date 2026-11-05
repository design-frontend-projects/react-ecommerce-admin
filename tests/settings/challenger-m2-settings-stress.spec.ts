import { describe, it, expect, beforeEach } from 'vitest'
import {
  SettingSchema,
  BrandingSettingsSchema,
  LocalizationSettingsSchema,
  BusinessSettingsSchema,
  AppearanceSettingsSchema,
  NotificationSettingsSchema,
  DisplaySettingsSchema,
  UpsertSettingSchema,
  type AppSettingRecord,
} from '@/features/settings/data/schema'
import { useSettingsStore } from '@/features/settings/data/store'
import { settingsKeys } from '@/features/settings/data/queries'

describe('Adversarial Challenger M2: Settings Schemas & Logic', () => {
  // ─── 1. Currency Code & Localization Stress Testing ───────────────
  describe('LocalizationSettingsSchema Currency & Boundary Tests', () => {
    it('accepts valid 2 to 5 letter currencies including Egyptian "LE"', () => {
      const validCurrencies = ['LE', 'EGP', 'USD', 'EUR', 'SAR', 'USDT', 'USDC', 'KWD', 'ABCDE']
      for (const curr of validCurrencies) {
        const result = LocalizationSettingsSchema.safeParse({
          language: 'en',
          currency: curr,
          date_format: 'YYYY-MM-DD',
        })
        expect(result.success, `Expected currency "${curr}" to be valid`).toBe(true)
        if (result.success) {
          expect(result.data.currency).toBe(curr)
        }
      }
    })

    it('trims leading/trailing whitespace on currency codes and accepts valid trimmed input', () => {
      const result = LocalizationSettingsSchema.safeParse({
        language: 'en',
        currency: '  LE  ',
        date_format: 'YYYY-MM-DD',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.currency).toBe('LE')
      }
    })

    it('rejects currencies shorter than 2 characters or longer than 5 characters', () => {
      const invalidCurrencies = [
        '',
        ' ',
        '   ',
        'X',
        'A',
        'TOOLONG',
        'ABCDEF',
        '123456',
      ]
      for (const curr of invalidCurrencies) {
        const result = LocalizationSettingsSchema.safeParse({
          language: 'en',
          currency: curr,
          date_format: 'YYYY-MM-DD',
        })
        expect(result.success, `Expected currency "${curr}" to be rejected`).toBe(false)
      }
    })

    it('rejects invalid language codes and handles empty date_format', () => {
      // Language min(2) max(10)
      expect(
        LocalizationSettingsSchema.safeParse({
          language: 'a',
          currency: 'USD',
          date_format: 'YYYY-MM-DD',
        }).success
      ).toBe(false)

      expect(
        LocalizationSettingsSchema.safeParse({
          language: 'abcdefghijk', // 11 chars
          currency: 'USD',
          date_format: 'YYYY-MM-DD',
        }).success
      ).toBe(false)

      // Empty date_format
      expect(
        LocalizationSettingsSchema.safeParse({
          language: 'en',
          currency: 'USD',
          date_format: '   ',
        }).success
      ).toBe(false)
    })
  })

  // ─── 2. Business Settings Numeric Bounds & Field Stress ───────────
  describe('BusinessSettingsSchema Numeric Bounds & Edge Cases', () => {
    it('accepts valid tax rates and service fees between 0 and 100', () => {
      const result = BusinessSettingsSchema.safeParse({
        default_tax_rate: 14, // Standard Egyptian VAT
        service_fee: 12,      // Standard Egyptian Restaurant Service Charge
        free_shipping_threshold: 250,
        order_prefix: 'ORD-',
        allow_negative_stock: true,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.default_tax_rate).toBe(14)
        expect(result.data.service_fee).toBe(12)
        expect(result.data.order_prefix).toBe('ORD-')
        expect(result.data.allow_negative_stock).toBe(true)
      }
    })

    it('coerces string numbers for tax rate, fee, and threshold', () => {
      const result = BusinessSettingsSchema.safeParse({
        default_tax_rate: '14.5',
        service_fee: '10',
        free_shipping_threshold: '100',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.default_tax_rate).toBe(14.5)
        expect(result.data.service_fee).toBe(10)
        expect(result.data.free_shipping_threshold).toBe(100)
      }
    })

    it('rejects negative rates and rates exceeding 100%', () => {
      expect(
        BusinessSettingsSchema.safeParse({
          default_tax_rate: -0.5,
        }).success
      ).toBe(false)

      expect(
        BusinessSettingsSchema.safeParse({
          default_tax_rate: 100.1,
        }).success
      ).toBe(false)

      expect(
        BusinessSettingsSchema.safeParse({
          service_fee: -1,
        }).success
      ).toBe(false)

      expect(
        BusinessSettingsSchema.safeParse({
          service_fee: 105,
        }).success
      ).toBe(false)

      expect(
        BusinessSettingsSchema.safeParse({
          free_shipping_threshold: -10,
        }).success
      ).toBe(false)
    })

    it('enforces order_prefix max length of 10 characters', () => {
      expect(
        BusinessSettingsSchema.safeParse({
          order_prefix: '1234567890', // 10 chars
        }).success
      ).toBe(true)

      expect(
        BusinessSettingsSchema.safeParse({
          order_prefix: '12345678901', // 11 chars
        }).success
      ).toBe(false)
    })
  })

  // ─── 3. Display Settings Controls & Enums ──────────────────────────
  describe('DisplaySettingsSchema Restaurant Controls & Enums', () => {
    it('applies standard defaults when input is empty object', () => {
      const result = DisplaySettingsSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.pos_density).toBe('standard')
        expect(result.data.kitchen_ticket_view).toBe('grid')
        expect(result.data.table_grid_layout).toBe('grid-3')
        expect(result.data.default_page_size).toBe(25)
        expect(result.data.landing_page).toBe('/pos')
        expect(result.data.pos_tax_display).toBe(true)
        expect(result.data.pos_kiosk_mode).toBe(false)
        expect(result.data.compact_tables).toBe(false)
        expect(result.data.items).toEqual(['posRegister', 'orders', 'inventory', 'reports'])
      }
    })

    it('validates enum values strictly for pos_density, kitchen_ticket_view, and table_grid_layout', () => {
      // Valid combinations
      expect(
        DisplaySettingsSchema.safeParse({
          pos_density: 'compact',
          kitchen_ticket_view: 'columns',
          table_grid_layout: 'grid-4',
        }).success
      ).toBe(true)

      expect(
        DisplaySettingsSchema.safeParse({
          pos_density: 'comfortable',
          kitchen_ticket_view: 'cards',
          table_grid_layout: 'adaptive',
        }).success
      ).toBe(true)

      // Invalid enums
      expect(
        DisplaySettingsSchema.safeParse({
          pos_density: 'ultra-dense',
        }).success
      ).toBe(false)

      expect(
        DisplaySettingsSchema.safeParse({
          kitchen_ticket_view: 'spreadsheet',
        }).success
      ).toBe(false)

      expect(
        DisplaySettingsSchema.safeParse({
          table_grid_layout: 'grid-5',
        }).success
      ).toBe(false)
    })

    it('enforces positive integer for default_page_size and coerces strings', () => {
      expect(
        DisplaySettingsSchema.safeParse({
          default_page_size: '50',
        }).success
      ).toBe(true)

      expect(
        DisplaySettingsSchema.safeParse({
          default_page_size: 0,
        }).success
      ).toBe(false)

      expect(
        DisplaySettingsSchema.safeParse({
          default_page_size: -25,
        }).success
      ).toBe(false)

      expect(
        DisplaySettingsSchema.safeParse({
          default_page_size: 10.5,
        }).success
      ).toBe(false)
    })
  })

  // ─── 4. Appearance & Notification Schema Constraints ──────────────
  describe('Appearance & Notification Schemas', () => {
    it('AppearanceSettingsSchema rejects invalid theme and density enums', () => {
      expect(
        AppearanceSettingsSchema.safeParse({
          theme: 'solarized',
        }).success
      ).toBe(false)

      expect(
        AppearanceSettingsSchema.safeParse({
          density: 'ultra-tight',
        }).success
      ).toBe(false)

      expect(
        AppearanceSettingsSchema.safeParse({
          theme: 'dark',
          density: 'compact',
        }).success
      ).toBe(true)
    })

    it('NotificationSettingsSchema validates severity and notification_type enums', () => {
      expect(
        NotificationSettingsSchema.safeParse({
          min_severity: 'VERBOSE',
        }).success
      ).toBe(false)

      expect(
        NotificationSettingsSchema.safeParse({
          notification_type: 'custom',
        }).success
      ).toBe(false)

      expect(
        NotificationSettingsSchema.safeParse({
          min_severity: 'CRITICAL',
          notification_type: 'mentions',
        }).success
      ).toBe(true)
    })
  })

  // ─── 5. Zustand Store Hydration Stress & Robustness ───────────────
  describe('Zustand Store Resilience & State Transitions', () => {
    beforeEach(() => {
      useSettingsStore.getState().reset()
    })

    it('handles empty settings array without throwing or breaking default state', () => {
      expect(() => {
        useSettingsStore.getState().hydrateFromSettings([])
      }).not.toThrow()

      const state = useSettingsStore.getState()
      expect(state.isLoaded).toBe(true)
      expect(state.localization.currency).toBe('USD')
      expect(state.display.pos_density).toBe('standard')
    })

    it('gracefully handles malformed JSON string values in app_settings records without throwing', () => {
      const malformedRecords: AppSettingRecord[] = [
        {
          id: '1',
          tenant_id: 't-1',
          key: 'business',
          value: '{ this is invalid json ::::',
          type: 'json',
          group: 'business',
          is_public: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      expect(() => {
        useSettingsStore.getState().hydrateFromSettings(malformedRecords)
      }).not.toThrow()

      // Default business settings remain safe
      expect(useSettingsStore.getState().business.order_prefix).toBe('ORD-')
    })

    it('correctly maps granular dot-notated settings into respective slices', () => {
      const records: AppSettingRecord[] = [
        {
          id: '1',
          tenant_id: 'tenant-egp',
          key: 'localization.currency',
          value: 'LE',
          type: 'string',
          group: 'localization',
          is_public: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          tenant_id: 'tenant-egp',
          key: 'business.allow_negative_stock',
          value: true,
          type: 'boolean',
          group: 'business',
          is_public: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          tenant_id: 'tenant-egp',
          key: 'display.high_contrast_mode',
          value: true,
          type: 'boolean',
          group: 'display',
          is_public: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      useSettingsStore.getState().hydrateFromSettings(records)

      const state = useSettingsStore.getState()
      expect(state.localization.currency).toBe('LE')
      expect(state.business.allow_negative_stock).toBe(true)
      expect(state.display.high_contrast_mode).toBe(true)
    })

    it('reset() method clears all custom state back to initial defaults', () => {
      useSettingsStore.getState().setLocalization({
        currency: 'LE',
        language: 'ar',
        timezone: 'Africa/Cairo',
        date_format: 'DD/MM/YYYY',
        time_format: '24h',
      })

      expect(useSettingsStore.getState().localization.currency).toBe('LE')

      useSettingsStore.getState().reset()

      expect(useSettingsStore.getState().localization.currency).toBe('USD')
      expect(useSettingsStore.getState().isLoaded).toBe(false)
    })
  })

  // ─── 6. Query Keys & Schema Mechanics ─────────────────────────────
  describe('Settings Query Keys & Upsert Schema', () => {
    it('produces expected query key hierarchies for cache invalidation', () => {
      expect(settingsKeys.all).toEqual(['app-settings'])
      expect(settingsKeys.byGroup('display')).toEqual(['app-settings', 'group', 'display'])
      expect(settingsKeys.byKey('display.pos_density')).toEqual(['app-settings', 'key', 'display.pos_density'])
    })

    it('UpsertSettingSchema requires key and allows valid payload', () => {
      expect(
        UpsertSettingSchema.safeParse({
          key: '',
          value: 'test',
        }).success
      ).toBe(false)

      expect(
        UpsertSettingSchema.safeParse({
          key: 'display.pos_density',
          value: 'compact',
          group: 'display',
          is_public: true,
          tenant_id: '123e4567-e89b-12d3-a456-426614174000',
        }).success
      ).toBe(true)
    })
  })
})
