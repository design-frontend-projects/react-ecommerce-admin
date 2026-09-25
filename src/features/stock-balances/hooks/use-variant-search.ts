import { useState, useEffect } from 'react'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { searchProductVariants } from '../data/actions'
import type { VariantSearchResult, VariantSearchResponse } from '../data/schema'

/**
 * Hook to search product variants with 300ms debounce and query caching.
 */
export function useVariantSearch(query = '', limit = 25) {
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => {
      clearTimeout(handler)
    }
  }, [query])

  const isDebouncing = debouncedQuery !== query

  const queryResult = useAuthQuery<VariantSearchResponse>({
    queryKey: ['product-variants', 'search', debouncedQuery, limit],
    queryFn: (getToken) => searchProductVariants(getToken, debouncedQuery, limit),
    rbac: { permission: 'inventory.stock.view' },
    staleTime: 60_000,
  })

  return {
    ...queryResult,
    variants: (queryResult.data?.items ?? []) as VariantSearchResult[],
    isDebouncing,
  }
}
