import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { fetchReconcileReport, fetchStockByLocation } from '../data/actions'

export function useStockByLocation(filters: {
  storeId?: string
  warehouseId?: string
}) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [
      'inventory',
      'stock-by-location',
      filters.storeId ?? '',
      filters.warehouseId ?? '',
    ],
    queryFn: () => fetchStockByLocation(getToken, filters),
    enabled: isLoaded && isSignedIn,
  })
}

export function useReconcileReport() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['inventory', 'stock-by-location', 'reconcile'],
    queryFn: () => fetchReconcileReport(getToken),
    enabled: isLoaded && isSignedIn,
    staleTime: 60_000,
  })
}
