/* eslint-disable no-console */
import { AxiosError } from 'axios'
import { QueryClient, QueryCache } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { handleServerError } from '@/lib/handle-server-error'

/**
 * The single, app-wide QueryClient.
 *
 * It is created once here and shared by both the TanStack Router context
 * (`src/router.tsx`) and the TanStack DB query collections
 * (`src/lib/db/collections/*`). Sharing one instance keeps a migrated
 * collection and any legacy `useQuery` on the same key consistent.
 *
 * Cache policy is intentionally aggressive (see AGENTS: "reduce the cache
 * timing and refresh the apis"): short staleTime + refetch on reconnect and
 * focus so server state is refreshed promptly, especially right after the app
 * comes back online.
 */

// Freshness knobs kept in one place so they are easy to tune.
export const QUERY_STALE_TIME = 5 * 1000 // 5s (was 10s)

function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (import.meta.env.DEV) console.log({ failureCount, error })

          if (failureCount >= 0 && import.meta.env.DEV) return false
          if (failureCount > 3 && import.meta.env.PROD) return false

          return !(
            error instanceof AxiosError &&
            [401, 403].includes(error.response?.status ?? 0)
          )
        },
        // Refresh aggressively: refetch when focus/connection returns so the
        // UI reflects the server quickly after an offline period.
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        staleTime: QUERY_STALE_TIME,
      },
      mutations: {
        onError: (error) => {
          handleServerError(error)

          if (error instanceof AxiosError) {
            if (error.response?.status === 304) {
              toast.error('Content not modified!')
            }
          }
        },
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof AxiosError) {
          if (error.response?.status === 401) {
            toast.error('Session expired!')
            useAuthStore.getState().auth.reset()
          }
          if (error.response?.status === 500) {
            toast.error('Internal Server Error!')
          }
        }
      },
    }),
  })
}

export const queryClient = createAppQueryClient()
