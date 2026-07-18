import { useAuthQuery } from '@/hooks/use-auth-query'
import { fetchReconcileReport, fetchStockByLocation } from '../data/actions'

export function useStockByLocation(filters: {
  storeId?: string
  warehouseId?: string
}) {
  return useAuthQuery({
    queryKey: [
      'inventory',
      'stock-by-location',
      filters.storeId ?? '',
      filters.warehouseId ?? '',
    ],
    queryFn: (getToken) => fetchStockByLocation(getToken, filters),
    rbac: { permission: 'inventory.view' },
  })
}

export function useReconcileReport() {
  return useAuthQuery({
    queryKey: ['inventory', 'stock-by-location', 'reconcile'],
    queryFn: (getToken) => fetchReconcileReport(getToken),
    rbac: { permission: 'inventory.view' },
    staleTime: 60_000,
  })
}
