import { useLiveQuery } from '@tanstack/react-db'
import { productsCollection } from '@/lib/db/collections/products'
import type { PosProduct } from '../data/api'

/**
 * Reactive POS product catalog backed by a TanStack DB query collection.
 *
 * Adapter hook: exposes the same `{ products, isLoading }` shape the POS layout
 * previously got from `useQuery(['pos-products'])`, so swapping a consumer over
 * is a drop-in. Offline durability comes from the persisted query cache + the
 * service-worker Supabase cache; no per-hook IndexedDB fallback is needed.
 */
export function usePosProducts(): {
  products: PosProduct[]
  isLoading: boolean
} {
  const { data, isLoading } = useLiveQuery((q) =>
    q.from({ product: productsCollection })
  )
  return { products: (data ?? []) as PosProduct[], isLoading }
}
