import { useAuthQuery } from '@/hooks/use-auth-query'
import { fetchMovements } from '../data/actions'
import type { MovementQueryParams, PaginatedMovementsResult } from '../data/schema'

export function useInventoryMovements(filters: MovementQueryParams = {}) {
  return useAuthQuery<PaginatedMovementsResult>({
    queryKey: ['inventory', 'movements', filters],
    queryFn: (getToken) => fetchMovements(getToken, filters),
    rbac: { permission: 'inventory.view' },
  })
}
