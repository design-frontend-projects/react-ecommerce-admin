import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { fetchSerials, fetchSerialTrail } from '../data/actions'
import type { SerialFilters } from '../data/schema'

const serialsKey = (filters: SerialFilters) =>
  ['inventory', 'serials', filters.search ?? '', filters.status ?? ''] as const

const trailKey = (serialId: string) =>
  ['inventory', 'serials', serialId, 'trail'] as const

export function useSerials(filters: SerialFilters = {}) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: serialsKey(filters),
    queryFn: () => fetchSerials(getToken, filters),
    enabled: isLoaded && isSignedIn,
  })
}

export function useSerialTrail(serialId: string | null) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: trailKey(serialId ?? ''),
    queryFn: () => fetchSerialTrail(getToken, serialId as string),
    enabled: Boolean(serialId) && isLoaded && isSignedIn,
  })
}
