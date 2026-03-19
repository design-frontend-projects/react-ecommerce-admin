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
  variants?: unknown[]
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
}

export class OfflineDatabase extends Dexie {
  categories!: Table<LocalCategory, string>
  products!: Table<LocalProduct, string>
  stores!: Table<LocalStore, string>
  syncActions!: Table<SyncAction, number>

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
  }
}

export const db = new OfflineDatabase()
