import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { isSubscriptionActiveTemporal } from '@/lib/subscription_utils'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { RequireScreen } from '@/components/rbac/require-screen'
import { supabase } from '@/lib/supabase'
import { useSubscriptionStatus } from '@/features/subscriptions/queries'
import { RoleSyncToast } from '@/features/users/components/role-sync-toast'
import { useRBACSession } from '@/features/users/hooks/use-rbac'

const AuthenticatedRoute = () => {
  const {
    session,
    user,
    selectedBranchId,
    setSelectedBranchId,
    isInitializing,
  } = useAuthStore((state) => state.auth)
  const userId = user?.id
  const navigate = useNavigate()
  useRBACSession()

  const { data: subscription, isLoading: subLoading } = useSubscriptionStatus(
    userId ?? undefined
  )

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_users')
        .select('*')
        .eq('auth_user_id', userId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })

  // We consider auth loaded once initialization is done
  const isLoaded = !isInitializing
  const isSignedIn = !!session

  // Auto-set branch from profile when not already selected
  useEffect(() => {
    if (profile?.branch_id && !selectedBranchId) {
      setSelectedBranchId(profile.branch_id)
    }
  }, [profile, selectedBranchId, setSelectedBranchId])

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate({ to: '/sign-in' })
      return
    }

    // Checking the database user profile
    const onboardingComplete = profile?.onboarding_complete === true
    const isStaffUser = profile?.parent_tenant_id != null // Tenant-created staff

    const currentPath = window.location.pathname

    // Highest-priority gate: admin-provisioned users with a temporary password must set a
    // new one before anything else (including onboarding) renders.
    const forcePasswordChange =
      user?.user_metadata?.force_password_change === true
    if (
      isLoaded &&
      isSignedIn &&
      user &&
      forcePasswordChange &&
      currentPath !== '/force-password-change'
    ) {
      navigate({ to: '/force-password-change' })
      return
    }

    // Tenant-created staff bypass onboarding
    if (
      isLoaded &&
      isSignedIn &&
      user &&
      !profileLoading &&
      !onboardingComplete &&
      !isStaffUser &&
      currentPath !== '/complete-account'
    ) {
      navigate({ to: '/complete-account' })
      return
    }

    if (
      isLoaded &&
      isSignedIn &&
      user &&
      !profileLoading &&
      (onboardingComplete || isStaffUser) &&
      currentPath === '/complete-account'
    ) {
      navigate({ to: '/' })
      return
    }

    if (
      isLoaded &&
      isSignedIn &&
      !subLoading &&
      !profileLoading &&
      (onboardingComplete || isStaffUser)
    ) {
      // Check for super_admin role
      const isSuperAdmin = profile?.default_role === 'super_admin'

      // If not super_admin and no active paid subscription, redirect
      const active = isSubscriptionActiveTemporal(
        subscription?.status ?? '',
        subscription?.start_date,
        subscription?.end_date
      )
      
      const isOwner = !isStaffUser
      
      if (
        !isSuperAdmin &&
        isOwner &&
        !active &&
        currentPath !== '/subscription-required'
      ) {
        // Only redirect if not already on the subscription-required page
        navigate({ to: '/subscription-required' })
      }
    }
  }, [
    isLoaded,
    isSignedIn,
    subLoading,
    profileLoading,
    subscription,
    profile,
    navigate,
    user,
  ])

  if (!isLoaded || subLoading || profileLoading) {
    return (
      <div className='flex h-screen w-full items-center justify-center bg-background'>
        <Loader2 className='h-10 w-10 animate-spin text-primary' />
      </div>
    )
  }

  return (
    <>
      <RoleSyncToast />
      <RequireScreen>
        <AuthenticatedLayout />
      </RequireScreen>
    </>
  )
}

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedRoute,
})
