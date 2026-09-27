import { getRedisPublisher, getRedisClient } from './redis-client'
import { RedisChannelStrategy } from './channel-strategy'
import type {
  NotificationSeverity,
  NotificationPriority,
  NotificationType,
  NotificationSenderType,
  NotificationTargetType,
  BusinessEventType,
} from '@/features/notifications/data/schema'

export interface StandardNotificationPayload {
  v: number
  id: string
  tenant_id: string
  channel_id?: string | null
  type: NotificationType
  severity: NotificationSeverity
  priority: NotificationPriority
  target_type: NotificationTargetType
  title: string
  message: string
  sender?: {
    type: NotificationSenderType
    id?: string | null
    name?: string | null
  }
  business_event?: {
    type?: BusinessEventType | null
    entity_type?: string | null
    entity_id?: string | null
  }
  action?: {
    url?: string | null
    label?: string | null
  }
  metadata?: Record<string, unknown>
  idempotency_key?: string | null
  created_at: string
  expires_at?: string | null
  recipient_user_ids?: string[]
}

export class NotificationPublisher {
  /**
   * Publishes a standardized notification envelope to the appropriate Redis channel(s).
   */
  static async publish(payload: StandardNotificationPayload): Promise<{
    publishedChannels: string[]
    deliveredCount: number
  }> {
    const publisher = getRedisPublisher()
    const client = getRedisClient()
    const tenantId = payload.tenant_id
    const publishedChannels: string[] = []
    let deliveredCount = 0

    const serializedMessage = JSON.stringify(payload)

    // 1. Determine target Redis channel(s) based on target_type
    switch (payload.target_type) {
      case 'ALL': {
        const ch = RedisChannelStrategy.getTenantAllChannel(tenantId)
        publishedChannels.push(ch)
        break
      }
      case 'CHANNEL': {
        if (payload.channel_id) {
          const ch = RedisChannelStrategy.getChannelChannel(tenantId, payload.channel_id)
          publishedChannels.push(ch)
        }
        break
      }
      case 'ROLE': {
        const roleTarget = payload.metadata?.target_role_id || payload.metadata?.target_role
        if (roleTarget) {
          const ch = RedisChannelStrategy.getRoleChannel(
            tenantId,
            String(roleTarget)
          )
          publishedChannels.push(ch)
        }
        break
      }
      case 'USER': {
        if (payload.recipient_user_ids && payload.recipient_user_ids.length > 0) {
          for (const uid of payload.recipient_user_ids) {
            publishedChannels.push(RedisChannelStrategy.getUserChannel(tenantId, uid))
          }
        }
        break
      }
      default: {
        // Fall back to direct user channels if specific recipient list is provided
        if (payload.recipient_user_ids && payload.recipient_user_ids.length > 0) {
          for (const uid of payload.recipient_user_ids) {
            publishedChannels.push(RedisChannelStrategy.getUserChannel(tenantId, uid))
          }
        } else {
          publishedChannels.push(RedisChannelStrategy.getTenantAllChannel(tenantId))
        }
      }
    }

    // 2. Publish to Redis channels via Pub/Sub and emit to local Socket.IO rooms
    for (const channel of publishedChannels) {
      try {
        const count = await publisher.publish(channel, serializedMessage)
        deliveredCount += count
      } catch (err: any) {
        console.warn(`[Redis Publisher] Error publishing to ${channel}:`, err.message)
      }

      // Also deliver via active Socket.IO instance
      try {
        const { NotificationSocketServer } = await import('../websocket/socket-server')
        NotificationSocketServer.emitToRoom(channel, 'notification:new', payload)
      } catch {}
    }

    // 3. Update Redis Caches (dedup & unread counters) asynchronously
    try {
      // 3.1 Idempotency deduplication guard (48h TTL)
      if (payload.idempotency_key) {
        const dedupKey = RedisChannelStrategy.getDedupKey(tenantId, payload.idempotency_key)
        await client.set(dedupKey, payload.id, 'EX', 172800)
      }

      // 3.2 Invalidate or increment unread counts for recipients
      if (payload.recipient_user_ids && payload.recipient_user_ids.length > 0) {
        const pipeline = client.pipeline()
        const score = new Date(payload.created_at).getTime()
        for (const uid of payload.recipient_user_ids) {
          const countKey = RedisChannelStrategy.getUnreadCountKey(tenantId, uid)
          const setKey = RedisChannelStrategy.getUnreadSetKey(tenantId, uid)
          pipeline.incr(countKey)
          pipeline.zadd(setKey, score, payload.id)
          pipeline.expire(setKey, 2592000) // 30 days
        }
        await pipeline.exec()
      }
    } catch (err: any) {
      console.warn('[Redis Publisher] Cache update warning:', err.message)
    }

    return {
      publishedChannels,
      deliveredCount,
    }
  }

  /**
   * Invalidates the unread count in Redis for a user (forces fresh DB count on next read).
   */
  static async invalidateUnreadCount(tenantId: string, userId: string): Promise<void> {
    try {
      const client = getRedisClient()
      const countKey = RedisChannelStrategy.getUnreadCountKey(tenantId, userId)
      await client.del(countKey)
    } catch (err: any) {
      console.warn('[Redis Publisher] Failed to invalidate unread count:', err.message)
    }
  }

  /**
   * Sets cached unread count in Redis.
   */
  static async setCachedUnreadCount(
    tenantId: string,
    userId: string,
    count: number
  ): Promise<void> {
    try {
      const client = getRedisClient()
      const countKey = RedisChannelStrategy.getUnreadCountKey(tenantId, userId)
      await client.set(countKey, count.toString(), 'EX', 86400) // 24h
    } catch (err: any) {
      console.warn('[Redis Publisher] Failed to set unread count cache:', err.message)
    }
  }

  /**
   * Gets cached unread count from Redis, or null if cache miss.
   */
  static async getCachedUnreadCount(
    tenantId: string,
    userId: string
  ): Promise<number | null> {
    try {
      const client = getRedisClient()
      const countKey = RedisChannelStrategy.getUnreadCountKey(tenantId, userId)
      const val = await client.get(countKey)
      return val !== null ? parseInt(val, 10) : null
    } catch {
      return null
    }
  }
}
