import { useMemo } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { normalizeRoleName } from '@/features/users/data/rbac'
import { useRBACStore } from '@/features/users/data/store'

export function useAuth() {
  const { session, user, reset, isInitializing } = useAuthStore(
    (state) => state.auth
  )
  const currentRoleNames = useRBACStore((state) => state.currentRoleNames)
  const currentPermissionNames = useRBACStore(
    (state) => state.currentPermissionNames
  )
  console.log('useAuth session:', session)
  console.log('current role names:', currentRoleNames)
  console.log('current permission names:', currentPermissionNames)

  const has = (params: { role?: string; permission?: string }) => {
    if (!session) return false

    if (params.role) {
      const normalizedCheck = normalizeRoleName(params.role)
      const hasRole = currentRoleNames
        .map(normalizeRoleName)
        .includes(normalizedCheck)
      if (hasRole) return true

      const hasPerm = currentPermissionNames.some(
        (p) => normalizeRoleName(p) === normalizedCheck
      )
      if (hasPerm) return true

      return false
    }

    if (params.permission) {
      const normalizedCheck = normalizeRoleName(params.permission)
      const hasPerm = currentPermissionNames.some(
        (p) => normalizeRoleName(p) === normalizedCheck
      )
      if (hasPerm) return true

      const hasRole = currentRoleNames
        .map(normalizeRoleName)
        .includes(normalizedCheck)
      if (hasRole) return true

      return false
    }

    return false
  }

  return {
    isLoaded: !isInitializing,
    isSignedIn: !!session,
    userId: user?.id,
    sessionId: session?.user?.id,
    sessionClaims: user?.app_metadata,
    has,
    getToken: async () => {
      const { data } = await supabase.auth.getSession()
      return data.session?.access_token ?? null
    },
    signOut: async () => {
      await supabase.auth.signOut()
      reset()
    },
  }
}

export function useUser() {
  const { user, isInitializing } = useAuthStore((state) => state.auth)

  return useMemo(
    () => ({
      isLoaded: !isInitializing,
      isSignedIn: !!user,
      user: user
        ? {
            ...user,
            firstName: user.user_metadata?.firstName || '',
            lastName: user.user_metadata?.lastName || '',
            publicMetadata: user.user_metadata || {},
            unsafeMetadata: user.app_metadata || {},
            emailAddresses: user.email ? [{ emailAddress: user.email }] : [],
            primaryEmailAddress: { emailAddress: user.email },
            fullName:
              `${user.user_metadata?.firstName || ''} ${user.user_metadata?.lastName || ''}`.trim(),
          }
        : null,
    }),
    [user]
  )
}

export function useSupabase() {
  const { signOut } = useAuth()
  return { signOut }
}

export const UserButton = () => null
export const SignInButton = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
)
export const AuthenticateWithRedirectCallback = () => null
