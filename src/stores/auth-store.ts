import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'
import type { Profile } from '@/features/auth/services/profile-service'


import type { User, Session } from '@supabase/supabase-js'

const SELECTED_BRANCH = 'respos_selected_branch'

interface AuthState {
  auth: {
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
          return { ...state, auth: { ...state.auth, selectedBranchId: branchId } }
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
