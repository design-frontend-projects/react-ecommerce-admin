import { createFileRoute } from '@tanstack/react-router'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import prisma from '@/lib/prisma'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import { z } from 'zod'
import { hashPin } from '@/server/fns/pos-pin'
import { logPosScreenEvent } from '@/server/fns/pos-screen-logger'

// ── GET: List terminal-user assignments with terminal and cashier details ──
const GET = withAuth(PERMISSIONS.POS_ACCESS, async ({ request, auth }) => {
  try {
    const tenantId = await requireTenantId(auth.userId)
    const url = new URL(request.url)
    const terminalId = url.searchParams.get('terminalId')
    const userId = url.searchParams.get('userId')
    const status = url.searchParams.get('status') // 'all' | 'active' | 'inactive'

    return await runWithTenantContext({ tenantId, userId: auth.userId }, async () => {
      // 1. Fetch assignments
      const assignments = await prisma.pos_terminal_users.findMany({
        where: {
          tenant_id: tenantId,
          ...(terminalId ? { terminal_id: terminalId } : {}),
          ...(userId ? { user_id: userId } : {}),
          ...(status === 'active' ? { is_active: true } : {}),
          ...(status === 'inactive' ? { is_active: false } : {}),
        },
        include: {
          terminal: {
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
              store_id: true,
              branch_id: true,
              warehouse_id: true,
            },
          },
        },
        orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }],
      })

      // 2. Fetch associated users for names/emails/roles and PIN status
      const userIds = [...new Set(assignments.map((a) => a.user_id))]
      const users = userIds.length > 0
        ? await prisma.tenant_users.findMany({
            where: {
              id: { in: userIds },
              tenant_id: tenantId,
            },
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone: true,
              avatar_url: true,
              default_role: true,
              is_active: true,
              pos_user_pins: {
                select: {
                  id: true,
                  is_active: true,
                  failed_attempts: true,
                  locked_until: true,
                },
              },
            },
          })
        : []

      const userMap = new Map(users.map((u) => [u.id, u]))

      // 3. Fetch all active terminals and users for selector options
      const [allTerminals, allTenantUsers] = await Promise.all([
        prisma.pos_terminals.findMany({
          where: {
            tenant_id: tenantId,
            deleted_at: null,
          },
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            store_id: true,
          },
          orderBy: { code: 'asc' },
        }),
        prisma.tenant_users.findMany({
          where: {
            tenant_id: tenantId,
            is_active: true,
          },
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            avatar_url: true,
            default_role: true,
            pos_user_pins: {
              select: {
                id: true,
                is_active: true,
                failed_attempts: true,
                locked_until: true,
              },
            },
          },
          orderBy: [{ first_name: 'asc' }, { email: 'asc' }],
        }),
      ])

      const now = new Date()

      const mappedAssignments = assignments.map((a) => {
        const u = userMap.get(a.user_id)
        const fullName = [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.email || 'Unknown Cashier'
        const pin = u?.pos_user_pins
        const isLocked = Boolean(pin?.locked_until && pin.locked_until > now)

        return {
          id: a.id,
          terminalId: a.terminal_id,
          terminalName: a.terminal.name,
          terminalCode: a.terminal.code,
          terminalStatus: a.terminal.status,
          storeId: a.terminal.store_id,
          userId: a.user_id,
          userName: fullName,
          userEmail: u?.email || '',
          userPhone: u?.phone || '',
          userRole: u?.default_role || 'cashier',
          avatarUrl: u?.avatar_url || null,
          userIsActive: u?.is_active ?? true,
          isActive: a.is_active,
          hasPin: Boolean(pin),
          isPinActive: pin?.is_active ?? false,
          isLocked,
          failedAttempts: pin?.failed_attempts ?? 0,
          createdAt: a.created_at.toISOString(),
          updatedAt: a.updated_at.toISOString(),
        }
      })

      return Response.json({
        success: true,
        data: {
          assignments: mappedAssignments,
          terminals: allTerminals,
          users: allTenantUsers.map((u) => ({
            id: u.id,
            name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || 'Cashier',
            email: u.email || '',
            role: u.default_role || 'cashier',
            avatarUrl: u.avatar_url,
            hasPin: Boolean(u.pos_user_pins),
            isPinActive: u.pos_user_pins?.is_active ?? false,
          })),
        },
      })
    })
  } catch (error: unknown) {
    return handleRouteError(error, 'Failed to fetch terminal users')
  }
})

// ── POST: Manage terminal user assignments (Assign with Mandatory PIN, Toggle Status, Remove) ──
const assignSchema = z.object({
  action: z.literal('assign'),
  terminalId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).min(1),
  pin: z.string().regex(/^\d{4,8}$/, 'PIN must be between 4 and 8 numeric digits'),
  isActive: z.boolean().optional().default(true),
})

const toggleStatusSchema = z.object({
  action: z.literal('toggle-status'),
  id: z.string().uuid(),
  isActive: z.boolean(),
})

const removeSchema = z.object({
  action: z.literal('remove'),
  id: z.string().uuid(),
})

const batchRemoveSchema = z.object({
  action: z.literal('batch-remove'),
  ids: z.array(z.string().uuid()).min(1),
})

const postSchema = z.discriminatedUnion('action', [
  assignSchema,
  toggleStatusSchema,
  removeSchema,
  batchRemoveSchema,
])

const POST = withAuth(PERMISSIONS.POS_TERMINALS_MANAGE, async ({ request, auth }) => {
  try {
    const tenantId = await requireTenantId(auth.userId)
    const tenantUserId = await resolveTenantUserId(auth.userId)
    const body = await request.json()
    const parsed = postSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { success: false, error: { code: 'INVALID_REQUEST', details: parsed.error.format() } },
        { status: 400 }
      )
    }

    const data = parsed.data

    return await runWithTenantContext({ tenantId, userId: auth.userId }, async () => {
      if (data.action === 'assign') {
        const hashedPin = await hashPin(data.pin)

        const results = await prisma.$transaction(async (tx) => {
          const assignments = []

          for (const targetUserId of data.userIds) {
            // 1. Upsert pos_terminal_users
            const assigned = await tx.pos_terminal_users.upsert({
              where: {
                terminal_id_user_id: {
                  terminal_id: data.terminalId,
                  user_id: targetUserId,
                },
              },
              create: {
                tenant_id: tenantId,
                terminal_id: data.terminalId,
                user_id: targetUserId,
                is_active: data.isActive,
                created_by_user_id: tenantUserId,
                updated_by_user_id: tenantUserId,
              },
              update: {
                is_active: data.isActive,
                updated_by_user_id: tenantUserId,
              },
            })
            assignments.push(assigned)

            // 2. Upsert pos_user_pins with full details from model
            await tx.pos_user_pins.upsert({
              where: {
                tenant_user_id: targetUserId,
              },
              create: {
                tenant_id: tenantId,
                tenant_user_id: targetUserId,
                pin_hash: hashedPin,
                is_active: true,
                failed_attempts: 0,
                locked_until: null,
              },
              update: {
                pin_hash: hashedPin,
                is_active: true,
                failed_attempts: 0,
                locked_until: null,
                updated_at: new Date(),
              },
            })

            // 3. Sync to legacy refund_pin_code in tenant_users
            await tx.tenant_users.update({
              where: { id: targetUserId },
              data: { refund_pin_code: hashedPin },
            })
          }

          return assignments
        })

        // Log assignment and PIN setup
        await logPosScreenEvent({
          tenantId,
          terminalId: data.terminalId,
          userId: tenantUserId,
          action: 'TERMINAL_USER_ASSIGNED',
          level: 'info',
          message: `Assigned ${data.userIds.length} user(s) to terminal with PIN configuration`,
          details: {
            assignedUserIds: data.userIds,
            terminalId: data.terminalId,
            isActive: data.isActive,
          },
        })

        return Response.json({ success: true, data: results }, { status: 201 })
      }

      if (data.action === 'toggle-status') {
        const result = await prisma.pos_terminal_users.updateMany({
          where: {
            id: data.id,
            tenant_id: tenantId,
          },
          data: {
            is_active: data.isActive,
            updated_by_user_id: tenantUserId,
          },
        })
        return Response.json({ success: true, count: result.count })
      }

      if (data.action === 'remove') {
        const result = await prisma.pos_terminal_users.deleteMany({
          where: {
            id: data.id,
            tenant_id: tenantId,
          },
        })

        await logPosScreenEvent({
          tenantId,
          userId: tenantUserId,
          action: 'TERMINAL_USER_REMOVED',
          level: 'warn',
          message: `Removed cashier terminal authorization (${data.id})`,
          details: { assignmentId: data.id },
        })

        return Response.json({ success: true, count: result.count })
      }

      if (data.action === 'batch-remove') {
        await prisma.pos_terminal_users.deleteMany({
          where: {
            id: { in: data.ids },
            tenant_id: tenantId,
          },
        })

        await logPosScreenEvent({
          tenantId,
          userId: tenantUserId,
          action: 'TERMINAL_USER_REMOVED',
          level: 'warn',
          message: `Batch removed ${data.ids.length} terminal cashier authorizations`,
          details: { assignmentIds: data.ids },
        })

        return Response.json({ success: true, count: data.ids.length })
      }

      return Response.json({ success: false, error: { message: 'Invalid action' } }, { status: 400 })
    })
  } catch (error: unknown) {
    return handleRouteError(error, 'Terminal user assignment operation failed')
  }
})

export const Route = createFileRoute('/api/pos/terminal-users')({
  server: {
    handlers: { GET, POST },
  },
})
