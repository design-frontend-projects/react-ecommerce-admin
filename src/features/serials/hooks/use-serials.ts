import { useAuthQuery } from '@/hooks/use-auth-query'
import { fetchSerials, fetchSerialTrail } from '../data/actions'
import type { SerialFilters } from '../data/schema'

const serialsKey = (filters: SerialFilters) =>
  ['inventory', 'serials', filters.search ?? '', filters.status ?? ''] as const

const trailKey = (serialId: string) =>
  ['inventory', 'serials', serialId, 'trail'] as const

export function useSerials(filters: SerialFilters = {}) {
  return useAuthQuery({
    queryKey: serialsKey(filters),
    queryFn: (getToken) => fetchSerials(getToken, filters),
    rbac: { permission: 'inventory.view' },
  })
}

export function useSerialTrail(serialId: string | null) {
  return useAuthQuery({
    queryKey: trailKey(serialId ?? ''),
    queryFn: (getToken) => fetchSerialTrail(getToken, serialId as string),
    enabled: Boolean(serialId),
    rbac: { permission: 'inventory.view' },
  })
}
