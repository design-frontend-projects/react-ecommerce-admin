'use server'

import prisma from '@/lib/prisma'
import {
  type SendNotificationInput,
  type CreateTemplateInput,
  notificationSeverityEnum,
} from '@/features/notifications/data/schema'

/**
 * Fetch unread count and list of user notifications
 */
export async function getUserNotifications(userId: string) {
  if (!userId) {
    return { notifications: [], unreadCount: 0 }
  }

  // First check if userId is auth_user_id or tenant_user id
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

  const items = await prisma.user_notifications.findMany({
    where: {
      user_id: { in: targetUserIds },
    },
    include: {
      notifications: true,
    },
    orderBy: {
      created_at: 'desc',
    },
    take: 50,
  })

  const unreadCount = await prisma.user_notifications.count({
    where: {
      user_id: { in: targetUserIds },
      is_read: false,
    },
  })

  return {
    notifications: items,
    unreadCount,
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(userNotificationId: string) {
  return await prisma.user_notifications.update({
    where: { id: userNotificationId },
    data: {
      is_read: true,
      read_at: new Date(),
    },
  })
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

  return await prisma.user_notifications.updateMany({
    where: {
      user_id: { in: targetUserIds },
      is_read: false,
    },
    data: {
      is_read: true,
      read_at: new Date(),
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
  // 1. Create master notification
  const notification = await prisma.notifications.create({
    data: {
      title: input.title,
      content: input.content,
      severity: input.severity,
      target_type: input.target_type,
      target_role: input.target_role ?? null,
      sender_id: senderId ?? null,
      template_id: input.template_id ?? null,
    },
  })

  // 2. Identify target user IDs
  let targetUserIds: string[] = []

  if (input.target_type === 'ALL') {
    const allUsers = await prisma.tenant_users.findMany({
      where: { is_active: true },
      select: { id: true, auth_user_id: true },
    })
    targetUserIds = allUsers
      .map((u) => u.auth_user_id || u.id)
      .filter((id): id is string => Boolean(id))
  } else if (input.target_type === 'ROLE' && input.target_role) {
    // Find users with this role
    const matchedUsers = await prisma.tenant_users.findMany({
      where: {
        is_active: true,
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
      .map((u) => u.auth_user_id || u.id)
      .filter((id): id is string => Boolean(id))
  } else if (input.target_type === 'USER' && input.target_user_ids) {
    targetUserIds = input.target_user_ids
  }

  // Deduplicate targetUserIds
  targetUserIds = Array.from(new Set(targetUserIds))

  // 3. Create user_notifications entries
  if (targetUserIds.length > 0) {
    await prisma.user_notifications.createMany({
      data: targetUserIds.map((uId) => ({
        notification_id: notification.id,
        user_id: uId,
        is_read: false,
      })),
    })
  }

  return {
    notification,
    recipientsCount: targetUserIds.length,
  }
}

/**
 * Get notification history log for admin dashboard
 */
export async function getSentNotificationsLog() {
  return await prisma.notifications.findMany({
    include: {
      user_notifications: {
        select: {
          id: true,
          is_read: true,
          read_at: true,
          user_id: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
    take: 100,
  })
}

/**
 * Notification Templates CRUD
 */
export async function getNotificationTemplates() {
  return await prisma.notification_templates.findMany({
    orderBy: {
      updated_at: 'desc',
    },
  })
}

export async function createNotificationTemplate(
  input: CreateTemplateInput,
  createdBy?: string
) {
  return await prisma.notification_templates.create({
    data: {
      name: input.name,
      header: input.header,
      content: input.content,
      severity: input.severity,
      created_by: createdBy ?? null,
    },
  })
}

export async function updateNotificationTemplate(
  id: string,
  input: Partial<CreateTemplateInput>
) {
  return await prisma.notification_templates.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.header && { header: input.header }),
      ...(input.content && { content: input.content }),
      ...(input.severity && { severity: input.severity }),
      updated_at: new Date(),
    },
  })
}

export async function deleteNotificationTemplate(id: string) {
  return await prisma.notification_templates.delete({
    where: { id },
  })
}
