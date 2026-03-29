import { offlineOrderService } from './offline-order-service'
import { createPosTransaction } from '@/features/pos/data/api'
import { createResOrder } from '@/features/respos/api/api'
import { toast } from 'sonner'

type PosTransactionPayload = Parameters<typeof createPosTransaction>[0]
type ResOrderPayload = Parameters<typeof createResOrder>[0]

export class SyncManager {
  private static instance: SyncManager
  private isProcessing = false

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.sync())
      
      // Listen for message from service worker when sync event fires
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'SYNC_ORDERS') {
            this.sync()
          }
        })
      }
    }
  }

  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager()
    }
    return SyncManager.instance
  }

  /**
   * Register a background sync task for pending orders (if supported)
   */
  public async scheduleSync() {
    const { backgroundSync } = await import('./background-sync');
    const registered = await backgroundSync.register('sync-orders');
    if (!registered) {
      // Fallback: manually trigger when online
      if (navigator.onLine) {
        this.sync();
      }
    }
  }

  /**
   * Start the synchronization process
   */
  public async sync() {
    if (this.isProcessing) return
    
    const pending = await offlineOrderService.getPendingOrders()
    const now = Date.now()
    const eligible = pending.filter(action => {
      // Don't retry more than 10 times
      if (action.retryCount >= 10) return false;
      
      if (action.retryCount === 0) return true;
      // Exponential backoff: 1min, 2min, 4min, 8min... up to 24h
      const backoffMs = Math.min(Math.pow(2, action.retryCount - 1) * 60 * 1000, 24 * 60 * 60 * 1000);
      const lastAttempt = action.lastAttemptAt || action.createdAt;
      return (now - lastAttempt) >= backoffMs;
    });

    if (eligible.length === 0) return

    this.isProcessing = true
    toast.info(`Bắt đầu đồng bộ ${eligible.length} đơn hàng...`)

    let successCount = 0
    let failCount = 0

    for (const action of eligible) {
      try {
        if (action.type === 'SYNC_POS_TRANSACTION') {
          await createPosTransaction(action.data as PosTransactionPayload)
        } else if (action.type === 'CREATE_RES_ORDER') {
          await createResOrder(action.data as ResOrderPayload)
        }

        await offlineOrderService.markAsCompleted(action.id!)
        successCount++
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Sync failed for action:', action.id, error)
        await offlineOrderService.markAsFailed(
          action.id!, 
          error instanceof Error ? error.message : 'Unknown error'
        )
        failCount++
        
        if (action.retryCount + 1 >= 10) {
          toast.error(`Đồng bộ thất bại: Hành động (ID: ${action.id}) đã vượt quá số lần thử lại tối đa.`);
        }
      }
    }

    this.isProcessing = false

    if (successCount > 0) {
      toast.success(`Đã đồng bộ thành công ${successCount} đơn hàng`)
    }
    if (failCount > 0) {
      toast.error(`Đồng bộ thất bại ${failCount} đơn hàng. Sẽ thử lại sau.`)
    }
  }
}

export const syncManager = SyncManager.getInstance()
