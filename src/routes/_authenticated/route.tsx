import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { profileService } from '@/features/auth/services/profile-service'
import { useAuth, useUser } from '@clerk/clerk-react'
import { Loader2 } from 'lucide-react'
import { isSubscriptionActive } from '@/lib/subscription_utils'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useSubscriptionStatus } from '@/features/subscriptions/queries'
import { RoleSyncToast } from '@/features/users/components/role-sync-toast'
import { useRBACSession } from '@/features/users/hooks/use-rbac'

const AuthenticatedRoute = () => {
  const { isLoaded, userId, isSignedIn, sessionClaims } = useAuth()
  const { user: clerkUser } = useUser()
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

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate({ to: '/sign-in' })
      return
    }

    // Checking the database profile first; fallback to Clerk metadata
    const onboardingComplete =
      profile?.onboarding_complete ??
      (clerkUser?.publicMetadata?.onboardingComplete === true ||
        clerkUser?.unsafeMetadata?.onboardingComplete === true)

    const currentPath = window.location.pathname

    if (
      isLoaded &&
      isSignedIn &&
      clerkUser &&
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
      clerkUser &&
      !profileLoading &&
      onboardingComplete &&
      currentPath === '/complete-account'
    ) {
      navigate({ to: '/' })
      return
    }

    if (isLoaded && isSignedIn && !subLoading && !profileLoading && onboardingComplete) {
      // Check for super_admin role in public metadata
      const isSuperAdmin =
        (sessionClaims as { o?: { rol?: string } })?.o?.rol === 'super_admin'

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
        // (TanStack Router handles this better with beforeLoad, but we're in the component here)
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
    clerkUser,
    sessionClaims,
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
