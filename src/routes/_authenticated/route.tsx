import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { useSubscriptionStatus } from '@/features/subscriptions/queries'
import { isSubscriptionActive } from '@/lib/subscription_utils'

const AuthenticatedRoute = () => {
  const { isLoaded, userId, isSignedIn } = useAuth()
  const { user: clerkUser } = useUser()
  const navigate = useNavigate()
  
  const { data: subscription, isLoading: subLoading } = useSubscriptionStatus(userId ?? undefined)

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate({ to: '/sign-in' })
      return
    }

    if (isLoaded && isSignedIn && !subLoading) {
      // Check for super_admin role in public metadata
      const isSuperAdmin = clerkUser?.publicMetadata?.role === 'super_admin'
      
      // If not super_admin and no active paid subscription, redirect
      const active = isSubscriptionActive(subscription?.status ?? '', subscription?.end_date ? new Date(subscription.end_date) : null)
      
      if (!isSuperAdmin && !active) {
        // Only redirect if not already on the subscription-required page
        // (TanStack Router handles this better with beforeLoad, but we're in the component here)
        navigate({ to: '/subscription-required' })
      }
    }
  }, [isLoaded, isSignedIn, subLoading, subscription, navigate, clerkUser])

  if (!isLoaded || subLoading) {
    return <div>Loading...</div>
  }

  return <AuthenticatedLayout />
}

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedRoute,
})
