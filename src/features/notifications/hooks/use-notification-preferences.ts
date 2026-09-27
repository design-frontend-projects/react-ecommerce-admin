import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { playNotificationSound } from '../lib/notification-sound'
import type { NotificationSeverity } from '../data/schema'

export interface NotificationPreferencesState {
  soundEnabled: boolean
  toastsEnabled: boolean
  minSeverity: NotificationSeverity
  setSoundEnabled: (enabled: boolean) => void
  setToastsEnabled: (enabled: boolean) => void
  setMinSeverity: (severity: NotificationSeverity) => void
  playTestSound: (severity?: string) => void
}

export const useNotificationPreferences = create<NotificationPreferencesState>()(
  persist(
    (set, get) => ({
      soundEnabled: true,
      toastsEnabled: true,
      minSeverity: 'INFO',

      setSoundEnabled: (soundEnabled: boolean) => set({ soundEnabled }),
      setToastsEnabled: (toastsEnabled: boolean) => set({ toastsEnabled }),
      setMinSeverity: (minSeverity: NotificationSeverity) => set({ minSeverity }),

      playTestSound: (severity?: string) => {
        const targetSev = severity || get().minSeverity
        playNotificationSound(targetSev)
      },
    }),
    {
      name: 'notification-preferences-storage',
    }
  )
)
