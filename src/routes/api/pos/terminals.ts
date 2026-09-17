import { createFileRoute } from '@tanstack/react-router'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import prisma from '@/lib/prisma'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import { z } from 'zod'

// ── GET: List terminals for tenant ──
const GET = withAuth(PERMISSIONS.POS_ACCESS, async ({ request, auth }) => {
  try {
    const tenantId = await requireTenantId(auth.userId)
    const url = new URL(request.url)
    const storeId = url.searchParams.get('storeId')

    const terminals = await runWithTenantContext({ tenantId, userId: auth.userId }, () =>
      prisma.pos_terminals.findMany({
        where: {
          tenant_id: tenantId,
          deleted_at: null,
          ...(storeId && { store_id: storeId }),
        },
        include: {
          pos_sessions: {
            where: { status: 'open' },
            take: 1,
            orderBy: { opened_at: 'desc' },
          },
          pos_terminal_users: {
            select: { user_id: true, is_active: true },
          },
        },
        orderBy: { name: 'asc' },
      })
    )

    return Response.json({
      success: true,
      data: terminals.map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        storeId: t.store_id,
        branchId: t.branch_id,
        warehouseId: t.warehouse_id,
        defaultPriceListId: t.default_price_list_id,
        status: t.status,
        hasActiveSession: t.pos_sessions.length > 0,
        activeSessionCashier: t.pos_sessions[0]?.cashier_id ?? null,
        assignedCashiers: t.pos_terminal_users
          .filter((u) => u.is_active)
          .map((u) => u.user_id),
      })),
    })
  } catch (error: unknown) {
    return handleRouteError(error, 'Failed to list terminals')
  }
})

// ── POST: Create/Update terminal, Assign cashiers ──
const createTerminalSchema = z.object({
  action: z.literal('create').default('create'),
  name: z.string().min(1),
  code: z.string().min(1),
  storeId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  defaultPriceListId: z.string().uuid().optional(),
  deviceIdentifier: z.string().optional(),
  receiptPrinterName: z.string().optional(),
})

const updateTerminalSchema = z.object({
  action: z.literal('update'),
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  storeId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  warehouseId: z.string().uuid().nullable().optional(),
  defaultPriceListId: z.string().uuid().nullable().optional(),
  deviceIdentifier: z.string().nullable().optional(),
  receiptPrinterName: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

const assignCashiersSchema = z.object({
  action: z.literal('assign-cashiers'),
  terminalId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).min(1),
})

const removeCashierSchema = z.object({
  action: z.literal('remove-cashier'),
  terminalId: z.string().uuid(),
  userId: z.string().uuid(),
})

const postSchema = z.discriminatedUnion('action', [
  createTerminalSchema,
  updateTerminalSchema,
  assignCashiersSchema,
  removeCashierSchema,
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
      if (data.action === 'create') {
        const terminal = await prisma.pos_terminals.create({
          data: {
            tenant_id: tenantId,
            name: data.name,
            code: data.code,
            store_id: data.storeId ?? null,
            branch_id: data.branchId ?? null,
            warehouse_id: data.warehouseId ?? null,
            default_price_list_id: data.defaultPriceListId ?? null,
            device_identifier: data.deviceIdentifier ?? null,
            receipt_printer_name: data.receiptPrinterName ?? null,
            status: 'active',
            created_by_user_id: tenantUserId,
            updated_by_user_id: tenantUserId,
          },
        })
        return Response.json({ success: true, data: terminal }, { status: 201 })
      }

      if (data.action === 'update') {
        const terminal = await prisma.pos_terminals.update({
          where: { id: data.id },
          data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.code !== undefined && { code: data.code }),
            ...(data.storeId !== undefined && { store_id: data.storeId }),
            ...(data.branchId !== undefined && { branch_id: data.branchId }),
            ...(data.warehouseId !== undefined && { warehouse_id: data.warehouseId }),
            ...(data.defaultPriceListId !== undefined && { default_price_list_id: data.defaultPriceListId }),
            ...(data.deviceIdentifier !== undefined && { device_identifier: data.deviceIdentifier }),
            ...(data.receiptPrinterName !== undefined && { receipt_printer_name: data.receiptPrinterName }),
            ...(data.status !== undefined && { status: data.status }),
            updated_by_user_id: tenantUserId,
          },
        })
        return Response.json({ success: true, data: terminal })
      }

      if (data.action === 'assign-cashiers') {
        const assignments = await Promise.all(
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
                is_active: true,
                created_by_user_id: tenantUserId,
                updated_by_user_id: tenantUserId,
              },
              update: {
                is_active: true,
                updated_by_user_id: tenantUserId,
              },
            })
          )
        )
        return Response.json({ success: true, data: assignments }, { status: 201 })
      }

      if (data.action === 'remove-cashier') {
        await prisma.pos_terminal_users.updateMany({
          where: {
            terminal_id: data.terminalId,
            user_id: data.userId,
            tenant_id: tenantId,
          },
          data: { is_active: false, updated_by_user_id: tenantUserId },
        })
        return Response.json({ success: true })
      }

      return Response.json({ success: false, error: { message: 'Unknown action' } }, { status: 400 })
    })
  } catch (error: unknown) {
    return handleRouteError(error, 'Terminal operation failed')
  }
})

export const Route = createFileRoute('/api/pos/terminals')({
  server: {
    handlers: { GET, POST },
  },
})
