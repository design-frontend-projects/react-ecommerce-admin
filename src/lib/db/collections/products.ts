import { createCollection } from '@tanstack/db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { queryClient } from '@/lib/query-client'
import { getPosProducts, type PosProduct } from '@/features/pos/data/api'
import { registerCatalogCollection } from './client'

/**
 * TanStack DB query collection for the POS product catalog.
 *
 * Wraps the existing `getPosProducts` Supabase read so consumers get a reactive,
 * live-queryable view. Shares the app QueryClient and the `['pos-products']`
 * key, so it stays consistent with any remaining `useQuery` on that key and with
 * the invalidations fired elsewhere (e.g. basket checkout).
 *
 * `getKey` is string-normalized because `product_id` is numeric — keeping keys
 * as strings avoids duplicate-key drift with the rest of the offline layer.
 */
export const productsCollection = createCollection(
  queryCollectionOptions({
    queryKey: ['pos-products'],
    queryFn: getPosProducts,
    queryClient,
    getKey: (p: PosProduct) => String(p.product_id),
  })
)

registerCatalogCollection({
  name: 'pos-products',
  refetch: () => productsCollection.utils.refetch(),
  cleanup: () => productsCollection.cleanup(),
})
