import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth'
import { Loader2 } from 'lucide-react'
import { isSubscriptionActive } from '@/lib/subscription_utils'
import { useAuthStore } from '@/stores/auth-store'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useSubscriptionStatus } from '@/features/subscriptions/queries'
import { RoleSyncToast } from '@/features/users/components/role-sync-toast'
import { useRBACSession } from '@/features/users/hooks/use-rbac'

const AuthenticatedRoute = () => {
  const { isLoaded, userId, isSignedIn, has } = useAuth()
  const profile = useAuthStore((state) => state.auth.profile)
  const navigate = useNavigate()
  useRBACSession()

  const { data: subscription, isLoading: subLoading } = useSubscriptionStatus(
    userId ?? undefined
  )

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate({ to: '/sign-in' })
      return
    }

    const onboardingComplete = profile?.onboarding_complete === true
    const currentPath = window.location.pathname

    if (
      isLoaded &&
      isSignedIn &&
      userId &&
      !onboardingComplete &&
      currentPath !== '/complete-account'
    ) {
      navigate({ to: '/complete-account' })
      return
    }

    if (
      isLoaded &&
      isSignedIn &&
      userId &&
      onboardingComplete &&
      currentPath === '/complete-account'
    ) {
      navigate({ to: '/' })
      return
    }

    if (isLoaded && isSignedIn && !subLoading) {
      const isSuperAdmin = has?.({ role: 'super_admin' }) ?? false

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
    subscription,
    navigate,
    profile?.onboarding_complete,
    userId,
    has,
  ])

  if (!isLoaded || subLoading) {
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
