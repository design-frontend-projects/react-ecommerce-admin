import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { useRBACStore } from '@/features/users/data/store'
import { normalizeRoleName } from '@/features/users/data/rbac'

export function useAuth() {
  const { session, user, reset } = useAuthStore((state) => state.auth)
  const currentRoleNames = useRBACStore((state) => state.currentRoleNames)
  const currentPermissionNames = useRBACStore((state) => state.currentPermissionNames)

  const has = (params: { role?: string; permission?: string }) => {
    if (!session) return false

    if (params.role) {
      const normalizedCheck = normalizeRoleName(params.role)
      const hasRole = currentRoleNames.map(normalizeRoleName).includes(normalizedCheck)
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

      const hasRole = currentRoleNames.map(normalizeRoleName).includes(normalizedCheck)
      if (hasRole) return true

      return false
    }

    return false
  }

  return {
    isLoaded: true,
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
  const { user } = useAuthStore((state) => state.auth)

  return {
    isLoaded: true,
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
  }
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
