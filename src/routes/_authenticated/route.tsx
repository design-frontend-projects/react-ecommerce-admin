import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { isSubscriptionActive } from '@/lib/subscription_utils'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { RequireScreen } from '@/components/rbac/require-screen'
import { profileService } from '@/features/auth/services/profile-service'
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
    queryKey: ['profile', userId],
    queryFn: () => profileService.getProfile(userId!),
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

    // Checking the database profile
    const onboardingComplete = profile?.onboarding_complete === true

    const currentPath = window.location.pathname

    if (
      isLoaded &&
      isSignedIn &&
      user &&
      !profileLoading &&
      !onboardingComplete &&
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
      onboardingComplete &&
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
      onboardingComplete
    ) {
      // Check for super_admin role
      const isSuperAdmin = profile?.system_owner === true

      // If not super_admin and no active paid subscription, redirect
      const active = isSubscriptionActive(
        subscription?.status ?? '',
        subscription?.end_date ? new Date(subscription.end_date) : null
      )
      if (
        !isSuperAdmin &&
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
