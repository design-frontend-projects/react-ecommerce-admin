import type { Query, QueryClient, QueryKey } from '@tanstack/react-query'
import {
  persistQueryClient,
  type PersistedClient,
  type Persister,
} from '@tanstack/query-persist-client-core'
import { db } from './indexed-db'

/**
 * Durable persistence for the TanStack Query cache so cached **catalog** data
 * survives full page reloads while offline. Combined with the service-worker
 * NetworkFirst cache for Supabase reads, this lets the app render products,
 * categories and customers after a reload with no network.
 *
 * Only catalog queries are persisted — never auth/subscription/session queries
 * (which can carry tokens). See `shouldPersistQueryKey`.
 */

const PERSIST_KEY = 'tanstack-query-cache'
// Bump when the persisted shape changes to invalidate stale caches.
const BUSTER = 'v1'
const MAX_AGE = 60 * 60 * 1000 // 1 hour

/**
 * Top-level query-key segments whose data is safe and useful to persist for
 * offline reads. Keep this an explicit allow-list.
 */
const CATALOG_KEY_ROOTS = new Set([
  'products',
  'categories',
  'customers',
  'pos-products',
  'pos-categories',
  'stores',
])

function shouldPersistQueryKey(queryKey: QueryKey): boolean {
  const [root, second] = queryKey as ReadonlyArray<unknown>
  if (typeof root !== 'string') return false
  if (CATALOG_KEY_ROOTS.has(root)) return true
  // respos menu catalog: ['respos', 'menu-categories' | 'menu-items', ...]
  if (root === 'respos' && typeof second === 'string') {
    return second === 'menu-categories' || second === 'menu-items'
  }
  return false
}

/** Dexie-backed implementation of the TanStack Query `Persister` interface. */
const dexiePersister: Persister = {
  async persistClient(client: PersistedClient) {
    await db.kv.put({ key: PERSIST_KEY, value: JSON.stringify(client) })
  },
  async restoreClient() {
    const row = await db.kv.get(PERSIST_KEY)
    if (!row) return undefined
    try {
      return JSON.parse(row.value) as PersistedClient
    } catch {
      return undefined
    }
  },
  async removeClient() {
    await db.kv.delete(PERSIST_KEY)
  },
}

/**
 * Restore the persisted cache and start persisting future catalog changes.
 * Call once, client-side, with the shared QueryClient.
 * Returns an unsubscribe function.
 */
export function setupQueryPersistence(queryClient: QueryClient): () => void {
  const [unsubscribe] = persistQueryClient({
    queryClient,
    persister: dexiePersister,
    maxAge: MAX_AGE,
    buster: BUSTER,
    dehydrateOptions: {
      shouldDehydrateQuery: (query: Query) =>
        query.state.status === 'success' &&
        shouldPersistQueryKey(query.queryKey),
    },
  })

  return unsubscribe
}

/** Remove the persisted query cache from IndexedDB (used by the reconnect wipe). */
export async function clearPersistedQueryCache(): Promise<void> {
  await dexiePersister.removeClient()
}
