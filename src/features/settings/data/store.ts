import { create } from 'zustand'
import type {
  BrandingSettings,
  LocalizationSettings,
  BusinessSettings,
  AppSetting,
} from './schema'
import {
  BRANDING_DEFAULTS,
  LOCALIZATION_DEFAULTS,
  BUSINESS_DEFAULTS,
} from './schema'

// ─── State Shape ───────────────────────────────────────────────────
interface SettingsState {
  branding: BrandingSettings
  localization: LocalizationSettings
  business: BusinessSettings
  isLoaded: boolean

  // Actions
  setBranding: (branding: BrandingSettings) => void
  setLocalization: (localization: LocalizationSettings) => void
  setBusiness: (business: BusinessSettings) => void
  hydrateFromSettings: (settings: AppSetting[]) => void
  reset: () => void
}

// ─── Helper: Safely parse a setting value with fallback ────────────
function parseSettingValue<T>(
  settings: AppSetting[],
  key: string,
  defaults: T
): T {
  const setting = settings.find((s) => s.key === key)
  if (!setting) return defaults

  try {
    const value = typeof setting.value === 'string'
      ? JSON.parse(setting.value)
      : setting.value

    return { ...defaults, ...value } as T
  } catch {
    console.warn(`[Settings] Failed to parse setting "${key}", using defaults`)
    return defaults
  }
}

// ─── Zustand Store ─────────────────────────────────────────────────
export const useSettingsStore = create<SettingsState>()((set) => ({
  branding: BRANDING_DEFAULTS,
  localization: LOCALIZATION_DEFAULTS,
  business: BUSINESS_DEFAULTS,
  isLoaded: false,

  setBranding: (branding) => set({ branding }),
  setLocalization: (localization) => set({ localization }),
  setBusiness: (business) => set({ business }),

  hydrateFromSettings: (settings) => {
    set({
      branding: parseSettingValue(settings, 'branding', BRANDING_DEFAULTS),
      localization: parseSettingValue(settings, 'localization', LOCALIZATION_DEFAULTS),
      business: parseSettingValue(settings, 'business', BUSINESS_DEFAULTS),
      isLoaded: true,
    })
  },

  reset: () =>
    set({
      branding: BRANDING_DEFAULTS,
      localization: LOCALIZATION_DEFAULTS,
      business: BUSINESS_DEFAULTS,
      isLoaded: false,
    }),
}))
