import Dexie, { type Table } from 'dexie'

// Domain models
export interface LocalCategory {
  id: string
  name: string
  slug: string
  description?: string
  image?: string
  is_active: number // 0 or 1 for indexing
  store_id: string
  created_at: string
  updated_at: string
  sort_order?: number
}

export interface LocalProduct {
  id: string
  name: string
  slug: string
  description?: string
  price: number
  compare_at_price?: number
  cost_price?: number
  sku?: string
  barcode?: string
  track_inventory: boolean
  category_id: string
  store_id: string
  is_active: number // 0 or 1
  image?: string
  created_at: string
  updated_at: string
  // ResPOS specific
  base_price?: number
  is_available?: number // 0 or 1
  preparation_time?: number
  allergens?: string[]
  tags?: string[]
  has_variants?: boolean
  category_name?: string
  product_variants?: unknown[]
  properties?: unknown[]
}

export interface LocalStore {
  id: string
  name: string
  slug: string
  domain?: string
  logo?: string
  phone?: string
  currency: string
  timezone: string
  address?: string
  settings?: Record<string, unknown>
}

// Transaction for offline sync
export interface SyncAction {
  id?: number // Auto-incremented
  type:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'SYNC_POS_TRANSACTION'
    | 'CREATE_RES_ORDER'
  table: 'categories' | 'products' | 'orders'
  entityId: string
  data: unknown
  createdAt: number
  status: 'pending' | 'syncing' | 'failed' | 'completed'
  error?: string
  retryCount: number
  lastAttemptAt?: number
}

// Generic key/value row used to persist the TanStack Query cache (catalog data)
// across reloads. See `src/lib/db/persister.ts`.
export interface KvEntry {
  key: string
  value: string
}

/**
 * Durable outbox entry for offline writes (orders). Each entry names a handler
 * (see `src/lib/sync/handlers.ts`) that knows how to replay it against the
 * server. Replaces the legacy generic `syncActions` outbox.
 */
export type OutboxStatus = 'pending' | 'syncing' | 'failed' | 'done'

export interface OutboxEntry {
  // Idempotency key — also the primary key, so a re-enqueue of the same
  // logical order can never create a duplicate.
  idempotencyKey: string
  type: string
  payload: unknown
  status: OutboxStatus
  retryCount: number
  createdAt: number
  nextAttemptAt: number
  lastAttemptAt?: number
  lastError?: string
}

export class OfflineDatabase extends Dexie {
  categories!: Table<LocalCategory, string>
  products!: Table<LocalProduct, string>
  stores!: Table<LocalStore, string>
  syncActions!: Table<SyncAction, number>
  kv!: Table<KvEntry, string>
  outbox!: Table<OutboxEntry, string>

  constructor() {
    super('ResposOfflineDB')
    this.version(2).stores({
      categories:
        'id, store_id, slug, is_active, sort_order, [store_id+is_active]',
      products:
        'id, store_id, category_id, slug, is_active, is_available, barcode, [store_id+is_active]',
      stores: 'id, slug',
      syncActions: '++id, table, entityId, status, createdAt',
    })
    // v3 adds:
    //  - `kv`: backing store for the query-cache persister.
    //  - `outbox`: durable, handler-based offline write queue (replaces the
    //    legacy `syncActions` outbox, which is left in place for compatibility
    //    but no longer written to).
    this.version(3).stores({
      kv: 'key',
      outbox: 'idempotencyKey, type, status, nextAttemptAt, createdAt',
    })
  }
}

export const db = new OfflineDatabase()
