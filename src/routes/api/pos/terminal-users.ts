import { createFileRoute } from '@tanstack/react-router'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import prisma from '@/lib/prisma'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import { z } from 'zod'

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

      // 2. Fetch associated users for names/emails/roles
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
          },
          orderBy: [{ first_name: 'asc' }, { email: 'asc' }],
        }),
      ])

      const mappedAssignments = assignments.map((a) => {
        const u = userMap.get(a.user_id)
        const fullName = [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.email || 'Unknown Cashier'

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
          })),
        },
      })
    })
  } catch (error: unknown) {
    return handleRouteError(error, 'Failed to fetch terminal users')
  }
})

// ── POST: Manage terminal user assignments (Assign, Toggle Status, Remove) ──
const assignSchema = z.object({
  action: z.literal('assign'),
  terminalId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).min(1),
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
        const results = await Promise.all(
          data.userIds.map((userId) =>
            prisma.pos_terminal_users.upsert({
              where: {
                terminal_id_user_id: {
                  terminal_id: data.terminalId,
                  user_id: userId,
                },
              },
              create: {
                tenant_id: tenantId,
                terminal_id: data.terminalId,
                user_id: userId,
                is_active: data.isActive,
                created_by_user_id: tenantUserId,
                updated_by_user_id: tenantUserId,
              },
              update: {
                is_active: data.isActive,
                updated_by_user_id: tenantUserId,
              },
            })
          )
        )
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
        return Response.json({ success: true, count: result.count })
      }

      if (data.action === 'batch-remove') {
        await prisma.pos_terminal_users.deleteMany({
          where: {
            id: { in: data.ids },
            tenant_id: tenantId,
          },
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
