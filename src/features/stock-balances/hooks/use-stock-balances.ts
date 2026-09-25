import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import i18n from '@/config/i18n'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuth } from '@/hooks/use-auth'
import {
  fetchStockBalances,
  postStockAdjustment,
  fetchStockBalanceMovements,
  fetchVariantFacilityOnHand,
} from '../data/actions'
import type {
  StockBalanceFilters,
  StockBalancesResponse,
  StockMovementRow,
  VariantFacilityOnHandResult,
} from '../data/schema'
import type { AdjustmentFormData } from '../data/adjustment-schema'

export const stockBalancesQueryKey = ['stock-balances'] as const

/**
 * Hook to fetch stock balances with server-side pagination, metrics, and pushdown filters.
 */
export function useStockBalances(filters: StockBalanceFilters = {}) {
  const query = useAuthQuery<StockBalancesResponse>({
    queryKey: [...stockBalancesQueryKey, filters],
    queryFn: (getToken) => fetchStockBalances(getToken, filters),
    rbac: { permission: 'inventory.stock.view' },
    staleTime: 30_000,
  })

  const pageSize = query.data?.pageSize ?? filters.pageSize ?? 20
  const total = query.data?.total ?? 0
  const page = query.data?.page ?? filters.page ?? 1
  const totalPages = query.data?.totalPages ?? Math.max(1, Math.ceil(total / pageSize))

  return {
    ...query,
    stockBalances: query.data?.items ?? [],
    metrics: query.data?.metrics,
    total,
    page,
    pageSize,
    totalPages,
  }
}

/**
 * Targeted hook to fetch live on-hand quantity and cost for a single variant and facility.
 */
export function useVariantFacilityOnHand(
  variantId?: string | null,
  facilityType?: 'warehouse' | 'store' | null,
  facilityId?: string | null
) {
  return useAuthQuery<VariantFacilityOnHandResult>({
    queryKey: ['stock-balances', 'variant-facility-on-hand', variantId, facilityType, facilityId],
    queryFn: (getToken) => {
      if (!variantId || !facilityType || !facilityId) {
        return Promise.resolve({
          product_variant_id: variantId ?? '',
          facility_id: facilityId ?? '',
          qty_on_hand: 0,
          qty_reserved: 0,
          qty_available: 0,
          avg_cost: 0,
        })
      }
      return fetchVariantFacilityOnHand(getToken, {
        productVariantId: variantId,
        facilityType,
        facilityId,
      })
    },
    enabled: Boolean(variantId && facilityType && facilityId),
    rbac: { permission: 'inventory.stock.view' },
    staleTime: 15_000,
  })
}

/**
 * Hook to perform single-line manual stock adjustment.
 * Gated by permission 'inventory.stock.manage'.
 */
export function useAdjustStock() {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      values,
      getToken,
    }: {
      values: AdjustmentFormData
      getToken?: () => Promise<string | null>
    }) => {
      const canManage =
        has({ permission: 'inventory.stock.manage' }) ||
        has({ role: 'super_admin' }) ||
        has({ role: 'admin' })

      if (!canManage) {
        throw new Error(
          i18n.t(
            'stockBalances.toast.permissionDenied',
            'You do not have permission to adjust stock balances.'
          )
        )
      }

      const defaultGetToken = async () => null
      return postStockAdjustment(getToken ?? defaultGetToken, values)
    },
    onSuccess: () => {
      // Invalidate stock balances and related caches
      queryClient.invalidateQueries({ queryKey: stockBalancesQueryKey })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'stock-by-location'] })
      queryClient.invalidateQueries({ queryKey: ['warehouses', 'options'] })
      queryClient.invalidateQueries({ queryKey: ['product-variants', 'options'] })
      toast.success(
        i18n.t('stockBalances.toast.adjusted', 'Stock balance adjusted successfully')
      )
    },
    onError: (error: Error) => {
      toast.error(
        error.message ||
          i18n.t('stockBalances.toast.failed', 'Failed to adjust stock balance')
      )
    },
  })
}

/**
 * Hook to fetch movement audit ledger for a specific stock balance row.
 */
export function useStockBalanceMovements(
  variantId?: string | null,
  facility?: { warehouseId?: string | null; storeId?: string | null }
) {
  return useAuthQuery<StockMovementRow[]>({
    queryKey: ['stock-balances', 'movements', variantId, facility],
    queryFn: (getToken) => {
      if (!variantId) return Promise.resolve([])
      return fetchStockBalanceMovements(getToken, variantId, facility)
    },
    enabled: Boolean(variantId),
    rbac: { permission: 'inventory.stock.view' },
  })
}
