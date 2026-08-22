import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { authorizedRequest } from '@/lib/api-client'
import { useAuth } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'

const navScreenSchema = z.object({
  code: z.string(),
  name: z.string(),
  route: z.string(),
  icon: z.string().nullable().optional(),
  sortOrder: z.number().optional().default(0),
  roleNames: z.array(z.string()).optional().default([]),
  permissionNames: z.array(z.string()).optional().default([]),
})

const navModuleSchema = z.object({
  code: z.string(),
  name: z.string(),
  sortOrder: z.number().optional().default(0),
  activityTypeCodes: z.array(z.string()).optional().default([]),
  screens: z.array(navScreenSchema).optional().default([]),
})

const navResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z
    .object({
      modules: z.array(navModuleSchema).default([]),
    })
    .optional(),
})

export type NavScreen = z.infer<typeof navScreenSchema>
export type NavModule = z.infer<typeof navModuleSchema>

export const navCatalogQueryKey = ['access-control', 'nav-catalog'] as const

/**
 * Current-user navigation catalog (`GET /api/rbac/me/nav`). Auth-only; the sidebar filters
 * the returned screens against the user's resolved access. Returns an empty list on error so
 * the sidebar can fall back to its static array.
 */
export function useNavCatalog(enabled = true) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const profile = useAuthStore((state) => state.auth.profile)
  const isInitializing = useAuthStore((state) => state.auth.isInitializing)

  const isOnboarded =
    profile?.onboarding_complete === true || profile?.parent_tenant_id != null
  const shouldFetch =
    isLoaded && isSignedIn && !isInitializing && isOnboarded && enabled

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: navCatalogQueryKey,
    queryFn: async (): Promise<NavModule[]> => {
      try {
        const payload = await authorizedRequest(getToken, '/api/rbac/me/nav')
        const parsed = navResponseSchema.safeParse(payload)
        if (parsed.success && parsed.data.data?.modules) {
          return parsed.data.data.modules
        }
        return []
      } catch {
        return []
      }
    },
    enabled: shouldFetch,
    staleTime: 60_000,
    retry: false,
  })
}

