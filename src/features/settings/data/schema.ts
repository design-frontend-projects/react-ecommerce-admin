import { z } from 'zod'

// ─── Base Setting Schema ───────────────────────────────────────────
export const SettingSchema = z.object({
  id: z.string().uuid().optional(),
  key: z.string().trim().min(1, 'Key is required').max(100),
  value: z.any(),
  group: z.string().trim().max(50).nullable().optional(),
  is_public: z.boolean().default(true),
  tenant_id: z.string().uuid().optional(),
  created_by_user_id: z.string().uuid().nullable().optional(),
  updated_by_user_id: z.string().uuid().nullable().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
})

export type AppSetting = z.infer<typeof SettingSchema>

// ─── Branding Group ────────────────────────────────────────────────
export const BrandingSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Site name is required')
    .max(100, 'Site name must not exceed 100 characters'),
  logo_url: z
    .string()
    .trim()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
  favicon_url: z
    .string()
    .trim()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .trim()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .or(z.literal('')),
})

export type BrandingSettings = z.infer<typeof BrandingSettingsSchema>

export const BRANDING_DEFAULTS: BrandingSettings = {
  name: 'My Restaurant',
  logo_url: '',
  favicon_url: '',
  description: '',
}

// ─── Localization Group ────────────────────────────────────────────
// FIX: Changed .length(3) to .min(2).max(5) to support Egyptian Pound 'LE' alongside ISO 4217
export const LocalizationSettingsSchema = z.object({
  currency: z
    .string()
    .trim()
    .min(2, 'Currency code must be at least 2 characters')
    .max(5, 'Currency code must not exceed 5 characters'),
  date_format: z
    .string()
    .trim()
    .min(1, 'Date format is required'),
  language: z
    .string()
    .trim()
    .min(2, 'Language code must be at least 2 characters')
    .max(10),
  timezone: z
    .string()
    .trim()
    .optional()
    .or(z.literal('')),
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
  default_tax_rate: z.coerce
    .number({ invalid_type_error: 'Tax rate must be a number' })
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100%')
    .default(0),
  service_fee: z.coerce
    .number({ invalid_type_error: 'Service fee must be a number' })
    .min(0, 'Service fee cannot be negative')
    .max(100, 'Service fee cannot exceed 100%')
    .default(0),
  free_shipping_threshold: z.coerce
    .number({ invalid_type_error: 'Threshold must be a number' })
    .min(0, 'Free shipping threshold cannot be negative')
    .default(0),
  auto_reorder: z.boolean().default(false),
  allow_negative_stock: z.boolean().default(false),
  order_prefix: z
    .string()
    .trim()
    .max(10, 'Order prefix must not exceed 10 characters')
    .optional()
    .or(z.literal('')),
})

export type BusinessSettings = z.infer<typeof BusinessSettingsSchema>

export const BUSINESS_DEFAULTS: BusinessSettings = {
  default_tax_rate: 0,
  service_fee: 0,
  free_shipping_threshold: 0,
  auto_reorder: false,
  allow_negative_stock: false,
  order_prefix: 'ORD-',
}

// ─── Appearance Group ──────────────────────────────────────────────
export const AppearanceSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  font: z.string().default('manrope'),
  accent_color: z.string().optional().default('zinc'),
  density: z.enum(['comfortable', 'compact']).default('comfortable'),
})

export type AppearanceSettings = z.infer<typeof AppearanceSettingsSchema>

export const APPEARANCE_DEFAULTS: AppearanceSettings = {
  theme: 'system',
  font: 'manrope',
  accent_color: 'zinc',
  density: 'comfortable',
}

// ─── Notifications Group ───────────────────────────────────────────
export const NotificationSettingsSchema = z.object({
  sound_enabled: z.boolean().default(true),
  toasts_enabled: z.boolean().default(true),
  min_severity: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).default('INFO'),
  order_alerts: z.boolean().default(true),
  inventory_alerts: z.boolean().default(true),
  communication_emails: z.boolean().default(false),
  marketing_emails: z.boolean().default(false),
  social_emails: z.boolean().default(true),
  security_emails: z.boolean().default(true),
  notification_type: z.enum(['all', 'mentions', 'none']).default('all'),
  mobile: z.boolean().default(false),
})

export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>

export const NOTIFICATION_DEFAULTS: NotificationSettings = {
  sound_enabled: true,
  toasts_enabled: true,
  min_severity: 'INFO',
  order_alerts: true,
  inventory_alerts: true,
  communication_emails: false,
  marketing_emails: false,
  social_emails: true,
  security_emails: true,
  notification_type: 'all',
  mobile: false,
}

// ─── Display & POS Group ───────────────────────────────────────────
export const DisplaySettingsSchema = z.object({
  pos_density: z.enum(['compact', 'standard', 'comfortable']).default('standard'),
  kitchen_ticket_view: z.enum(['grid', 'columns', 'cards']).default('grid'),
  table_grid_layout: z.enum(['grid-2', 'grid-3', 'grid-4', 'adaptive']).default('grid-3'),
  high_contrast_mode: z.boolean().default(false),
  default_page_size: z.coerce.number().int().positive().default(25),
  landing_page: z.string().default('/pos'),
  pos_tax_display: z.boolean().default(true),
  pos_kiosk_mode: z.boolean().default(false),
  compact_tables: z.boolean().default(false),
  items: z.array(z.string()).default(['posRegister', 'orders', 'inventory', 'reports']),
})

export type DisplaySettings = z.infer<typeof DisplaySettingsSchema>

export const DISPLAY_DEFAULTS: DisplaySettings = {
  pos_density: 'standard',
  kitchen_ticket_view: 'grid',
  table_grid_layout: 'grid-3',
  high_contrast_mode: false,
  default_page_size: 25,
  landing_page: '/pos',
  pos_tax_display: true,
  pos_kiosk_mode: false,
  compact_tables: false,
  items: ['posRegister', 'orders', 'inventory', 'reports'],
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
  appearance: {
    key: 'appearance',
    label: 'Appearance',
    schema: AppearanceSettingsSchema,
    defaults: APPEARANCE_DEFAULTS,
  },
  notifications: {
    key: 'notifications',
    label: 'Notifications',
    schema: NotificationSettingsSchema,
    defaults: NOTIFICATION_DEFAULTS,
  },
  display: {
    key: 'display',
    label: 'Display',
    schema: DisplaySettingsSchema,
    defaults: DISPLAY_DEFAULTS,
  },
} as const

export type SettingGroupKey = keyof typeof SETTING_GROUPS

// ─── Upsert Input ──────────────────────────────────────────────────
export const UpsertSettingSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
  group: z.string().nullable().optional(),
  is_public: z.boolean().optional(),
  tenant_id: z.string().uuid().optional(),
})

export type UpsertSettingInput = z.infer<typeof UpsertSettingSchema>
