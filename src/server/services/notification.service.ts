import prisma from '@/lib/prisma'
import {
  type NotificationSeverity,
  type NotificationTargetType,
  type NotificationPriority,
  type NotificationType,
  type NotificationSenderType,
  type BusinessEventType,
} from '@/features/notifications/data/schema'

export interface CreateNotificationInput {
  tenantId: string
  title: string
  message: string
  type?: NotificationType
  severity?: NotificationSeverity
  priority?: NotificationPriority
  targetType: NotificationTargetType
  notificationChannelId?: string | null
  targetRoleId?: string | null
  targetUserId?: string | null
  targetCustomerId?: string | null
  targetSupplierId?: string | null
  targetBranchId?: string | null
  targetStoreId?: string | null
  targetWarehouseId?: string | null
  targetCustomerGroupId?: string | null
  senderType?: NotificationSenderType
  senderUserId?: string | null
  senderName?: string | null
  businessEventType?: BusinessEventType | null
  sourceEntityType?: string | null
  sourceEntityId?: string | null
  metadata?: Record<string, unknown>
  idempotencyKey?: string | null
  templateId?: string | null
  actionUrl?: string | null
  actionLabel?: string | null
  expiresAt?: Date | null
}

export interface RecipientResolution {
  userIds: string[]
  customerIds: string[]
  supplierIds: string[]
}

export class NotificationService {
  /**
   * Resolves recipient IDs based on the target type and scope.
   */
  private static async resolveRecipients(
    input: CreateNotificationInput
  ): Promise<RecipientResolution> {
    const { tenantId, targetType } = input
    const result: RecipientResolution = {
      userIds: [],
      customerIds: [],
      supplierIds: [],
    }

    switch (targetType) {
      case 'ALL': {
        const users = await prisma.tenant_users.findMany({
          where: {
            tenant_id: tenantId,
            is_active: true,
            is_blocked: false,
            deleted_at: null,
          },
          select: { id: true },
        })
        result.userIds = users.map((u) => u.id)
        break
      }

      case 'USER': {
        if (input.targetUserId) {
          result.userIds = [input.targetUserId]
        }
        break
      }

      case 'ROLE': {
        if (input.targetRoleId) {
          const isUuid =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              input.targetRoleId
            )
          if (isUuid) {
            const userRoles = await prisma.user_roles.findMany({
              where: {
                role_id: input.targetRoleId,
                tenant_users: {
                  tenant_id: tenantId,
                  is_active: true,
                  is_blocked: false,
                  deleted_at: null,
                },
              },
              select: { tenant_user_id: true },
            })
            result.userIds = userRoles.map((ur) => ur.tenant_user_id)
          } else {
            const matchedUsers = await prisma.tenant_users.findMany({
              where: {
                tenant_id: tenantId,
                is_active: true,
                is_blocked: false,
                deleted_at: null,
                OR: [
                  {
                    default_role: {
                      equals: input.targetRoleId,
                      mode: 'insensitive',
                    },
                  },
                  {
                    user_roles: {
                      some: {
                        roles: {
                          name: {
                            equals: input.targetRoleId,
                            mode: 'insensitive',
                          },
                        },
                      },
                    },
                  },
                ],
              },
              select: { id: true },
            })
            result.userIds = matchedUsers.map((u) => u.id)
          }
        }
        break
      }

      case 'CHANNEL': {
        if (input.notificationChannelId) {
          const members = await prisma.notification_channel_members.findMany({
            where: {
              notification_channel_id: input.notificationChannelId,
              is_active: true,
              is_muted: false,
            },
            select: {
              tenant_user_id: true,
              customer_id: true,
              supplier_id: true,
            },
          })
          for (const m of members) {
            if (m.tenant_user_id) result.userIds.push(m.tenant_user_id)
            if (m.customer_id) result.customerIds.push(m.customer_id)
            if (m.supplier_id) result.supplierIds.push(m.supplier_id)
          }
        }
        break
      }

      case 'DEPARTMENT': {
        if (input.targetBranchId) {
          const users = await prisma.tenant_users.findMany({
            where: {
              tenant_id: tenantId,
              branch_id: input.targetBranchId,
              is_active: true,
              is_blocked: false,
              deleted_at: null,
            },
            select: { id: true },
          })
          result.userIds = users.map((u) => u.id)
        }
        break
      }

      case 'STORE': {
        if (input.targetStoreId) {
          const users = await prisma.tenant_users.findMany({
            where: {
              tenant_id: tenantId,
              store_id: input.targetStoreId,
              is_active: true,
              is_blocked: false,
              deleted_at: null,
            },
            select: { id: true },
          })
          result.userIds = users.map((u) => u.id)
        }
        break
      }

      case 'WAREHOUSE': {
        if (input.targetWarehouseId) {
          const users = await prisma.tenant_users.findMany({
            where: {
              tenant_id: tenantId,
              warehouse_id: input.targetWarehouseId,
              is_active: true,
              is_blocked: false,
              deleted_at: null,
            },
            select: { id: true },
          })
          result.userIds = users.map((u) => u.id)
        }
        break
      }

      case 'CUSTOMER_GROUP': {
        if (input.targetCustomerGroupId) {
          const customers = await prisma.customers.findMany({
            where: {
              tenant_id: tenantId,
              group_id: input.targetCustomerGroupId,
              is_active: true,
              deleted_at: null,
            },
            select: { id: true },
          })
          result.customerIds = customers.map((c) => c.id)
        }
        break
      }

      case 'ENTITY': {
        if (input.targetCustomerId) {
          result.customerIds = [input.targetCustomerId]
        }
        if (input.targetSupplierId) {
          result.supplierIds = [input.targetSupplierId]
        }
        break
      }
    }

    return result
  }

  /**
   * Creates a notification with atomic fan-out to recipients and outbox queue insertion.
   * Guarantees idempotency if an idempotency key is supplied.
   */
  static async createNotification(input: CreateNotificationInput) {
    const { tenantId, idempotencyKey } = input

    // 1. Idempotency Check
    if (idempotencyKey) {
      const existing = await prisma.notifications.findUnique({
        where: {
          tenant_id_idempotency_key: {
            tenant_id: tenantId,
            idempotency_key: idempotencyKey,
          },
        },
        include: {
          notification_recipients: {
            take: 10,
          },
        },
      })
      if (existing) {
        return {
          notification: existing,
          recipientCount: existing.notification_recipients.length,
          isDuplicate: true,
        }
      }
    }

    // 2. Resolve Recipients
    const recipients = await this.resolveRecipients(input)

    const isTargetRoleUuid =
      input.targetRoleId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        input.targetRoleId
      )
    const sanitizedTargetRoleId = isTargetRoleUuid ? input.targetRoleId : null
    const mergedMetadata = {
      ...(input.metadata ?? {}),
      ...(!isTargetRoleUuid && input.targetRoleId
        ? { target_role: input.targetRoleId }
        : {}),
    }

    // 3. Atomically persist notification, recipients, and outbox queue entry
    const result = await prisma.$transaction(async (tx) => {
      // 3.1 Create master notification
      const notification = await tx.notifications.create({
        data: {
          tenant_id: tenantId,
          title: input.title,
          message: input.message,
          type: input.type ?? 'system',
          severity: input.severity ?? 'INFO',
          priority: input.priority ?? 'normal',
          target_type: input.targetType,
          notification_channel_id: input.notificationChannelId,
          target_role_id: sanitizedTargetRoleId,
          target_user_id: input.targetUserId,
          target_customer_id: input.targetCustomerId,
          target_supplier_id: input.targetSupplierId,
          target_branch_id: input.targetBranchId,
          target_store_id: input.targetStoreId,
          target_warehouse_id: input.targetWarehouseId,
          sender_type: input.senderType ?? 'system',
          sender_user_id: input.senderUserId,
          sender_name: input.senderName,
          business_event_type: input.businessEventType,
          source_entity_type: input.sourceEntityType,
          source_entity_id: input.sourceEntityId,
          metadata: mergedMetadata as any,
          idempotency_key: idempotencyKey,
          template_id: input.templateId,
          action_url: input.actionUrl,
          action_label: input.actionLabel,
          expires_at: input.expiresAt,
        },
      })

      // 3.2 Fan out to notification_recipients
      const recipientData: Array<{
        notification_id: string
        tenant_id: string
        tenant_user_id?: string
        customer_id?: string
        supplier_id?: string
        delivery_status: 'pending'
      }> = []

      for (const userId of recipients.userIds) {
        recipientData.push({
          notification_id: notification.id,
          tenant_id: tenantId,
          tenant_user_id: userId,
          delivery_status: 'pending',
        })
      }
      for (const customerId of recipients.customerIds) {
        recipientData.push({
          notification_id: notification.id,
          tenant_id: tenantId,
          customer_id: customerId,
          delivery_status: 'pending',
        })
      }
      for (const supplierId of recipients.supplierIds) {
        recipientData.push({
          notification_id: notification.id,
          tenant_id: tenantId,
          supplier_id: supplierId,
          delivery_status: 'pending',
        })
      }

      if (recipientData.length > 0) {
        await tx.notification_recipients.createMany({
          data: recipientData,
          skipDuplicates: true,
        })
      }

      // 3.3 Add to Transactional Outbox Queue for Redis/WebSocket dispatch
      const queuePayload = {
        notification_id: notification.id,
        tenant_id: tenantId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        severity: notification.severity,
        priority: notification.priority,
        target_type: notification.target_type,
        channel_id: notification.notification_channel_id,
        business_event_type: notification.business_event_type,
        action_url: notification.action_url,
        action_label: notification.action_label,
        recipient_user_ids: recipients.userIds,
        recipient_customer_ids: recipients.customerIds,
        recipient_supplier_ids: recipients.supplierIds,
        created_at: notification.created_at,
      }

      await tx.notification_publish_queue.create({
        data: {
          tenant_id: tenantId,
          notification_id: notification.id,
          payload: queuePayload as any,
          status: 'pending',
          attempts: 0,
        },
      })

      return {
        notification,
        recipientCount: recipientData.length,
        isDuplicate: false,
      }
    })

    // 4. Immediate best-effort publish via Redis Pub/Sub
    try {
      const { NotificationPublisher } =
        await import('../redis/notification-publisher')
      await NotificationPublisher.publish({
        v: 1,
        id: result.notification.id,
        tenant_id: tenantId,
        channel_id: result.notification.notification_channel_id,
        type: result.notification.type,
        severity: result.notification.severity,
        priority: result.notification.priority,
        target_type: result.notification.target_type,
        title: result.notification.title,
        message: result.notification.message,
        action: {
          url: result.notification.action_url,
          label: result.notification.action_label,
        },
        metadata: (result.notification.metadata as any) ?? {},
        idempotency_key: result.notification.idempotency_key,
        created_at: result.notification.created_at.toISOString(),
        recipient_user_ids: recipients.userIds,
      })

      // Mark outbox row as dispatched
      await prisma.notification_publish_queue.updateMany({
        where: {
          notification_id: result.notification.id,
          status: 'pending',
        },
        data: {
          status: 'dispatched',
          processed_at: new Date(),
        },
      })
    } catch (err: any) {
      console.warn(
        '[NotificationService] Immediate publish deferred to outbox worker:',
        err?.message
      )
    }

    return result
  }

  /**
   * Fetches paginated notifications for a tenant user with read/archive filters.
   */
  static async getUserNotifications(params: {
    tenantUserId: string
    tenantId: string
    isRead?: boolean
    isArchived?: boolean
    page?: number
    limit?: number
  }) {
    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(100, Math.max(1, params.limit ?? 20))
    const skip = (page - 1) * limit

    const where: any = {
      tenant_id: params.tenantId,
      tenant_user_id: params.tenantUserId,
      is_deleted: false,
    }

    if (params.isRead !== undefined) {
      where.is_read = params.isRead
    }
    if (params.isArchived !== undefined) {
      where.is_archived = params.isArchived
    } else {
      where.is_archived = false
    }

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification_recipients.findMany({
        where,
        include: {
          notifications: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.notification_recipients.count({ where }),
      prisma.notification_recipients.count({
        where: {
          tenant_id: params.tenantId,
          tenant_user_id: params.tenantUserId,
          is_read: false,
          is_deleted: false,
        },
      }),
    ])

    return {
      notifications: items,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * Returns unread notifications count for a given user.
   */
  static async getUnreadCount(
    tenantUserId: string,
    tenantId: string
  ): Promise<number> {
    return prisma.notification_recipients.count({
      where: {
        tenant_id: tenantId,
        tenant_user_id: tenantUserId,
        is_read: false,
        is_deleted: false,
      },
    })
  }

  /**
   * Marks a specific notification as read for a recipient.
   */
  static async markAsRead(
    notificationId: string,
    tenantUserId: string,
    tenantId: string
  ) {
    const updated = await prisma.notification_recipients.updateMany({
      where: {
        notification_id: notificationId,
        tenant_user_id: tenantUserId,
        tenant_id: tenantId,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    })

    try {
      const { NotificationPublisher } =
        await import('../redis/notification-publisher')
      await NotificationPublisher.invalidateUnreadCount(tenantId, tenantUserId)
    } catch {}

    return updated
  }

  /**
   * Marks all notifications as read for a tenant user.
   */
  static async markAllAsRead(tenantUserId: string, tenantId: string) {
    const updated = await prisma.notification_recipients.updateMany({
      where: {
        tenant_user_id: tenantUserId,
        tenant_id: tenantId,
        is_read: false,
        is_deleted: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    })

    try {
      const { NotificationPublisher } =
        await import('../redis/notification-publisher')
      await NotificationPublisher.setCachedUnreadCount(
        tenantId,
        tenantUserId,
        0
      )
    } catch {
      console.error('an error goes here!')
    }

    return updated
  }

  /**
   * Archives a notification for a tenant user.
   */
  static async archiveNotification(
    notificationId: string,
    tenantUserId: string,
    tenantId: string
  ) {
    return prisma.notification_recipients.updateMany({
      where: {
        notification_id: notificationId,
        tenant_user_id: tenantUserId,
        tenant_id: tenantId,
      },
      data: {
        is_archived: true,
        archived_at: new Date(),
      },
    })
  }

  /**
   * Soft deletes a notification from the recipient's inbox.
   */
  static async deleteNotificationForUser(
    notificationId: string,
    tenantUserId: string,
    tenantId: string
  ) {
    return prisma.notification_recipients.updateMany({
      where: {
        notification_id: notificationId,
        tenant_user_id: tenantUserId,
        tenant_id: tenantId,
      },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
    })
  }

  /**
   * Auto-provisions default system channels for a tenant (e.g. on tenant creation or onboarding).
   */
  static async autoProvisionTenantChannels(tenantId: string) {
    // 1. Tenant-wide broadcast channel
    const tenantWideChannel = await prisma.notification_channels.upsert({
      where: {
        tenant_id_code: {
          tenant_id: tenantId,
          code: 'tenant:all',
        },
      },
      create: {
        tenant_id: tenantId,
        code: 'tenant:all',
        name: 'Tenant Announcements',
        description: 'Broadcast notifications for all tenant members',
        channel_type: 'tenant_wide',
        is_active: true,
        is_system: true,
      },
      update: {},
    })

    // 2. Role-based channels
    const roles = await prisma.roles.findMany({
      where: { is_active: true },
      select: { id: true, name: true },
    })

    const roleChannels = []
    for (const role of roles) {
      const roleCode = `role:${role.name.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`
      const ch = await prisma.notification_channels.upsert({
        where: {
          tenant_id_code: {
            tenant_id: tenantId,
            code: roleCode,
          },
        },
        create: {
          tenant_id: tenantId,
          code: roleCode,
          name: `Role: ${role.name}`,
          description: `Targeted notifications for members with role ${role.name}`,
          channel_type: 'role_based',
          target_role_id: role.id,
          is_active: true,
          is_system: true,
        },
        update: {},
      })
      roleChannels.push(ch)
    }

    return {
      tenantWideChannel,
      roleChannels,
    }
  }

  /**
   * Automatically assigns a new entity (customer, supplier, or user) to their notification channel.
   */
  static async autoAssignEntityChannel(params: {
    tenantId: string
    entityType: 'customer' | 'supplier' | 'user'
    entityId: string
    name?: string
  }) {
    const { tenantId, entityType, entityId, name } = params

    if (entityType === 'customer') {
      const code = `customer:${entityId}`
      const channel = await prisma.notification_channels.upsert({
        where: {
          tenant_id_code: {
            tenant_id: tenantId,
            code,
          },
        },
        create: {
          tenant_id: tenantId,
          code,
          name: name ? `Customer: ${name}` : `Customer Channel`,
          channel_type: 'entity_based',
          is_active: true,
          is_system: true,
        },
        update: {},
      })

      // Update customer table with notification_channel_id
      await prisma.customers.update({
        where: { id: entityId },
        data: { notification_channel_id: channel.id },
      })

      // Add membership
      await prisma.notification_channel_members.upsert({
        where: {
          notification_channel_id_customer_id: {
            notification_channel_id: channel.id,
            customer_id: entityId,
          },
        },
        create: {
          notification_channel_id: channel.id,
          tenant_id: tenantId,
          customer_id: entityId,
          is_active: true,
        },
        update: { is_active: true },
      })

      return channel
    }

    if (entityType === 'supplier') {
      const code = `supplier:${entityId}`
      const channel = await prisma.notification_channels.upsert({
        where: {
          tenant_id_code: {
            tenant_id: tenantId,
            code,
          },
        },
        create: {
          tenant_id: tenantId,
          code,
          name: name ? `Supplier: ${name}` : `Supplier Channel`,
          channel_type: 'entity_based',
          is_active: true,
          is_system: true,
        },
        update: {},
      })

      // Update supplier table with notification_channel_id
      await prisma.suppliers.update({
        where: { id: entityId },
        data: { notification_channel_id: channel.id },
      })

      // Add membership
      await prisma.notification_channel_members.upsert({
        where: {
          notification_channel_id_supplier_id: {
            notification_channel_id: channel.id,
            supplier_id: entityId,
          },
        },
        create: {
          notification_channel_id: channel.id,
          tenant_id: tenantId,
          supplier_id: entityId,
          is_active: true,
        },
        update: { is_active: true },
      })

      return channel
    }

    if (entityType === 'user') {
      // Ensure user is added to tenant-wide channel
      const tenantWide = await prisma.notification_channels.findUnique({
        where: {
          tenant_id_code: {
            tenant_id: tenantId,
            code: 'tenant:all',
          },
        },
      })

      if (tenantWide) {
        await prisma.notification_channel_members.upsert({
          where: {
            notification_channel_id_tenant_user_id: {
              notification_channel_id: tenantWide.id,
              tenant_user_id: entityId,
            },
          },
          create: {
            notification_channel_id: tenantWide.id,
            tenant_id: tenantId,
            tenant_user_id: entityId,
            is_active: true,
          },
          update: { is_active: true },
        })
      }
    }
  }
}
