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
    }
  }

  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager()
    }
    return SyncManager.instance
  }

  /**
   * Start the synchronization process
   */
  public async sync() {
    if (this.isProcessing) return
    
    const pending = await offlineOrderService.getPendingOrders()
    if (pending.length === 0) return

    this.isProcessing = true
    toast.info(`Bắt đầu đồng bộ ${pending.length} đơn hàng...`)

    let successCount = 0
    let failCount = 0

    for (const action of pending) {
      try {
        if (action.type === 'SYNC_POS_TRANSACTION') {
          await createPosTransaction(action.data as PosTransactionPayload)
        } else if (action.type === 'CREATE_RES_ORDER') {
          await createResOrder(action.data as ResOrderPayload)
        }

        await offlineOrderService.markAsCompleted(action.id!)
        successCount++
      } catch (error) {
        console.error('Sync failed for action:', action.id, error)
        await offlineOrderService.markAsFailed(
          action.id!, 
          error instanceof Error ? error.message : 'Unknown error'
        )
        failCount++
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
