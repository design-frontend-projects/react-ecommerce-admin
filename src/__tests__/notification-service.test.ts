import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationService } from '@/server/services/notification.service'
import prisma from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  default: {
    tenant_users: {
      findMany: vi.fn(),
    },
    user_roles: {
      findMany: vi.fn(),
    },
    notification_channel_members: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    customers: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    suppliers: {
      update: vi.fn(),
    },
    roles: {
      findMany: vi.fn(),
    },
    notifications: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    notification_recipients: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    notification_publish_queue: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    notification_channels: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

describe('NotificationService Unit Tests', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001'
  const userId1 = '11111111-1111-1111-1111-111111111111'
  const userId2 = '22222222-2222-2222-2222-222222222222'
  const roleId = '33333333-3333-3333-3333-333333333333'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates notification with target ALL and fans out to all active tenant users', async () => {
    vi.mocked(prisma.tenant_users.findMany).mockResolvedValue([
      { id: userId1 } as any,
      { id: userId2 } as any,
    ])

    const createdNotif = {
      id: 'notif-1',
      tenant_id: tenantId,
      title: 'System Update',
      message: 'Maintenance tonight',
      type: 'system',
      severity: 'INFO',
      priority: 'normal',
      target_type: 'ALL',
      created_at: new Date(),
    }

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      const tx = {
        notifications: {
          create: vi.fn().mockResolvedValue(createdNotif),
        },
        notification_recipients: {
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
        notification_publish_queue: {
          create: vi.fn().mockResolvedValue({ id: 'q-1' }),
        },
      }
      return callback(tx)
    })

    const result = await NotificationService.createNotification({
      tenantId,
      title: 'System Update',
      message: 'Maintenance tonight',
      targetType: 'ALL',
    })

    expect(result.isDuplicate).toBe(false)
    expect(result.recipientCount).toBe(2)
    expect(result.notification.id).toBe('notif-1')
    expect(prisma.tenant_users.findMany).toHaveBeenCalledWith({
      where: {
        tenant_id: tenantId,
        is_active: true,
        is_blocked: false,
        deleted_at: null,
      },
      select: { id: true },
    })
  })

  it('honors idempotency keys and returns existing notification without duplicate insert', async () => {
    const existingNotif = {
      id: 'notif-existing',
      tenant_id: tenantId,
      title: 'Low Stock Alert',
      message: 'Item X low',
      idempotency_key: 'stock_low:item-x:2026-09-27',
      notification_recipients: [{ id: 'rec-1' }, { id: 'rec-2' }],
    }

    vi.mocked(prisma.notifications.findUnique).mockResolvedValue(existingNotif as any)

    const result = await NotificationService.createNotification({
      tenantId,
      title: 'Low Stock Alert',
      message: 'Item X low',
      targetType: 'ALL',
      idempotencyKey: 'stock_low:item-x:2026-09-27',
    })

    expect(result.isDuplicate).toBe(true)
    expect(result.notification.id).toBe('notif-existing')
    expect(result.recipientCount).toBe(2)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('fans out to specific role when targetType is ROLE', async () => {
    vi.mocked(prisma.user_roles.findMany).mockResolvedValue([
      { tenant_user_id: userId1 } as any,
    ])

    const createdNotif = {
      id: 'notif-role',
      tenant_id: tenantId,
      title: 'Purchase Order Approval Needed',
      message: 'PO #101 requires approval',
      target_type: 'ROLE',
      target_role_id: roleId,
      created_at: new Date(),
    }

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      const tx = {
        notifications: {
          create: vi.fn().mockResolvedValue(createdNotif),
        },
        notification_recipients: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        notification_publish_queue: {
          create: vi.fn().mockResolvedValue({ id: 'q-2' }),
        },
      }
      return callback(tx)
    })

    const result = await NotificationService.createNotification({
      tenantId,
      title: 'Purchase Order Approval Needed',
      message: 'PO #101 requires approval',
      targetType: 'ROLE',
      targetRoleId: roleId,
    })

    expect(result.isDuplicate).toBe(false)
    expect(result.recipientCount).toBe(1)
    expect(prisma.user_roles.findMany).toHaveBeenCalledWith({
      where: {
        role_id: roleId,
        tenant_users: {
          tenant_id: tenantId,
          is_active: true,
          is_blocked: false,
          deleted_at: null,
        },
      },
      select: { tenant_user_id: true },
    })
  })

  it('marks a notification as read for a specific recipient', async () => {
    vi.mocked(prisma.notification_recipients.updateMany).mockResolvedValue({ count: 1 })

    await NotificationService.markAsRead('notif-1', userId1, tenantId)

    expect(prisma.notification_recipients.updateMany).toHaveBeenCalledWith({
      where: {
        notification_id: 'notif-1',
        tenant_user_id: userId1,
        tenant_id: tenantId,
      },
      data: {
        is_read: true,
        read_at: expect.any(Date),
      },
    })
  })

  it('retrieves user notifications with correct pagination and counts', async () => {
    const mockItems = [
      {
        id: 'recip-1',
        notification_id: 'notif-1',
        is_read: false,
        notifications: { title: 'Test 1' },
      },
    ]

    vi.mocked(prisma.notification_recipients.findMany).mockResolvedValue(mockItems as any)
    vi.mocked(prisma.notification_recipients.count)
      .mockResolvedValueOnce(1) // total
      .mockResolvedValueOnce(1) // unreadCount

    const res = await NotificationService.getUserNotifications({
      tenantUserId: userId1,
      tenantId,
      page: 1,
      limit: 10,
    })

    expect(res.notifications).toHaveLength(1)
    expect(res.total).toBe(1)
    expect(res.unreadCount).toBe(1)
    expect(res.page).toBe(1)
  })

  it('auto-provisions tenant-wide and role-based notification channels', async () => {
    vi.mocked(prisma.roles.findMany).mockResolvedValue([
      { id: roleId, name: 'Admin' } as any,
    ])
    vi.mocked(prisma.notification_channels.upsert).mockResolvedValue({
      id: 'chan-1',
    } as any)

    const res = await NotificationService.autoProvisionTenantChannels(tenantId)

    expect(res.tenantWideChannel).toBeDefined()
    expect(res.roleChannels).toHaveLength(1)
    expect(prisma.notification_channels.upsert).toHaveBeenCalledTimes(2)
  })

  it('auto-assigns customer to an entity notification channel', async () => {
    const customerId = '44444444-4444-4444-4444-444444444444'
    vi.mocked(prisma.notification_channels.upsert).mockResolvedValue({
      id: 'chan-cust',
    } as any)
    vi.mocked(prisma.customers.update).mockResolvedValue({ id: customerId } as any)
    vi.mocked(prisma.notification_channel_members.upsert).mockResolvedValue({} as any)

    await NotificationService.autoAssignEntityChannel({
      tenantId,
      entityType: 'customer',
      entityId: customerId,
      name: 'Acme Corp',
    })

    expect(prisma.customers.update).toHaveBeenCalledWith({
      where: { id: customerId },
      data: { notification_channel_id: 'chan-cust' },
    })
    expect(prisma.notification_channel_members.upsert).toHaveBeenCalled()
  })
})
