import { type QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from '@/components/ui/sonner'
import { NavigationProgress } from '@/components/navigation-progress'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'
import { useSyncUser } from '@/features/auth/hooks/use-sync-user'
import { SupabaseTokenSync } from '@/components/supabase-token-sync'

import { Loader2 } from 'lucide-react'
import { NetworkStatusProvider } from '@/context/network-status-provider'
import { OfflineBadge, OnlineBadge } from '@/components/offline-badge'
import { PwaUpdatePrompt } from '@/components/pwa-update-prompt'

const RootComponent = () => {
  const { isLoading } = useSyncUser()

  if (isLoading) {
    return (
      <div className='flex h-screen w-full items-center justify-center bg-background'>
        <Loader2 className='h-10 w-10 animate-spin text-primary' />
      </div>
    )
  }

  return (
    <NetworkStatusProvider>
      <NavigationProgress />
      <SupabaseTokenSync />
      <PwaUpdatePrompt />
      <Outlet />
      <Toaster duration={5000} />
      <OfflineBadge />
      <OnlineBadge />
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
