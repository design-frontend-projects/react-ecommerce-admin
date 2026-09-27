'use server'

import prisma from '@/lib/prisma'
import {
  type SendNotificationInput,
  type CreateTemplateInput,
} from '@/features/notifications/data/schema'
import { resolveTenantId, resolveTenantUserId, isValidUuid } from '@/server/utils/tenant'

/**
 * Fetch unread count and list of user notifications
 * Queries modern `notification_recipients` joined with `notifications`,
 * with seamless fallback to legacy `res_notifications`.
 */
export async function getUserNotifications(userId: string) {
  if (!userId || !isValidUuid(userId)) {
    return { notifications: [], unreadCount: 0 }
  }

  // Find user IDs to match (auth_user_id or tenant_user id)
  const tenantUser = await prisma.tenant_users.findFirst({
    where: {
      OR: [{ auth_user_id: userId }, { id: userId }],
    },
    select: { id: true, auth_user_id: true, tenant_id: true, parent_tenant_id: true },
  })

  const targetUserIds = [userId]
  if (tenantUser) {
    if (tenantUser.id && !targetUserIds.includes(tenantUser.id)) {
      targetUserIds.push(tenantUser.id)
    }
    if (tenantUser.auth_user_id && !targetUserIds.includes(tenantUser.auth_user_id)) {
      targetUserIds.push(tenantUser.auth_user_id)
    }
  }

  // 1. Query modern notification_recipients
  const recipients = await prisma.notification_recipients.findMany({
    where: {
      tenant_user_id: { in: targetUserIds },
    },
    include: {
      notifications: true,
    },
    orderBy: {
      created_at: 'desc',
    },
    take: 50,
  })

  const unreadCount = await prisma.notification_recipients.count({
    where: {
      tenant_user_id: { in: targetUserIds },
      is_read: false,
    },
  })

  if (recipients.length > 0) {
    const formatted = recipients.map((r) => ({
      id: r.id,
      notification_id: r.notification_id,
      user_id: r.tenant_user_id || userId,
      is_read: r.is_read,
      read_at: r.read_at ? r.read_at.toISOString() : null,
      created_at: r.created_at ? r.created_at.toISOString() : new Date().toISOString(),
      notifications: {
        id: r.notifications.id,
        title: r.notifications.title,
        content: r.notifications.message || '',
        severity: r.notifications.severity,
        target_type: r.notifications.target_type,
        target_role: r.notifications.target_role_id,
        sender_id: r.notifications.sender_user_id,
        template_id: r.notifications.template_id,
        is_active: r.notifications.is_active,
        created_at: r.notifications.created_at.toISOString(),
        updated_at: r.notifications.updated_at.toISOString(),
        action_url: r.notifications.action_url,
        action_label: r.notifications.action_label,
      },
    }))

    return {
      notifications: formatted,
      unreadCount,
    }
  }

  // 2. Legacy fallback if modern table has no rows
  const items = await prisma.res_notifications.findMany({
    where: {
      recipient_id: { in: targetUserIds },
    },
    orderBy: {
      created_at: 'desc',
    },
    take: 50,
  })

  const legacyUnreadCount = await prisma.res_notifications.count({
    where: {
      recipient_id: { in: targetUserIds },
      is_read: false,
    },
  })

  const formatted = items.map((item) => ({
    id: item.id,
    notification_id: item.id,
    user_id: item.recipient_id || userId,
    is_read: item.is_read ?? false,
    read_at: null,
    created_at: item.created_at ? item.created_at.toISOString() : new Date().toISOString(),
    notifications: {
      id: item.id,
      title: item.title,
      content: item.message || '',
      severity: (item.type?.toUpperCase() === 'WARNING' || item.type?.toUpperCase() === 'ERROR' || item.type?.toUpperCase() === 'SUCCESS' ? item.type.toUpperCase() : 'INFO') as any,
      target_type: 'USER' as const,
      target_role: null,
      sender_id: item.created_by_user_id,
      template_id: null,
      is_active: true,
      created_at: item.created_at ? item.created_at.toISOString() : new Date().toISOString(),
      updated_at: item.created_at ? item.created_at.toISOString() : new Date().toISOString(),
    },
  }))

  return {
    notifications: formatted,
    unreadCount: legacyUnreadCount,
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(userNotificationId: string) {
  try {
    const updated = await prisma.notification_recipients.updateMany({
      where: { id: userNotificationId },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    })
    if (updated.count > 0) {
      return updated
    }

    // Legacy fallback
    return await prisma.res_notifications.update({
      where: { id: userNotificationId },
      data: {
        is_read: true,
      },
    })
  } catch {
    return null
  }
}

/**
 * Mark all unread notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  if (!userId || !isValidUuid(userId)) {
    return { count: 0 }
  }
  const tenantUser = await prisma.tenant_users.findFirst({
    where: {
      OR: [{ auth_user_id: userId }, { id: userId }],
    },
    select: { id: true, auth_user_id: true, tenant_id: true },
  })

  const targetUserIds = [userId]
  if (tenantUser) {
    if (tenantUser.id && !targetUserIds.includes(tenantUser.id)) {
      targetUserIds.push(tenantUser.id)
    }
    if (tenantUser.auth_user_id && !targetUserIds.includes(tenantUser.auth_user_id)) {
      targetUserIds.push(tenantUser.auth_user_id)
    }
  }

  // Update modern notification_recipients
  const modernUpdate = await prisma.notification_recipients.updateMany({
    where: {
      tenant_user_id: { in: targetUserIds },
      is_read: false,
    },
    data: {
      is_read: true,
      read_at: new Date(),
    },
  })

  // Invalidate Redis unread count cache if tenant is known
  if (tenantUser?.tenant_id) {
    try {
      const { getRedisClient } = await import('@/server/redis/redis-client')
      const { RedisChannelStrategy } = await import('@/server/redis/channel-strategy')
      const client = getRedisClient()
      for (const uid of targetUserIds) {
        await client.del(RedisChannelStrategy.getUnreadCountKey(tenantUser.tenant_id, uid))
      }
    } catch {}
  }

  // Update legacy table
  await prisma.res_notifications.updateMany({
    where: {
      recipient_id: { in: targetUserIds },
      is_read: false,
    },
    data: {
      is_read: true,
    },
  }).catch(() => {})

  return modernUpdate
}

/**
 * Send notification to targeted employees (ALL, ROLE, or USER)
 * Routes through NotificationService with Redis Pub/Sub and transactional outbox.
 */
export async function sendNotification(
  input: SendNotificationInput,
  senderId?: string
) {
  let tenantId = senderId ? await resolveTenantId(senderId) : null
  const senderTenantUserId = senderId ? await resolveTenantUserId(senderId) : null

  if (!tenantId) {
    const firstTenant = await prisma.tenants.findFirst({ select: { id: true } })
    tenantId = firstTenant?.id ?? null
  }

  if (!tenantId) {
    throw new Error('Tenant context required.')
  }

  const { NotificationService } = await import('@/server/services/notification.service')

  const result = await NotificationService.createNotification({
    tenantId,
    title: input.title,
    message: input.message ?? input.content ?? '',
    type: 'admin_message',
    severity: input.severity || 'INFO',
    priority: 'normal',
    targetType: input.target_type,
    targetRoleId: input.target_role || null,
    targetUserId: input.target_user_ids?.[0] || null,
    senderType: 'admin',
    senderUserId: senderTenantUserId,
    metadata: {
      target_user_ids: input.target_user_ids,
      target_role: input.target_role,
    },
  })

  return {
    notification: {
      title: result.notification.title,
      content: result.notification.message,
      severity: result.notification.severity,
    },
    recipientsCount: result.recipientCount,
  }
}

/**
 * Get notification history log for admin dashboard
 */
export async function getSentNotificationsLog() {
  const items = await prisma.notifications.findMany({
    orderBy: {
      created_at: 'desc',
    },
    include: {
      notification_recipients: {
        take: 10,
        select: {
          id: true,
          is_read: true,
          read_at: true,
          tenant_user_id: true,
        },
      },
    },
    take: 100,
  })

  if (items.length > 0) {
    return items.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.message || '',
      severity: item.severity,
      created_at: item.created_at,
      user_notifications: item.notification_recipients.map((r) => ({
        id: r.id,
        is_read: r.is_read,
        read_at: r.read_at,
        user_id: r.tenant_user_id,
      })),
    }))
  }

  // Legacy fallback
  const legacyItems = await prisma.res_notifications.findMany({
    orderBy: {
      created_at: 'desc',
    },
    take: 100,
  })

  return legacyItems.map((item) => ({
    id: item.id,
    title: item.title,
    content: item.message || '',
    severity: (item.type?.toUpperCase() || 'INFO') as any,
    created_at: item.created_at,
    user_notifications: [
      {
        id: item.id,
        is_read: item.is_read ?? false,
        read_at: null,
        user_id: item.recipient_id || item.created_by_user_id,
      },
    ],
  }))
}

// In-memory templates fallback for notifications templates
const templatesStore: any[] = []

export async function getNotificationTemplates() {
  return templatesStore
}

export async function createNotificationTemplate(
  input: CreateTemplateInput,
  createdBy?: string
) {
  const template = {
    id: crypto.randomUUID(),
    name: input.name,
    header: input.header,
    content: input.content,
    severity: input.severity,
    created_by: createdBy ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  templatesStore.push(template)
  return template
}

export async function updateNotificationTemplate(
  id: string,
  input: Partial<CreateTemplateInput>
) {
  const index = templatesStore.findIndex((t) => t.id === id)
  if (index !== -1) {
    templatesStore[index] = {
      ...templatesStore[index],
      ...input,
      updated_at: new Date().toISOString(),
    }
    return templatesStore[index]
  }
  return null
}

export async function deleteNotificationTemplate(id: string) {
  const index = templatesStore.findIndex((t) => t.id === id)
  if (index !== -1) {
    templatesStore.splice(index, 1)
  }
  return { id }
}
