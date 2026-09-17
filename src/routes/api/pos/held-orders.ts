import { createFileRoute } from '@tanstack/react-router'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import prisma from '@/lib/prisma'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import { z } from 'zod'

// ── GET: List held orders for session/terminal ──
const GET = withAuth(PERMISSIONS.POS_ACCESS, async ({ request, auth }) => {
  try {
    const tenantId = await requireTenantId(auth.userId)
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    const terminalId = url.searchParams.get('terminalId')

    return await runWithTenantContext({ tenantId, userId: auth.userId }, async () => {
      const heldOrders = await prisma.pos_held_orders.findMany({
        where: {
          tenant_id: tenantId,
          status: 'held',
          ...(sessionId && { session_id: sessionId }),
          ...(terminalId && { terminal_id: terminalId }),
        },
        orderBy: { created_at: 'desc' },
      })

      return Response.json({ success: true, data: heldOrders })
    })
  } catch (error: unknown) {
    return handleRouteError(error, 'Failed to list held orders')
  }
})

// ── POST: Hold order, Resume, Cancel ──
const holdSchema = z.object({
  action: z.literal('hold'),
  terminalId: z.string().uuid(),
  sessionId: z.string().uuid(),
  customerId: z.string().uuid().nullable().optional(),
  holdReference: z.string().min(1),
  cartData: z.any(),
  subtotal: z.union([z.number(), z.string()]).default(0),
  taxAmount: z.union([z.number(), z.string()]).default(0),
  discountAmount: z.union([z.number(), z.string()]).default(0),
  totalAmount: z.union([z.number(), z.string()]).default(0),
  notes: z.string().optional(),
})

const resumeSchema = z.object({
  action: z.literal('resume'),
  heldOrderId: z.string().uuid(),
})

const cancelSchema = z.object({
  action: z.literal('cancel'),
  heldOrderId: z.string().uuid(),
})

const postSchema = z.discriminatedUnion('action', [holdSchema, resumeSchema, cancelSchema])

const POST = withAuth(PERMISSIONS.POS_ACCESS, async ({ request, auth }) => {
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
      if (data.action === 'hold') {
        const heldOrder = await prisma.pos_held_orders.create({
          data: {
            tenant_id: tenantId,
            terminal_id: data.terminalId,
            session_id: data.sessionId,
            customer_id: data.customerId ?? null,
            hold_reference: data.holdReference,
            cart_data: data.cartData,
            subtotal: data.subtotal,
            tax_amount: data.taxAmount,
            discount_amount: data.discountAmount,
            total_amount: data.totalAmount,
            status: 'held',
            notes: data.notes ?? null,
            created_by_user_id: tenantUserId,
            updated_by_user_id: tenantUserId,
          },
        })
        return Response.json({ success: true, data: heldOrder }, { status: 201 })
      }

      if (data.action === 'resume') {
        const heldOrder = await prisma.pos_held_orders.update({
          where: { id: data.heldOrderId },
          data: { status: 'resumed', updated_by_user_id: tenantUserId },
        })
        return Response.json({ success: true, data: heldOrder })
      }

      if (data.action === 'cancel') {
        const heldOrder = await prisma.pos_held_orders.update({
          where: { id: data.heldOrderId },
          data: { status: 'cancelled', updated_by_user_id: tenantUserId },
        })
        return Response.json({ success: true, data: heldOrder })
      }

      return Response.json({ success: false, error: { message: 'Unknown action' } }, { status: 400 })
    })
  } catch (error: unknown) {
    return handleRouteError(error, 'Held order operation failed')
  }
})

export const Route = createFileRoute('/api/pos/held-orders')({
  server: {
    handlers: { GET, POST },
  },
})
