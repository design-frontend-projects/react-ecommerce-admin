import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OutboxWorker } from '@/server/queue/outbox-worker'
import { NotificationPublisher } from '@/server/redis/notification-publisher'
import prisma from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  default: {
    notification_publish_queue: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    notification_recipients: {
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('@/server/redis/notification-publisher', () => ({
  NotificationPublisher: {
    publish: vi.fn(),
  },
}))

describe('OutboxWorker Unit Tests', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('processes pending outbox queue items and marks them dispatched on success', async () => {
    const queueItem = {
      id: 'q-item-1',
      tenant_id: tenantId,
      notification_id: 'notif-100',
      payload: {
        id: 'notif-100',
        tenant_id: tenantId,
        title: 'PO Received',
        message: 'Order #555 confirmed',
        target_type: 'ALL',
      },
      status: 'pending',
      attempts: 0,
      max_attempts: 5,
    }

    vi.mocked(prisma.notification_publish_queue.findMany).mockResolvedValue([queueItem as any])
    vi.mocked(NotificationPublisher.publish).mockResolvedValue({
      publishedChannels: ['notify:00000000-0000-0000-0000-000000000001:tenant:all'],
      deliveredCount: 1,
    })

    const summary = await OutboxWorker.processBatch(10)

    expect(summary.processed).toBe(1)
    expect(summary.succeeded).toBe(1)
    expect(summary.failed).toBe(0)

    expect(NotificationPublisher.publish).toHaveBeenCalledWith(queueItem.payload)
    expect(prisma.notification_publish_queue.update).toHaveBeenCalledWith({
      where: { id: 'q-item-1' },
      data: {
        status: 'dispatched',
        processed_at: expect.any(Date),
        last_error: null,
      },
    })
    expect(prisma.notification_recipients.updateMany).toHaveBeenCalledWith({
      where: {
        notification_id: 'notif-100',
        delivery_status: 'pending',
      },
      data: {
        delivery_status: 'dispatched',
        dispatched_at: expect.any(Date),
      },
    })
  })

  it('applies exponential backoff and increments attempt counter on publish failure', async () => {
    const queueItem = {
      id: 'q-item-2',
      tenant_id: tenantId,
      notification_id: 'notif-200',
      payload: {
        id: 'notif-200',
        tenant_id: tenantId,
        title: 'Failing Notification',
      },
      status: 'pending',
      attempts: 1,
      max_attempts: 5,
    }

    vi.mocked(prisma.notification_publish_queue.findMany).mockResolvedValue([queueItem as any])
    vi.mocked(NotificationPublisher.publish).mockRejectedValue(
      new Error('Redis connection refused')
    )

    const summary = await OutboxWorker.processBatch(10)

    expect(summary.processed).toBe(1)
    expect(summary.succeeded).toBe(0)
    expect(summary.failed).toBe(1)

    expect(prisma.notification_publish_queue.update).toHaveBeenCalledWith({
      where: { id: 'q-item-2' },
      data: {
        status: 'pending',
        attempts: 2,
        next_retry_at: expect.any(Date),
        last_error: 'Redis connection refused',
      },
    })
  })
})
