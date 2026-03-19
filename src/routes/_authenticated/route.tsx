import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/clerk-react'
import { Loader2 } from 'lucide-react'
import { isSubscriptionActive } from '@/lib/subscription_utils'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useSubscriptionStatus } from '@/features/subscriptions/queries'

const AuthenticatedRoute = () => {
  const { isLoaded, userId, isSignedIn, sessionClaims } = useAuth()
  const { user: clerkUser } = useUser()
  const navigate = useNavigate()

  const { data: subscription, isLoading: subLoading } = useSubscriptionStatus(
    userId ?? undefined
  )

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate({ to: '/sign-in' })
      return
    }
    if (isLoaded && isSignedIn && !subLoading) {
      // Check for super_admin role in public metadata
      const isSuperAdmin =
        (sessionClaims as { o?: { rol?: string } })?.o?.rol === 'super_admin'

      // If not super_admin and no active paid subscription, redirect
      const active = isSubscriptionActive(
        subscription?.status ?? '',
        subscription?.end_date ? new Date(subscription.end_date) : null
      )

      if (!isSuperAdmin && !active) {
        // Only redirect if not already on the subscription-required page
        // (TanStack Router handles this better with beforeLoad, but we're in the component here)
        navigate({ to: '/subscription-required' })
      }
    }
  }, [isLoaded, isSignedIn, subLoading, subscription, navigate, clerkUser, sessionClaims])

  if (!isLoaded || subLoading) {
    return (
      <div className='flex h-screen w-full items-center justify-center bg-background'>
        <Loader2 className='h-10 w-10 animate-spin text-primary' />
      </div>
    )
  }

  return <AuthenticatedLayout />
}

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedRoute,
})
