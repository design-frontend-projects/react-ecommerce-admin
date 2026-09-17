import { createFileRoute } from '@tanstack/react-router'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { lookupOrderForReturn, processPosReturn } from '@/server/fns/pos-return-engine'
import { z } from 'zod'

// ── GET: Search for returnable orders ──
const GET = withAuth(PERMISSIONS.POS_REFUND, async ({ request, auth }) => {
  try {
    const url = new URL(request.url)
    const orderRef = url.searchParams.get('orderRef')

    if (!orderRef) {
      return Response.json(
        { success: false, error: { message: 'orderRef is required (order ID or number)' } },
        { status: 400 }
      )
    }

    const result = await lookupOrderForReturn(auth.userId, orderRef)
    return Response.json({ success: true, data: result })
  } catch (error: unknown) {
    return handleRouteError(error, 'Return lookup failed')
  }
})

// ── POST: Process return ──
const returnSchema = z.object({
  originalOrderId: z.string().uuid(),
  sessionId: z.string().uuid(),
  terminalId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  items: z
    .array(
      z.object({
        salesOrderItemId: z.string().uuid().optional(),
        productVariantId: z.string().uuid(),
        quantity: z.union([z.number().positive(), z.string()]),
        unitPrice: z.union([z.number().nonnegative(), z.string()]),
        reason: z.string().optional(),
        restockToWarehouseId: z.string().uuid().optional(),
      })
    )
    .min(1),
  refundMethod: z.enum(['cash', 'card', 'bank_transfer', 'wallet', 'cheque', 'mixed']),
  refundAmount: z.union([z.number().nonnegative(), z.string()]).optional(),
  notes: z.string().optional(),
})

const POST = withAuth(PERMISSIONS.POS_REFUND, async ({ request, auth }) => {
  try {
    const body = await request.json()
    const parsed = returnSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { success: false, error: { code: 'INVALID_REQUEST', details: parsed.error.format() } },
        { status: 400 }
      )
    }

    const result = await processPosReturn(auth.userId, parsed.data)
    return Response.json({ success: true, data: result }, { status: 201 })
  } catch (error: unknown) {
    return handleRouteError(error, 'Return processing failed')
  }
})

export const Route = createFileRoute('/api/pos/returns')({
  server: {
    handlers: { GET, POST },
  },
})
