import { type QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Loader2 } from 'lucide-react'
import { NetworkStatusProvider } from '@/context/network-status-provider'
import { Toaster } from '@/components/ui/sonner'
import { NavigationProgress } from '@/components/navigation-progress'
import { OfflineBadge, OnlineBadge } from '@/components/offline-badge'
import { PwaUpdatePrompt } from '@/components/pwa-update-prompt'
import { useSyncUser } from '@/features/auth/hooks/use-sync-user'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'
import { SettingsProvider } from '@/components/providers/settings-provider'
import { OnboardingModal } from '@/components/auth/OnboardingModal'
import { SubscriptionRenewalModal } from '@/components/auth/SubscriptionRenewalModal'
import { useSubscription } from '@/hooks/useSubscription'
import { useQueryClient } from '@tanstack/react-query'

const RootComponent = () => {
  const { isLoading: isSyncing } = useSyncUser()
  const { data: subscription, isLoading: isSubscriptionLoading } = useSubscription()
  const queryClient = useQueryClient()

  if (isSyncing || isSubscriptionLoading) {
    return (
      <div className='flex h-screen w-full items-center justify-center bg-background'>
        <Loader2 className='h-10 w-10 animate-spin text-primary' />
      </div>
    )
  }

  const handleOnboardingSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['subscription'] })
  }

  const handleManageBilling = () => {
    // In a real app this might redirect to Stripe portal
    window.location.href = '/settings/billing'
  }

  return (
    <NetworkStatusProvider>
      <SettingsProvider>
        <NavigationProgress />
        <PwaUpdatePrompt />
        <Outlet />
        {subscription && subscription.first_use && (
          <OnboardingModal open={true} onSuccess={handleOnboardingSuccess} />
        )}
        {subscription && !subscription.first_use && !subscription.is_active && (
          <SubscriptionRenewalModal open={true} onManageBilling={handleManageBilling} />
        )}
        <Toaster duration={5000} />
        <OfflineBadge />
        <OnlineBadge />
      </SettingsProvider>
      {import.meta.env.MODE === 'development' && (
        <>
          <ReactQueryDevtools buttonPosition='bottom-left' />
          <TanStackRouterDevtools position='bottom-right' />
        </>
      )}
    </NetworkStatusProvider>
  )
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
