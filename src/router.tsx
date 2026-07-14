import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import { setupQueryPersistence } from '@/lib/db/persister'
import { routeTree } from './routeTree.gen'

export function createRouter() {
  // Persist the catalog query cache to IndexedDB (client-side only) so offline
  // reads survive a full reload. Safe to call once per client bootstrap.
  if (typeof window !== 'undefined') {
    setupQueryPersistence(queryClient)
  }

  return createTanStackRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  })
}

export const getRouter = createRouter

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
