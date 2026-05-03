import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRBACStore } from '@/features/users/data/store'

type RoleCheck = { role?: string; permission?: string }

export interface AppAuthUser extends User {
  firstName: string | null
  lastName: string | null
  fullName: string | null
  imageUrl: string
  publicMetadata: Record<string, unknown>
  primaryEmailAddress: { emailAddress: string } | null
  primaryPhoneNumber: { phoneNumber: string } | null
  emailAddresses: Array<{ emailAddress: string }>
}

interface SupabaseAuthContextValue {
  user: AppAuthUser | null
  session: Session | null
  isLoaded: boolean
  isSignedIn: boolean
  getToken: () => Promise<string | null>
  signOut: () => Promise<void>
  has: (check: RoleCheck) => boolean
  refreshUser: () => Promise<void>
}

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null)

function getMetadataValue(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return null
}

function toAppAuthUser(user: User | null): AppAuthUser | null {
  if (!user) return null

  const metadata = user.user_metadata ?? {}
  const appMetadata = user.app_metadata ?? {}
  const firstName = getMetadataValue(metadata, ['first_name', 'firstName', 'given_name'])
  const lastName = getMetadataValue(metadata, ['last_name', 'lastName', 'family_name'])
  const fullName =
    getMetadataValue(metadata, ['full_name', 'fullName', 'name']) ??
    ([firstName, lastName].filter(Boolean).join(' ') || null)
  const avatarUrl = getMetadataValue(metadata, ['avatar_url', 'avatarUrl', 'picture']) ?? ''
  const publicMetadata = { ...appMetadata, ...metadata }
  const email = user.email ?? getMetadataValue(metadata, ['email'])
  const phone = user.phone ?? getMetadataValue(metadata, ['phone', 'phone_number'])

  return Object.assign(user, {
    firstName,
    lastName,
    fullName,
    imageUrl: avatarUrl,
    publicMetadata,
    primaryEmailAddress: email ? { emailAddress: email } : null,
    primaryPhoneNumber: phone ? { phoneNumber: phone } : null,
    emailAddresses: email ? [{ emailAddress: email }] : [],
  })
}

export function SupabaseAuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<AppAuthUser | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const roleNames = useRBACStore((state) => state.currentRoleNames)
  const permissionNames = useRBACStore((state) => state.currentPermissionNames)

  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    setUser(toAppAuthUser(data.user))
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setUser(toAppAuthUser(data.session?.user ?? null))
      setIsLoaded(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(toAppAuthUser(nextSession?.user ?? null))
      setIsLoaded(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const has = useCallback(
    (check: RoleCheck) => {
      if (check.permission) {
        return permissionNames.includes(check.permission)
      }

      if (!check.role) return false
      const expected = check.role.trim().toLowerCase()
      const metadataRoles = [
        user?.publicMetadata?.role,
        user?.publicMetadata?.roles,
      ].flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []))

      return [...roleNames, ...metadataRoles]
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim().toLowerCase())
        .includes(expected)
    },
    [permissionNames, roleNames, user?.publicMetadata?.role, user?.publicMetadata?.roles]
  )

  const value = useMemo<SupabaseAuthContextValue>(
    () => ({
      user,
      session,
      isLoaded,
      isSignedIn: Boolean(session?.user),
      getToken,
      signOut,
      has,
      refreshUser,
    }),
    [getToken, has, isLoaded, refreshUser, session, signOut, user]
  )

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  )
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext)
  if (!context) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider')
  }
  return context
}

export function useAuth() {
  const auth = useSupabaseAuth()
  return {
    isLoaded: auth.isLoaded,
    isSignedIn: auth.isSignedIn,
    userId: auth.user?.id ?? null,
    sessionClaims: auth.user?.publicMetadata ?? {},
    getToken: auth.getToken,
    has: auth.has,
  }
}

export function useUser() {
  const auth = useSupabaseAuth()
  return {
    isLoaded: auth.isLoaded,
    isSignedIn: auth.isSignedIn,
    user: auth.user,
  }
}

export function useSession() {
  const auth = useSupabaseAuth()
  return {
    isLoaded: auth.isLoaded,
    isSignedIn: auth.isSignedIn,
    session: auth.session,
  }
}
