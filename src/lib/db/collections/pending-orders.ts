import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'

/**
 * A reactive, in-memory view of orders currently queued in the offline outbox.
 * The outbox (Dexie) is the durable source of truth; this collection mirrors it
 * so components can `useLiveQuery` the pending list (e.g. an "N orders waiting
 * to sync" badge) and get instant optimistic updates.
 *
 * Local-only: not persisted itself and rebuilt from the outbox on startup.
 */
export interface PendingOrder {
  idempotencyKey: string
  type: string
  createdAt: number
  status: 'pending' | 'syncing' | 'failed' | 'done'
}

export const pendingOrdersCollection = createCollection(
  localOnlyCollectionOptions<PendingOrder>({
    getKey: (o) => o.idempotencyKey,
  })
)
