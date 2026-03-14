import { v7 as uuidv7 } from 'uuid'
import { db } from './db/indexed-db'

export interface OfflineOrder {
  id: string
  store_id: string
  total_amount: number
  items: unknown[]
  status: 'PENDING' | 'SYNCED' | 'FAILED'
  created_at: string
  customer_id?: string
  payment_method?: string
}

export const offlineOrderService = {
  /**
   * Saves an order locally when offline
   */
  async saveOfflineOrder(order: Partial<OfflineOrder>) {
    const id = order.id || uuidv7()
    const newOrder: OfflineOrder = {
      id,
      store_id: order.store_id || 'default',
      total_amount: order.total_amount || 0,
      items: order.items || [],
      status: 'PENDING',
      created_at: new Date().toISOString(),
      ...order,
    }

    // Save to syncActions table for synchronization later
    await db.syncActions.add({
      type: 'CREATE', // Assuming 'CREATE' is the intended type for saving an order
      table: 'orders', // The instruction had 'orders'' which was syntactically incorrect. Assuming 'orders' is the correct table name.
      entityId: id,
      data: newOrder,
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0,
    })

    return newOrder
  },

  /**
   * Retrieves all pending orders
   */
  async getPendingOrders() {
    return await db.syncActions
      .where('table')
      .equals('orders')
      .and(
        (action) => action.status === 'pending' || action.status === 'failed'
      )
      .toArray()
  },

  /**
   * Marks an order action as completed
   */
  async markAsCompleted(actionId: number) {
    return await db.syncActions.update(actionId, {
      status: 'completed',
      error: undefined,
    })
  },

  /**
   * Marks an order action as failed
   */
  async markAsFailed(actionId: number, error: string) {
    const action = await db.syncActions.get(actionId)
    if (!action) return

    return await db.syncActions.update(actionId, {
      status: 'failed',
      error,
      retryCount: action.retryCount + 1,
    })
  },
}
