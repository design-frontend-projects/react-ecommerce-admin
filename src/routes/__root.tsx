import * as React from 'react'
import {
  type QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  Outlet,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Loader2 } from 'lucide-react'
import { DirectionProvider } from '@/context/direction-provider'
import { FontProvider } from '@/context/font-provider'
import { ThemeProvider } from '@/context/theme-provider'
import { useSubscription } from '@/hooks/useSubscription'
import { Toaster } from '@/components/ui/sonner'

import { SubscriptionRenewalModal } from '@/components/auth/SubscriptionRenewalModal'
import { NavigationProgress } from '@/components/navigation-progress'
import { SettingsProvider } from '@/components/providers/settings-provider'
import { useSyncUser } from '@/features/auth/hooks/use-sync-user'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'
import '../config/i18n'
import '../styles/index.css'

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function InnerRootComponent() {
  const { isLoading: isSyncing } = useSyncUser()
  const { data: subscription, isLoading: isSubscriptionLoading } =
    useSubscription()

  if (isSyncing || isSubscriptionLoading) {
    return (
      <div className='flex h-screen w-full items-center justify-center bg-background'>
        <Loader2 className='h-10 w-10 animate-spin text-primary' />
      </div>
    )
  }

  const handleManageBilling = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/settings/billing'
    }
  }

  return (
    <SettingsProvider>
      <NavigationProgress />
      <Outlet />

      {subscription && !subscription.first_use && !subscription.is_active && (
        <SubscriptionRenewalModal
          open={true}
          onManageBilling={handleManageBilling}
        />
      )}
      <Toaster duration={5000} />
      {import.meta.env.MODE === 'development' && (
        <>
          <ReactQueryDevtools buttonPosition='bottom-left' />
          <TanStackRouterDevtools position='bottom-right' />
        </>
      )}
    </SettingsProvider>
  )
}

const RootComponent = () => {
  const context = Route.useRouteContext()

  return (
    <RootDocument>
      <QueryClientProvider client={context.queryClient}>
        <ThemeProvider>
          <FontProvider>
            <DirectionProvider>
              <InnerRootComponent />
            </DirectionProvider>
          </FontProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </RootDocument>
  )
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
