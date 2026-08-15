import type { User, Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'
import { supabase } from '@/lib/supabase'
import {
  expandPermissionNames,
  getFallbackPermissionNamesForRoles,
} from '@/features/users/data/rbac'
import { useRBACStore } from '@/features/users/data/store'

const SELECTED_BRANCH = 'respos_selected_branch'

export interface UserProfile {
  id?: string
  auth_user_id?: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  branch_id?: string | null
  default_role?: string | null
  onboarding_complete?: boolean
  is_active?: boolean | null
}

interface AuthState {
  auth: {
    isInitializing: boolean
    setIsInitializing: (isInitializing: boolean) => void
    user: User | null
    setUser: (user: User | null) => void
    session: Session | null
    setSession: (session: Session | null) => void
    profile: UserProfile | null
    setProfile: (profile: UserProfile | null) => void
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
        set((state) => {
          if (profile) {
            const rbac = useRBACStore.getState()
            const authUserId = profile.auth_user_id
            const serverSynced =
              authUserId &&
              rbac.currentUserId === authUserId &&
              (rbac.lastSyncSource === 'bootstrap' ||
                rbac.lastSyncSource === 'realtime')

            if (!serverSynced && authUserId) {
              const role = profile.default_role
              const roleNames = role ? [role] : []
              let permissionNames: string[] = []

              if (role === 'admin' || role === 'super_admin') {
                permissionNames = expandPermissionNames(['*'])
              } else if (role) {
                permissionNames = getFallbackPermissionNamesForRoles([role])
              }

              rbac.setCurrentAccess(
                {
                  userId: authUserId,
                  roleIds: [],
                  roleNames,
                  permissionNames,
                },
                'mutation'
              )
            }
          } else {
            useRBACStore.getState().reset()
          }

          return { ...state, auth: { ...state.auth, profile } }
        }),
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
