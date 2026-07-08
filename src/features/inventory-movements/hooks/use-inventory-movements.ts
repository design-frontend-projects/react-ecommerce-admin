import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { fetchMovements } from '../data/actions'
import type { MovementFilters } from '../data/schema'

export function useInventoryMovements(filters: MovementFilters = {}) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['inventory', 'movements', filters],
    queryFn: () => fetchMovements(getToken, filters),
    enabled: isLoaded && isSignedIn,
  })
}
