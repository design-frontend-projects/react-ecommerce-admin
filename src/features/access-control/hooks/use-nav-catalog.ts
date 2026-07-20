import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { authorizedRequest } from '@/lib/api-client'
import { useAuth } from '@/hooks/use-auth'

const navScreenSchema = z.object({
  code: z.string(),
  name: z.string(),
  route: z.string(),
  icon: z.string().nullable(),
  sortOrder: z.number(),
  roleNames: z.array(z.string()),
  permissionNames: z.array(z.string()),
})

const navModuleSchema = z.object({
  code: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  activityTypeCodes: z.array(z.string()),
  screens: z.array(navScreenSchema),
})

const navResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ modules: z.array(navModuleSchema) }),
})

export type NavScreen = z.infer<typeof navScreenSchema>
export type NavModule = z.infer<typeof navModuleSchema>

export const navCatalogQueryKey = ['access-control', 'nav-catalog'] as const

/**
 * Current-user navigation catalog (`GET /api/rbac/me/nav`). Auth-only; the sidebar filters
 * the returned screens against the user's resolved access. Returns an empty list on error so
 * the sidebar can fall back to its static array.
 */
export function useNavCatalog() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: navCatalogQueryKey,
    queryFn: async (): Promise<NavModule[]> => {
      const payload = await authorizedRequest(getToken, '/api/rbac/me/nav')
      return navResponseSchema.parse(payload).data.modules
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 60_000,
    retry: false,
  })
}
