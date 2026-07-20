import { useAuthQuery } from '@/hooks/use-auth-query'
import { fetchRbacAudit } from '../data/actions'

export const rbacAuditQueryKey = (
  limit: number,
  offset: number,
  targetType?: string
) => ['rbac-audit', limit, offset, targetType ?? 'all'] as const

/**
 * Tenant-scoped RBAC audit trail. The server filters by the caller's tenant
 * (system owners see every tenant), so no client-side scoping is needed.
 */
export function useRbacAudit(params: {
  limit: number
  offset: number
  targetType?: string
  enabled?: boolean
}) {
  const { limit, offset, targetType, enabled = true } = params

  return useAuthQuery({
    queryKey: rbacAuditQueryKey(limit, offset, targetType),
    queryFn: (getToken) =>
      fetchRbacAudit(getToken, { limit, offset, targetType }),
    enabled,
    rbac: { permission: 'access_control.audit.view' },
    staleTime: 30_000,
  })
}
