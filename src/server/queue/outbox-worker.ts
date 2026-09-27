import prisma from '@/lib/prisma'
import {
  NotificationPublisher,
  type StandardNotificationPayload,
} from '../redis/notification-publisher'

// Exponential backoff delays in milliseconds for retry attempts: 1 to 5
const RETRY_DELAYS_MS = [
  5000, // Attempt 1: 5s
  30000, // Attempt 2: 30s
  120000, // Attempt 3: 2m
  600000, // Attempt 4: 10m
]

export class OutboxWorker {
  private static isProcessing = false

  /**
   * Processes a batch of pending items from notification_publish_queue.
   * Can be called by a recurring cron, timer, or BullMQ job.
   */
  static async processBatch(batchSize = 25): Promise<{
    processed: number
    succeeded: number
    failed: number
  }> {
    if (this.isProcessing) {
      return { processed: 0, succeeded: 0, failed: 0 }
    }

    this.isProcessing = true
    let succeeded = 0
    let failed = 0

    try {
      const now = new Date()

      // 1. Fetch pending or retry-eligible items
      const pendingItems = await prisma.notification_publish_queue.findMany({
        where: {
          OR: [
            { status: 'pending' },
            {
              status: 'failed',
              attempts: { lt: 5 },
              next_retry_at: { lte: now },
            },
          ],
        },
        orderBy: { created_at: 'asc' },
        take: batchSize,
      })

      for (const item of pendingItems) {
        try {
          const payload = item.payload as unknown as StandardNotificationPayload

          // 2. Publish to Redis Pub/Sub
          await NotificationPublisher.publish(payload)

          // 3. Mark queue record as dispatched
          await prisma.notification_publish_queue.update({
            where: { id: item.id },
            data: {
              status: 'dispatched',
              processed_at: new Date(),
              last_error: null,
            },
          })

          // 4. Update recipient delivery status in PostgreSQL
          await prisma.notification_recipients.updateMany({
            where: {
              notification_id: item.notification_id,
              delivery_status: 'pending',
            },
            data: {
              delivery_status: 'dispatched',
              dispatched_at: new Date(),
            },
          })

          succeeded++
        } catch (err: any) {
          failed++
          const nextAttempt = item.attempts + 1
          const delayMs =
            RETRY_DELAYS_MS[nextAttempt - 1] ||
            RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]
          const nextRetryAt = new Date(Date.now() + delayMs)

          await prisma.notification_publish_queue.update({
            where: { id: item.id },
            data: {
              status: nextAttempt >= item.max_attempts ? 'failed' : 'pending',
              attempts: nextAttempt,
              next_retry_at: nextRetryAt,
              last_error: err.message || 'Unknown publish error',
            },
          })

          // Update recipient retry counters
          await prisma.notification_recipients.updateMany({
            where: {
              notification_id: item.notification_id,
              delivery_status: 'pending',
            },
            data: {
              retry_count: { increment: 1 },
              last_retry_at: new Date(),
              failure_reason: err.message || 'Publish failure',
            },
          })
        }
      }

      return {
        processed: pendingItems.length,
        succeeded,
        failed,
      }
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Starts a background polling loop for the outbox queue.
   */
  static startPolling(intervalMs = 3000): NodeJS.Timeout {
    console.log(`[Outbox Worker] Polling started (interval: ${intervalMs}ms)`)
    return setInterval(async () => {
      try {
        await this.processBatch()
      } catch (err: any) {
        console.warn('[Outbox Worker] Background poll error:', err.message)
      }
    }, intervalMs)
  }
}
