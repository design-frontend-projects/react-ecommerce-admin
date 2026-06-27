import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { profileService } from '@/features/auth/services/profile-service'
import { Loader2 } from 'lucide-react'
import { isSubscriptionActive } from '@/lib/subscription_utils'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useSubscriptionStatus } from '@/features/subscriptions/queries'
import { RoleSyncToast } from '@/features/users/components/role-sync-toast'
import { useRBACSession } from '@/features/users/hooks/use-rbac'
import { useAuthStore } from '@/stores/auth-store'

const AuthenticatedRoute = () => {
  const { session, user } = useAuthStore((state) => state.auth)
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

  // We consider auth loaded as soon as we render this route (if wrapped properly or just handle nulls)
  // Actually, we should check if session is still loading, but Zustand has it synchronously if stored.
  const isLoaded = true
  const isSignedIn = !!session

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

    if (isLoaded && isSignedIn && !subLoading && !profileLoading && onboardingComplete) {
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
      <AuthenticatedLayout />
    </>
  )
}

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedRoute,
})

