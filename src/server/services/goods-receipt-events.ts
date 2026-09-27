import { getRedisPublisher } from '@/server/redis/redis-client'
import { BusinessEventNotifications } from './business-event-notifications'
import { NotificationService } from './notification.service'
import { isValidUuid } from '@/server/utils/tenant'

export interface GoodsReceiptEventPayload {
  event: string
  tenantId: string
  goodsReceiptId: string
  receiptNumber: string
  purchaseOrderId: string
  purchaseOrderNumber?: string | number | null
  warehouseId: string
  warehouseName?: string | null
  postedByUserId?: string | null
  itemsCount: number
  totalAccepted: number
  totalRejected: number
  poLifecycleStatus?: string
  poRemainingQuantity?: number
  timestamp: string
}

export class GoodsReceiptEvents {
  /**
   * Publishes tenant-scoped Redis Pub/Sub events and in-app notifications
   * STRICTLY AFTER a goods receipt database transaction commits.
   */
  static async publishReceiptPosted(payload: GoodsReceiptEventPayload): Promise<void> {
    const {
      tenantId,
      goodsReceiptId,
      receiptNumber,
      purchaseOrderId,
      purchaseOrderNumber,
      warehouseId,
      warehouseName,
      postedByUserId,
      itemsCount,
      totalAccepted,
      totalRejected,
      poLifecycleStatus,
      poRemainingQuantity,
      timestamp,
    } = payload

    const poNumberStr = purchaseOrderNumber
      ? String(purchaseOrderNumber).startsWith('PO')
        ? String(purchaseOrderNumber)
        : `PO-${purchaseOrderNumber}`
      : purchaseOrderId.slice(0, 8)

    const channel = `tenant:${tenantId}:inventory`

    // 1. Publish primary Redis event: inventory.goods_receipt.posted
    try {
      const publisher = getRedisPublisher()
      const eventBody = {
        event: 'inventory.goods_receipt.posted',
        tenantId,
        goodsReceiptId,
        receiptNumber,
        purchaseOrderId,
        purchaseOrderNumber: poNumberStr,
        warehouseId,
        postedByUserId: postedByUserId || null,
        itemsCount,
        totalAccepted,
        totalRejected,
        timestamp,
      }
      await publisher.publish(channel, JSON.stringify(eventBody))

      // 2. Publish stock updated event
      await publisher.publish(
        channel,
        JSON.stringify({
          event: 'inventory.stock.updated',
          tenantId,
          warehouseId,
          goodsReceiptId,
          totalAccepted,
          timestamp,
        })
      )

      // 3. Publish PO status event (partially_received or fully_received)
      if (poLifecycleStatus === 'received') {
        await publisher.publish(
          channel,
          JSON.stringify({
            event: 'inventory.purchase_order.fully_received',
            tenantId,
            purchaseOrderId,
            purchaseOrderNumber: poNumberStr,
            timestamp,
          })
        )
      } else if (poLifecycleStatus === 'partially_received') {
        await publisher.publish(
          channel,
          JSON.stringify({
            event: 'inventory.purchase_order.partially_received',
            tenantId,
            purchaseOrderId,
            purchaseOrderNumber: poNumberStr,
            remainingQuantity: poRemainingQuantity ?? 0,
            timestamp,
          })
        )
      }
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.warn('[GoodsReceiptEvents] Redis publish deferred/unavailable:', (err as Error)?.message)
    }

    // 4. In-App Notifications (BusinessEventNotifications & Alerts)
    try {
      // 4a. Goods Receipt Confirmed / Posted Alert
      await BusinessEventNotifications.notifyGoodsReceiptConfirmed({
        tenantId,
        receiptId: goodsReceiptId,
        receiptNumber,
        poNumber: poNumberStr,
        warehouseName,
        warehouseId,
        itemsCount,
        userId: postedByUserId,
      })

      // 4b. If items were rejected, dispatch specific Rejected Quantity alert
      if (totalRejected > 0) {
        await NotificationService.createNotification({
          tenantId,
          title: `Rejected Items: Receipt ${receiptNumber}`,
          message: `${totalRejected} unit(s) were rejected during receipt ${receiptNumber} against ${poNumberStr}. Items were quarantined and not added to active inventory.`,
          type: 'system',
          severity: 'WARNING',
          priority: 'high',
          targetType: 'ROLE',
          targetRoleId: 'inventory_manager',
          senderType: 'system',
          senderUserId: postedByUserId,
          businessEventType: 'custom',
          sourceEntityType: 'goods_receipts',
          sourceEntityId: isValidUuid(goodsReceiptId) ? goodsReceiptId : null,
          idempotencyKey: `receipt_rejected:${tenantId}:${goodsReceiptId}`,
          actionUrl: `/inventory/goods-receipts/${goodsReceiptId}`,
          actionLabel: 'Inspect Rejection',
          metadata: {
            goodsReceiptId,
            receiptNumber,
            totalRejected,
            target_role: 'inventory_manager',
          },
        })
      }

      // 4c. PO Status Changed Alert (Partially or Fully Received)
      if (poLifecycleStatus === 'received') {
        await BusinessEventNotifications.notifyPurchaseOrderReceived({
          tenantId,
          poId: purchaseOrderId,
          poNumber: poNumberStr,
          itemsCount,
          createdByUserId: postedByUserId,
        })
      } else if (poLifecycleStatus === 'partially_received') {
        await BusinessEventNotifications.notifyPurchaseOrderStatusChanged({
          tenantId,
          poId: purchaseOrderId,
          poNumber: poNumberStr,
          newStatus: 'partially_received',
          updatedByUserId: postedByUserId,
        })
      }
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.warn('[GoodsReceiptEvents] In-app notification dispatch deferred:', (err as Error)?.message)
    }
  }

  /**
   * Publishes receipt cancellation event to Redis and in-app alerts.
   */
  static async publishReceiptCancelled(payload: {
    tenantId: string
    goodsReceiptId: string
    receiptNumber: string
    userId?: string | null
  }): Promise<void> {
    const { tenantId, goodsReceiptId, receiptNumber } = payload
    try {
      const publisher = getRedisPublisher()
      await publisher.publish(
        `tenant:${tenantId}:inventory`,
        JSON.stringify({
          event: 'inventory.goods_receipt.cancelled',
          tenantId,
          goodsReceiptId,
          receiptNumber,
          timestamp: new Date().toISOString(),
        })
      )
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.warn('[GoodsReceiptEvents] Redis cancel event deferred:', (err as Error)?.message)
    }
  }
}
