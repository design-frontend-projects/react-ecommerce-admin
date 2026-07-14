import type { User, Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/features/auth/services/profile-service'

const SELECTED_BRANCH = 'respos_selected_branch'

interface AuthState {
  auth: {
    isInitializing: boolean
    setIsInitializing: (isInitializing: boolean) => void
    user: User | null
    setUser: (user: User | null) => void
    session: Session | null
    setSession: (session: Session | null) => void
    profile: Profile | null
    setProfile: (profile: Profile | null) => void
    selectedBranchId: string
    setSelectedBranchId: (branchId: string) => void
    reset: () => void
  }
}

export const useAuthStore = create<AuthState>()((set) => {
  const selectedBranchState = getCookie(SELECTED_BRANCH)
  const initSelectedBranchId = selectedBranchState
    ? JSON.parse(selectedBranchState)
    : ''
  return {
    auth: {
      isInitializing: true,
      setIsInitializing: (isInitializing) =>
        set((state) => ({ ...state, auth: { ...state.auth, isInitializing } })),
      user: null,
      setUser: (user) =>
        set((state) => ({ ...state, auth: { ...state.auth, user } })),
      session: null,
      setSession: (session) =>
        set((state) => ({ ...state, auth: { ...state.auth, session } })),
      profile: null,
      setProfile: (profile) =>
        set((state) => ({ ...state, auth: { ...state.auth, profile } })),
      selectedBranchId: initSelectedBranchId,
      setSelectedBranchId: (branchId) =>
        set((state) => {
          setCookie(SELECTED_BRANCH, JSON.stringify(branchId))
          return {
            ...state,
            auth: { ...state.auth, selectedBranchId: branchId },
          }
        }),
      reset: () =>
        set((state) => {
          removeCookie(SELECTED_BRANCH)
          return {
            ...state,
            auth: {
              ...state.auth,
              user: null,
              session: null,
              profile: null,
              selectedBranchId: '',
            },
          }
        }),
    },
  }
})

// Initialize listener to sync with Supabase Auth state changes
supabase.auth.onAuthStateChange((_event, session) => {
  const store = useAuthStore.getState()
  store.auth.setSession(session)
  store.auth.setUser(session?.user ?? null)
  store.auth.setIsInitializing(false)
})

// Fetch initial session
supabase.auth.getSession().then(({ data: { session } }) => {
  const store = useAuthStore.getState()
  if (session) {
    store.auth.setSession(session)
    store.auth.setUser(session.user)
  }
  store.auth.setIsInitializing(false)
})
