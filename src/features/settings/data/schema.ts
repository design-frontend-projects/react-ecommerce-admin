import { z } from 'zod'

// ─── Base Setting Schema ───────────────────────────────────────────
export const SettingSchema = z.object({
  id: z.string().uuid().optional(),
  key: z.string().min(1).max(100),
  value: z.any(),
  group: z.string().max(50).nullable().optional(),
  is_public: z.boolean().default(true),
  clerk_user_id: z.string().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
})

export type AppSetting = z.infer<typeof SettingSchema>

// ─── Branding Group ────────────────────────────────────────────────
export const BrandingSettingsSchema = z.object({
  name: z.string().min(1, 'Site name is required').max(100),
  logo_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  favicon_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
})

export type BrandingSettings = z.infer<typeof BrandingSettingsSchema>

export const BRANDING_DEFAULTS: BrandingSettings = {
  name: 'My Restaurant',
  logo_url: '',
  favicon_url: '',
  description: '',
}

// ─── Localization Group ────────────────────────────────────────────
export const LocalizationSettingsSchema = z.object({
  currency: z.string().length(3, 'Must be ISO 4217 code (e.g., USD)'),
  date_format: z.string().min(1, 'Date format is required'),
  language: z.string().min(2).max(5),
  timezone: z.string().optional().or(z.literal('')),
})

export type LocalizationSettings = z.infer<typeof LocalizationSettingsSchema>

export const LOCALIZATION_DEFAULTS: LocalizationSettings = {
  currency: 'USD',
  date_format: 'MM/DD/YYYY',
  language: 'en',
  timezone: '',
}

// ─── Business Rules Group ──────────────────────────────────────────
export const BusinessSettingsSchema = z.object({
  default_tax_rate: z.coerce.number().min(0).max(100).default(0),
  service_fee: z.coerce.number().min(0).max(100).default(0),
  free_shipping_threshold: z.coerce.number().min(0).default(0),
})

export type BusinessSettings = z.infer<typeof BusinessSettingsSchema>

export const BUSINESS_DEFAULTS: BusinessSettings = {
  default_tax_rate: 0,
  service_fee: 0,
  free_shipping_threshold: 0,
}

// ─── Setting Groups Config ─────────────────────────────────────────
export const SETTING_GROUPS = {
  branding: {
    key: 'branding',
    label: 'Branding',
    schema: BrandingSettingsSchema,
    defaults: BRANDING_DEFAULTS,
  },
  localization: {
    key: 'localization',
    label: 'Regional',
    schema: LocalizationSettingsSchema,
    defaults: LOCALIZATION_DEFAULTS,
  },
  business: {
    key: 'business',
    label: 'Business Rules',
    schema: BusinessSettingsSchema,
    defaults: BUSINESS_DEFAULTS,
  },
} as const

export type SettingGroupKey = keyof typeof SETTING_GROUPS

// ─── Upsert Input ──────────────────────────────────────────────────
export const UpsertSettingSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
  group: z.string().nullable().optional(),
  is_public: z.boolean().optional(),
})

export type UpsertSettingInput = z.infer<typeof UpsertSettingSchema>
