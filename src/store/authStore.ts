import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setSession: (session: Session | null) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setSession: (session) =>
        set({
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session,
          isLoading: false,
        }),
      signOut: async () => {
        await supabase.auth.signOut()
        set({ session: null, user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-storage',
      // Only persist necessary state; Supabase handles its own token persistence
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated }),
    }
  )
)

// Initialize listener to sync with Supabase Auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  useAuthStore.getState().setSession(session)
})
