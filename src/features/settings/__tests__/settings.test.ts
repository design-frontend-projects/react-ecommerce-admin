import { describe, it, expect, beforeEach } from 'vitest'
import {
  LocalizationSettingsSchema,
  BusinessSettingsSchema,
  AppearanceSettingsSchema,
  NotificationSettingsSchema,
  DisplaySettingsSchema,
  type AppSettingRecord,
} from '../data/schema'
import { useSettingsStore } from '../data/store'

describe('Settings Schemas', () => {
  describe('LocalizationSettingsSchema', () => {
    it('accepts Egyptian Pound "LE" (2-letter currency) and 3-letter codes', () => {
      const validLE = LocalizationSettingsSchema.safeParse({
        language: 'ar',
        timezone: 'Africa/Cairo',
        currency: 'LE',
        date_format: 'DD/MM/YYYY',
        time_format: '24h',
      })
      expect(validLE.success).toBe(true)

      const validEGP = LocalizationSettingsSchema.safeParse({
        language: 'en',
        timezone: 'Africa/Cairo',
        currency: 'EGP',
        date_format: 'YYYY-MM-DD',
        time_format: '12h',
      })
      expect(validEGP.success).toBe(true)

      const invalidShort = LocalizationSettingsSchema.safeParse({
        language: 'en',
        timezone: 'UTC',
        currency: 'X',
        date_format: 'YYYY-MM-DD',
        time_format: '24h',
      })
      expect(invalidShort.success).toBe(false)
    })
  })

  describe('BusinessSettingsSchema', () => {
    it('validates order_prefix and allow_negative_stock', () => {
      const validBusiness = BusinessSettingsSchema.safeParse({
        company_name: 'Cairo Gourmet Bistro',
        tax_id: '123-456-789',
        currency: 'LE',
        order_prefix: 'ORD-',
        allow_negative_stock: true,
      })
      expect(validBusiness.success).toBe(true)
      if (validBusiness.success) {
        expect(validBusiness.data.order_prefix).toBe('ORD-')
        expect(validBusiness.data.allow_negative_stock).toBe(true)
      }
    })
  })

  describe('AppearanceSettingsSchema', () => {
    it('validates theme, density, and font options', () => {
      const validAppearance = AppearanceSettingsSchema.safeParse({
        theme: 'dark',
        density: 'compact',
        font: 'cairo',
        accent_color: 'amber',
      })
      expect(validAppearance.success).toBe(true)
    })
  })

  describe('NotificationSettingsSchema', () => {
    it('validates notification preferences and options', () => {
      const validNotifications = NotificationSettingsSchema.safeParse({
        sound_enabled: true,
        toasts_enabled: true,
        min_severity: 'WARNING',
        order_alerts: true,
        inventory_alerts: true,
        communication_emails: false,
        marketing_emails: false,
        social_emails: true,
        security_emails: true,
        notification_type: 'mentions',
        mobile: true,
      })
      expect(validNotifications.success).toBe(true)
    })
  })

  describe('DisplaySettingsSchema', () => {
    it('validates restaurant ERP display controls', () => {
      const validDisplay = DisplaySettingsSchema.safeParse({
        pos_density: 'compact',
        kitchen_ticket_view: 'columns',
        table_grid_layout: 'grid-4',
        high_contrast_mode: true,
        default_page_size: 50,
        landing_page: '/pos',
        pos_tax_display: true,
        pos_kiosk_mode: true,
        compact_tables: true,
        items: ['posRegister', 'orders', 'kitchen'],
      })
      expect(validDisplay.success).toBe(true)
      if (validDisplay.success) {
        expect(validDisplay.data.pos_density).toBe('compact')
        expect(validDisplay.data.landing_page).toBe('/pos')
        expect(validDisplay.data.pos_kiosk_mode).toBe(true)
        expect(validDisplay.data.kitchen_ticket_view).toBe('columns')
      }
    })
  })
})

describe('Settings Zustand Store', () => {
  beforeEach(() => {
    useSettingsStore.getState().reset()
  })

  it('hydrates settings from flat tenant settings array with (tenant_id, key)', () => {
    const rawRecords: AppSettingRecord[] = [
      {
        id: '1',
        tenant_id: 'tenant-100',
        key: 'display.pos_density',
        value: 'compact',
        type: 'string',
        group: 'display',
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        tenant_id: 'tenant-100',
        key: 'appearance.theme',
        value: 'dark',
        type: 'string',
        group: 'appearance',
        is_public: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '3',
        tenant_id: 'tenant-100',
        key: 'notifications.sound_enabled',
        value: false,
        type: 'boolean',
        group: 'notifications',
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '4',
        tenant_id: 'tenant-100',
        key: 'business',
        value: JSON.stringify({
          company_name: 'Alexandria Sea Bistro',
          order_prefix: 'ALX-',
          allow_negative_stock: true,
        }),
        type: 'json',
        group: 'business',
        is_public: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    useSettingsStore.getState().hydrateFromSettings(rawRecords)

    const state = useSettingsStore.getState()
    expect(state.display.pos_density).toBe('compact')
    expect(state.appearance.theme).toBe('dark')
    expect(state.notifications.sound_enabled).toBe(false)
    expect(state.business.order_prefix).toBe('ALX-')
    expect(state.business.allow_negative_stock).toBe(true)
    expect(state.isLoaded).toBe(true)
  })

  it('updates display slice and individual slices properly', () => {
    useSettingsStore.getState().setDisplay({
      pos_density: 'comfortable',
      kitchen_ticket_view: 'cards',
      table_grid_layout: 'adaptive',
      high_contrast_mode: true,
      default_page_size: 100,
      landing_page: '/kitchen',
      pos_tax_display: false,
      pos_kiosk_mode: true,
      compact_tables: true,
      items: ['posRegister', 'orders'],
    })

    const display = useSettingsStore.getState().display
    expect(display.landing_page).toBe('/kitchen')
    expect(display.high_contrast_mode).toBe(true)
    expect(display.kitchen_ticket_view).toBe('cards')
    expect(display.pos_density).toBe('comfortable')

    useSettingsStore.getState().setLocalization({
      language: 'ar',
      timezone: 'Africa/Cairo',
      currency: 'LE',
      date_format: 'DD/MM/YYYY',
      time_format: '12h',
    })
    expect(useSettingsStore.getState().localization.currency).toBe('LE')
    expect(useSettingsStore.getState().localization.language).toBe('ar')
  })
})
