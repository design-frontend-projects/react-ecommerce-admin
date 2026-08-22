'use server'

import prisma from '@/lib/prisma'
import {
  type SendNotificationInput,
  type CreateTemplateInput,
} from '@/features/notifications/data/schema'
import { resolveTenantId, resolveTenantUserId } from '@/server/utils/tenant'

/**
 * Fetch unread count and list of user notifications
 */
export async function getUserNotifications(userId: string) {
  if (!userId) {
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

  const items = await prisma.res_notifications.findMany({
    where: {
      recipient_id: { in: targetUserIds },
    },
    orderBy: {
      created_at: 'desc',
    },
    take: 50,
  })

  const unreadCount = await prisma.res_notifications.count({
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
    unreadCount,
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(userNotificationId: string) {
  try {
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
  const tenantUser = await prisma.tenant_users.findFirst({
    where: {
      OR: [{ auth_user_id: userId }, { id: userId }],
    },
    select: { id: true, auth_user_id: true },
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

  return await prisma.res_notifications.updateMany({
    where: {
      recipient_id: { in: targetUserIds },
      is_read: false,
    },
    data: {
      is_read: true,
    },
  })
}

/**
 * Send notification to targeted employees (ALL, ROLE, or USER)
 */
export async function sendNotification(
  input: SendNotificationInput,
  senderId?: string
) {
  let targetUserIds: string[] = []
  let tenantId = senderId ? await resolveTenantId(senderId) : null
  const senderTenantUserId = senderId ? await resolveTenantUserId(senderId) : null

  if (!tenantId) {
    const firstTenant = await prisma.tenants.findFirst({ select: { id: true } })
    tenantId = firstTenant?.id ?? null
  }

  if (input.target_type === 'ALL') {
    const allUsers = await prisma.tenant_users.findMany({
      where: {
        is_active: true,
        ...(tenantId ? { OR: [{ tenant_id: tenantId }, { parent_tenant_id: tenantId }] } : {}),
      },
      select: { id: true, auth_user_id: true },
    })
    targetUserIds = allUsers
      .map((u) => u.id || u.auth_user_id)
      .filter((id): id is string => Boolean(id))
  } else if (input.target_type === 'ROLE' && input.target_role) {
    const matchedUsers = await prisma.tenant_users.findMany({
      where: {
        is_active: true,
        ...(tenantId ? { OR: [{ tenant_id: tenantId }, { parent_tenant_id: tenantId }] } : {}),
        OR: [
          { default_role: input.target_role },
          {
            user_roles: {
              some: {
                roles: {
                  name: {
                    equals: input.target_role,
                    mode: 'insensitive',
                  },
                },
              },
            },
          },
        ],
      },
      select: { id: true, auth_user_id: true },
    })
    targetUserIds = matchedUsers
      .map((u) => u.id || u.auth_user_id)
      .filter((id): id is string => Boolean(id))
  } else if (input.target_type === 'USER' && input.target_user_ids) {
    targetUserIds = input.target_user_ids
  }

  targetUserIds = Array.from(new Set(targetUserIds))
  if (targetUserIds.length === 0 && senderId) {
    targetUserIds = [senderId]
  }

  if (targetUserIds.length > 0 && tenantId) {
    await prisma.res_notifications.createMany({
      data: targetUserIds.map((uId) => ({
        tenant_id: tenantId!,
        recipient_id: uId,
        type: input.severity ? input.severity.toLowerCase() : 'info',
        title: input.title,
        message: input.content,
        is_read: false,
        created_by_user_id: senderTenantUserId,
        updated_by_user_id: senderTenantUserId,
      })),
    })
  }

  return {
    notification: {
      title: input.title,
      content: input.content,
      severity: input.severity,
    },
    recipientsCount: targetUserIds.length,
  }
}

/**
 * Get notification history log for admin dashboard
 */
export async function getSentNotificationsLog() {
  const items = await prisma.res_notifications.findMany({
    orderBy: {
      created_at: 'desc',
    },
    take: 100,
  })

  return items.map((item) => ({
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
