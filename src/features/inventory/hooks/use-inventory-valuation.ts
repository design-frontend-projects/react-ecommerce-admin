import { useState, useEffect } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { useAuthQuery } from '@/hooks/use-auth-query'
import {
  fetchInventoryValuation,
  fetchValuationLookups,
} from '../data/valuation-actions'
import type {
  ValuationFilters,
  ValuationResponse,
  ValuationFilterLookups,
} from '../data/valuation-schema'

export const valuationQueryKey = ['inventory-valuation'] as const
export const valuationLookupsKey = ['inventory-valuation-lookups'] as const

/**
 * Custom hook to debounce values for lazy searching
 */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook to query inventory valuation data with server-side filters,
 * pagination, and aggregate KPI metrics.
 */
export function useInventoryValuation(filters: ValuationFilters = {}) {
  const query = useAuthQuery<ValuationResponse>({
    queryKey: [...valuationQueryKey, filters],
    queryFn: (getToken) => fetchInventoryValuation(getToken, filters),
    rbac: { permission: 'inventory.stock.view' },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

  return {
    ...query,
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? 1,
    limit: query.data?.limit ?? 25,
    totalPages: query.data?.totalPages ?? 1,
    metrics: query.data?.metrics ?? {
      totalValuation: 0,
      totalUnits: 0,
      totalPotentialRevenue: 0,
      averageMargin: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      totalLines: 0,
      methodTotals: {
        avco: 0,
        standard: 0,
        fifo: 0,
        retail: 0,
      },
    },
  }
}

/**
 * Hook to fetch real database table lookups (warehouses, stores, categories, suppliers)
 * for the valuation filter bar.
 */
export function useValuationLookups() {
  const query = useAuthQuery<ValuationFilterLookups>({
    queryKey: valuationLookupsKey,
    queryFn: (getToken) => fetchValuationLookups(getToken),
    rbac: { permission: 'inventory.stock.view' },
    staleTime: 300_000, // 5 minutes cache
  })

  return {
    ...query,
    warehouses: query.data?.warehouses ?? [],
    stores: query.data?.stores ?? [],
    categories: query.data?.categories ?? [],
    suppliers: query.data?.suppliers ?? [],
  }
}
