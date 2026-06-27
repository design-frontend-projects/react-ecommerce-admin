import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const { session, user, reset } = useAuthStore((state) => state.auth)

  return {
    isLoaded: true,
    isSignedIn: !!session,
    userId: user?.id,
    sessionId: session?.user?.id,
    sessionClaims: user?.app_metadata,
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
