import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationPublisher } from '@/server/redis/notification-publisher'
import { getRedisPublisher, getRedisClient } from '@/server/redis/redis-client'

vi.mock('@/server/redis/redis-client', () => {
  const mockPublisher = {
    publish: vi.fn().mockResolvedValue(1),
  }
  const mockPipeline = {
    incr: vi.fn().mockReturnThis(),
    zadd: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  }
  const mockClient = {
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue('5'),
    del: vi.fn().mockResolvedValue(1),
    pipeline: vi.fn().mockReturnValue(mockPipeline),
  }
  return {
    getRedisPublisher: vi.fn(() => mockPublisher),
    getRedisClient: vi.fn(() => mockClient),
    isRedisHealthy: vi.fn().mockResolvedValue(true),
  }
})

describe('NotificationPublisher Unit Tests', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001'
  const userId1 = '11111111-1111-1111-1111-111111111111'
  const userId2 = '22222222-2222-2222-2222-222222222222'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('publishes tenant-wide notifications to notify:{tenantId}:tenant:all', async () => {
    const publisher = getRedisPublisher()
    const result = await NotificationPublisher.publish({
      v: 1,
      id: 'notif-1',
      tenant_id: tenantId,
      type: 'announcement',
      severity: 'INFO',
      priority: 'normal',
      target_type: 'ALL',
      title: 'Company Announcement',
      message: 'Office closed tomorrow',
      created_at: new Date().toISOString(),
    })

    expect(result.publishedChannels).toContain(`notify:${tenantId}:tenant:all`)
    expect(publisher.publish).toHaveBeenCalledWith(
      `notify:${tenantId}:tenant:all`,
      expect.stringContaining('Company Announcement')
    )
  })

  it('publishes user-targeted notifications to individual user channels', async () => {
    const publisher = getRedisPublisher()
    const result = await NotificationPublisher.publish({
      v: 1,
      id: 'notif-2',
      tenant_id: tenantId,
      type: 'task',
      severity: 'WARNING',
      priority: 'high',
      target_type: 'USER',
      title: 'Action Required',
      message: 'Approve invoice #42',
      recipient_user_ids: [userId1, userId2],
      created_at: new Date().toISOString(),
    })

    expect(result.publishedChannels).toContain(`notify:${tenantId}:user:${userId1}`)
    expect(result.publishedChannels).toContain(`notify:${tenantId}:user:${userId2}`)
    expect(publisher.publish).toHaveBeenCalledTimes(2)
  })

  it('sets 48-hour deduplication key in Redis when idempotency_key is present', async () => {
    const client = getRedisClient()
    await NotificationPublisher.publish({
      v: 1,
      id: 'notif-3',
      tenant_id: tenantId,
      type: 'alert',
      severity: 'ERROR',
      priority: 'urgent',
      target_type: 'ALL',
      title: 'Stock Alert',
      message: 'Out of stock',
      idempotency_key: 'stock_empty:prod-99:2026-09-27',
      created_at: new Date().toISOString(),
    })

    expect(client.set).toHaveBeenCalledWith(
      `notif:dedup:${tenantId}:stock_empty:prod-99:2026-09-27`,
      'notif-3',
      'EX',
      172800
    )
  })

  it('invalidates and caches unread count in Redis', async () => {
    const client = getRedisClient()

    await NotificationPublisher.invalidateUnreadCount(tenantId, userId1)
    expect(client.del).toHaveBeenCalledWith(`notif:count:${tenantId}:${userId1}`)

    await NotificationPublisher.setCachedUnreadCount(tenantId, userId1, 3)
    expect(client.set).toHaveBeenCalledWith(
      `notif:count:${tenantId}:${userId1}`,
      '3',
      'EX',
      86400
    )

    const count = await NotificationPublisher.getCachedUnreadCount(tenantId, userId1)
    expect(count).toBe(5)
  })
})
