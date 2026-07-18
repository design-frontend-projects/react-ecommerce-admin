import { useAuthQuery } from '@/hooks/use-auth-query'
import { fetchMovements } from '../data/actions'
import type { MovementFilters } from '../data/schema'

export function useInventoryMovements(filters: MovementFilters = {}) {
  return useAuthQuery({
    queryKey: ['inventory', 'movements', filters],
    queryFn: (getToken) => fetchMovements(getToken, filters),
    rbac: { permission: 'inventory.view' },
  })
}
