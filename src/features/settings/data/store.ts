import { create } from 'zustand'
import {
  BRANDING_DEFAULTS,
  LOCALIZATION_DEFAULTS,
  BUSINESS_DEFAULTS,
  APPEARANCE_DEFAULTS,
  NOTIFICATION_DEFAULTS,
  DISPLAY_DEFAULTS,
  type BrandingSettings,
  type LocalizationSettings,
  type BusinessSettings,
  type AppearanceSettings,
  type NotificationSettings,
  type DisplaySettings,
  type AppSetting,
} from './schema'

// ─── State Shape ───────────────────────────────────────────────────
interface SettingsState {
  branding: BrandingSettings
  localization: LocalizationSettings
  business: BusinessSettings
  appearance: AppearanceSettings
  notifications: NotificationSettings
  display: DisplaySettings
  isLoaded: boolean

  // Actions
  setBranding: (branding: BrandingSettings) => void
  setLocalization: (localization: LocalizationSettings) => void
  setBusiness: (business: BusinessSettings) => void
  setAppearance: (appearance: AppearanceSettings) => void
  setNotifications: (notifications: NotificationSettings) => void
  setDisplay: (display: DisplaySettings) => void
  hydrateFromSettings: (settings: AppSetting[]) => void
  reset: () => void
}

function parseSettingValue<T>(
  settings: AppSetting[],
  keys: string | string[],
  defaults: T
): T {
  const candidateKeys = Array.isArray(keys) ? keys : [keys]
  let result = { ...defaults }

  // 1. Check for grouped key (e.g. 'display' or 'display.preferences')
  const setting = settings.find((s) => candidateKeys.includes(s.key))
  if (setting) {
    try {
      const value =
        typeof setting.value === 'string'
          ? JSON.parse(setting.value)
          : setting.value

      if (typeof value === 'object' && value !== null) {
        result = { ...result, ...value }
      }
    } catch {
      // ignore
    }
  }

  // 2. Also check for granular dot-notated keys (e.g. 'display.pos_density')
  const primaryPrefix = candidateKeys[0] ? candidateKeys[0].split('.')[0] + '.' : ''
  if (primaryPrefix) {
    for (const s of settings) {
      if (s.key.startsWith(primaryPrefix)) {
        const subKey = s.key.slice(primaryPrefix.length)
        if (subKey in (defaults as Record<string, unknown>)) {
          let parsedVal = s.value
          if (typeof parsedVal === 'string') {
            try {
              parsedVal = JSON.parse(parsedVal)
            } catch {
              // keep as string
            }
          }
          ;(result as Record<string, unknown>)[subKey] = parsedVal
        }
      }
    }
  }

  return result
}

// ─── Zustand Store ─────────────────────────────────────────────────
export const useSettingsStore = create<SettingsState>()((set) => ({
  branding: BRANDING_DEFAULTS,
  localization: LOCALIZATION_DEFAULTS,
  business: BUSINESS_DEFAULTS,
  appearance: APPEARANCE_DEFAULTS,
  notifications: NOTIFICATION_DEFAULTS,
  display: DISPLAY_DEFAULTS,
  isLoaded: false,

  setBranding: (branding) => set({ branding }),
  setLocalization: (localization) => set({ localization }),
  setBusiness: (business) => set({ business }),
  setAppearance: (appearance) => set({ appearance }),
  setNotifications: (notifications) => set({ notifications }),
  setDisplay: (display) => set({ display }),

  hydrateFromSettings: (settings) => {
    set({
      branding: parseSettingValue(
        settings,
        ['branding', 'system.branding'],
        BRANDING_DEFAULTS
      ),
      localization: parseSettingValue(
        settings,
        ['localization', 'system.regional'],
        LOCALIZATION_DEFAULTS
      ),
      business: parseSettingValue(
        settings,
        ['business', 'system.business'],
        BUSINESS_DEFAULTS
      ),
      appearance: parseSettingValue(
        settings,
        ['appearance', 'appearance.theme'],
        APPEARANCE_DEFAULTS
      ),
      notifications: parseSettingValue(
        settings,
        ['notifications', 'notifications.preferences'],
        NOTIFICATION_DEFAULTS
      ),
      display: parseSettingValue(
        settings,
        ['display', 'display.preferences'],
        DISPLAY_DEFAULTS
      ),
      isLoaded: true,
    })
  },

  reset: () =>
    set({
      branding: BRANDING_DEFAULTS,
      localization: LOCALIZATION_DEFAULTS,
      business: BUSINESS_DEFAULTS,
      appearance: APPEARANCE_DEFAULTS,
      notifications: NOTIFICATION_DEFAULTS,
      display: DISPLAY_DEFAULTS,
      isLoaded: false,
    }),
}))
