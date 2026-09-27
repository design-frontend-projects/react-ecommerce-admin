import { Server as HttpServer } from 'node:http'
import { Server as SocketIOServer, type Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { getRedisPublisher, getRedisSubscriber, getRedisClient } from '../redis/redis-client'
import { RedisChannelStrategy } from '../redis/channel-strategy'
import { NotificationService } from '../services/notification.service'
import { supabaseAdmin } from '../supabase-admin'
import prisma from '@/lib/prisma'

export interface SocketUserPayload {
  tenantUserId: string
  authUserId: string
  tenantId: string
  email: string | null
  roles: string[]
}

export class NotificationSocketServer {
  private static io: SocketIOServer | null = null

  /**
   * Initializes the Socket.IO server attached to an HTTP server or standalone.
   */
  static init(httpServer: HttpServer): SocketIOServer {
    if (this.io) {
      return this.io
    }

    const io = new SocketIOServer(httpServer, {
      path: '/api/socket.io',
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 20000,
      pingInterval: 25000,
    })

    // 1. Attach Redis Pub/Sub Adapter for horizontal scalability
    try {
      const pubClient = getRedisPublisher()
      const subClient = getRedisSubscriber()
      io.adapter(createAdapter(pubClient, subClient))
      console.log('[SocketServer] Attached Redis adapter for horizontal scaling.')
    } catch (err: any) {
      console.warn('[SocketServer] Redis adapter unavailable, using in-memory adapter:', err.message)
    }

    // 2. Authentication & Tenant Resolution Middleware
    io.use(async (socket: Socket, next) => {
      try {
        const rawToken =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '')

        if (!rawToken) {
          return next(new Error('AUTHENTICATION_ERROR: Missing bearer token'))
        }

        // Validate token with Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(rawToken)
        if (authError || !authData?.user) {
          return next(new Error('AUTHENTICATION_ERROR: Invalid or expired token'))
        }

        const authUserId = authData.user.id

        // Lookup tenant_user record
        const tenantUser = await prisma.tenant_users.findFirst({
          where: {
            auth_user_id: authUserId,
            is_active: true,
            is_blocked: false,
            deleted_at: null,
          },
          include: {
            user_roles: {
              select: { role_id: true },
            },
          },
        })

        if (!tenantUser || !tenantUser.tenant_id) {
          return next(new Error('FORBIDDEN: User has no active tenant assignment'))
        }

        // Attach resolved identity to socket instance
        socket.data.user = {
          tenantUserId: tenantUser.id,
          authUserId,
          tenantId: tenantUser.tenant_id,
          email: tenantUser.email,
          branchId: tenantUser.branch_id,
          storeId: tenantUser.store_id,
          warehouseId: tenantUser.warehouse_id,
          roles: tenantUser.user_roles.map((r) => r.role_id),
        }

        next()
      } catch (err: any) {
        return next(new Error(`AUTHENTICATION_ERROR: ${err.message}`))
      }
    })

    // 3. Connection & Room Lifecycle Management
    io.on('connection', async (socket: Socket) => {
      const user = socket.data.user
      const tenantId = user.tenantId
      const tenantUserId = user.tenantUserId

      console.log(`[SocketServer] User connected: ${tenantUserId} (Tenant: ${tenantId})`)

      const joinedChannels: string[] = []

      // 3.1 Join Tenant-wide Broadcast Room
      const tenantAllRoom = RedisChannelStrategy.getTenantAllChannel(tenantId)
      socket.join(tenantAllRoom)
      joinedChannels.push(tenantAllRoom)

      // 3.2 Join User-specific Room
      const userRoom = RedisChannelStrategy.getUserChannel(tenantId, tenantUserId)
      socket.join(userRoom)
      joinedChannels.push(userRoom)

      // 3.3 Join Role-specific Rooms
      for (const roleId of user.roles || []) {
        const roleRoom = RedisChannelStrategy.getRoleChannel(tenantId, roleId)
        socket.join(roleRoom)
        joinedChannels.push(roleRoom)
      }

      // 3.4 Join Branch, Store, and Warehouse Rooms (if assigned)
      if (user.branchId) {
        const branchRoom = RedisChannelStrategy.getBranchChannel(tenantId, user.branchId)
        socket.join(branchRoom)
        joinedChannels.push(branchRoom)
      }
      if (user.storeId) {
        const storeRoom = RedisChannelStrategy.getStoreChannel(tenantId, user.storeId)
        socket.join(storeRoom)
        joinedChannels.push(storeRoom)
      }
      if (user.warehouseId) {
        const warehouseRoom = RedisChannelStrategy.getWarehouseChannel(tenantId, user.warehouseId)
        socket.join(warehouseRoom)
        joinedChannels.push(warehouseRoom)
      }

      // 3.5 Join Explicit Channel Memberships
      try {
        const channelMemberships = await prisma.notification_channel_members.findMany({
          where: {
            tenant_user_id: tenantUserId,
            is_active: true,
            is_muted: false,
          },
          select: { notification_channel_id: true },
        })

        for (const m of channelMemberships) {
          const chRoom = RedisChannelStrategy.getChannelChannel(tenantId, m.notification_channel_id)
          socket.join(chRoom)
          joinedChannels.push(chRoom)
        }
      } catch (err: any) {
        console.warn('[SocketServer] Error resolving channel memberships:', err.message)
      }

      // 3.6 Track active socket in Redis connection sets
      try {
        const client = getRedisClient()
        await client.sadd(RedisChannelStrategy.getTenantConnectionsKey(tenantId), socket.id)
        await client.sadd(RedisChannelStrategy.getUserConnectionsKey(tenantId, tenantUserId), socket.id)
      } catch {}

      // 3.7 Send Connection ACK with initial state
      const unreadCount = await NotificationService.getUnreadCount(tenantUserId, tenantId)
      socket.emit('connection:ack', {
        tenantId,
        userId: tenantUserId,
        unreadCount,
        channels: joinedChannels,
      })

      // 3.8 Offline Catchup / Replay
      try {
        const pendingDeliveries = await prisma.notification_recipients.findMany({
          where: {
            tenant_id: tenantId,
            tenant_user_id: tenantUserId,
            delivery_status: { in: ['pending', 'dispatched'] },
            is_deleted: false,
          },
          include: { notifications: true },
          orderBy: { created_at: 'desc' },
          take: 20,
        })

        if (pendingDeliveries.length > 0) {
          socket.emit('notification:batch', {
            notifications: pendingDeliveries,
          })
        }
      } catch (err: any) {
        console.warn('[SocketServer] Offline catchup error:', err.message)
      }

      // 4. Client Event Listeners
      socket.on('notification:ack', async (data: { notification_id: string }) => {
        try {
          if (!data?.notification_id) return
          await prisma.notification_recipients.updateMany({
            where: {
              notification_id: data.notification_id,
              tenant_user_id: tenantUserId,
              tenant_id: tenantId,
            },
            data: {
              delivery_status: 'delivered',
              delivered_at: new Date(),
            },
          })
        } catch (err: any) {
          console.warn('[SocketServer] ACK error:', err.message)
        }
      })

      socket.on('notification:read', async (data: { notification_id: string }) => {
        try {
          if (!data?.notification_id) return
          await NotificationService.markAsRead(data.notification_id, tenantUserId, tenantId)
          const updatedUnread = await NotificationService.getUnreadCount(tenantUserId, tenantId)
          socket.emit('notification:count_update', { unreadCount: updatedUnread })
        } catch (err: any) {
          console.warn('[SocketServer] Read error:', err.message)
        }
      })

      socket.on('notification:read_all', async () => {
        try {
          await NotificationService.markAllAsRead(tenantUserId, tenantId)
          socket.emit('notification:count_update', { unreadCount: 0 })
        } catch (err: any) {
          console.warn('[SocketServer] Read all error:', err.message)
        }
      })

      socket.on('notification:archive', async (data: { notification_id: string }) => {
        try {
          if (!data?.notification_id) return
          await NotificationService.archiveNotification(data.notification_id, tenantUserId, tenantId)
        } catch (err: any) {
          console.warn('[SocketServer] Archive error:', err.message)
        }
      })

      // 5. Disconnect Cleanup
      socket.on('disconnect', async () => {
        console.log(`[SocketServer] User disconnected: ${tenantUserId}`)
        try {
          const client = getRedisClient()
          await client.srem(RedisChannelStrategy.getTenantConnectionsKey(tenantId), socket.id)
          await client.srem(RedisChannelStrategy.getUserConnectionsKey(tenantId, tenantUserId), socket.id)
        } catch {}
      })
    })

    this.io = io
    return io
  }

  /**
   * Broadcasts a notification directly to a Socket.IO room.
   */
  static emitToRoom(room: string, event: string, payload: unknown) {
    if (this.io) {
      this.io.to(room).emit(event, payload)
    }
  }

  /**
   * Returns the initialized Socket.IO server instance.
   */
  static getIO(): SocketIOServer | null {
    return this.io
  }
}
