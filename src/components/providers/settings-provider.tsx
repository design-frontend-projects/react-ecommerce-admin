'use client'

import { useEffect, type ReactNode } from 'react'
import { useSettings } from '@/features/settings/data/queries'
import { useSettingsStore } from '@/features/settings/data/store'

interface SettingsProviderProps {
  children: ReactNode
}

/**
 * Global Settings Provider.
 * Fetches all app settings from the database and hydrates the Zustand store.
 * Place this component high in the component tree (e.g., layout) to ensure
 * settings are available throughout the application.
 */
export function SettingsProvider({ children }: SettingsProviderProps) {
  const { data: settings, isSuccess } = useSettings()
  const hydrateFromSettings = useSettingsStore((s) => s.hydrateFromSettings)

  useEffect(() => {
    if (isSuccess && settings) {
      hydrateFromSettings(settings)
    }
  }, [isSuccess, settings, hydrateFromSettings])

  return <>{children}</>
}
