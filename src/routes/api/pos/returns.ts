import { createFileRoute } from '@tanstack/react-router'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { lookupOrderForReturn, processPosReturn } from '@/server/fns/pos-return-engine'
import {
  lookupInvoiceForRefund,
  getRefundableItems,
  createRefundRequest,
  executeRefund,
} from '@/server/fns/refund-engine'
import { z } from 'zod'

// ── GET: Search for returnable invoices or orders ──
const GET = withAuth(PERMISSIONS.POS_REFUND, async ({ request, auth }) => {
  try {
    const url = new URL(request.url)
    const orderRef = url.searchParams.get('orderRef') || url.searchParams.get('invoiceNo')

    if (!orderRef) {
      return Response.json(
        { success: false, error: { message: 'orderRef or invoiceNo is required' } },
        { status: 400 }
      )
    }

    // Try invoice lookup first
    const invoiceSearch = await lookupInvoiceForRefund(auth.userId, { invoiceNo: orderRef, pageSize: 5 })
    if (invoiceSearch.items.length > 0) {
      const firstInvoice = invoiceSearch.items[0]
      const refundableData = await getRefundableItems(auth.userId, firstInvoice.id)
      return Response.json({
        success: true,
        type: 'invoice',
        data: {
          invoice: firstInvoice,
          refundable: refundableData,
        },
      })
    }

    // Fallback to legacy sales orders
    const result = await lookupOrderForReturn(auth.userId, orderRef)
    return Response.json({ success: true, type: 'order', data: result })
  } catch (error: unknown) {
    return handleRouteError(error, 'Return lookup failed')
  }
})

// ── POST: Process return or invoice refund ──
const refundPostSchema = z.object({
  salesInvoiceId: z.string().uuid().optional(),
  originalOrderId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  terminalId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  items: z.array(
    z.object({
      salesInvoiceItemId: z.string().uuid().optional(),
      salesOrderItemId: z.string().uuid().optional(),
      productVariantId: z.string().uuid(),
      quantity: z.union([z.number().positive(), z.string()]),
      unitPrice: z.union([z.number().nonnegative(), z.string()]),
      reason: z.string().optional(),
      returnDisposition: z.enum(['resalable', 'damaged', 'defective', 'expired', 'quarantine', 'scrap']).optional(),
      restockToWarehouseId: z.string().uuid().optional(),
    })
  ).min(1),
  refundMethod: z.enum([
    'original_payment_method',
    'cash',
    'credit_card',
    'debit_card',
    'store_credit',
    'customer_wallet',
    'bank_transfer',
    'other',
    'cheque',
    'mixed',
  ]),
  refundAmount: z.union([z.number().nonnegative(), z.string()]).optional(),
  notes: z.string().optional(),
  reason: z.string().optional(),
  pin: z.string().optional(),
  managerPin: z.string().optional(),
  autoExecute: z.boolean().default(true),
})

const POST = withAuth(PERMISSIONS.POS_REFUND, async ({ request, auth }) => {
  try {
    const body = await request.json()
    const parsed = refundPostSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { success: false, error: { code: 'INVALID_REQUEST', details: parsed.error.format() } },
        { status: 400 }
      )
    }

    const data = parsed.data

    // If salesInvoiceId is present, execute via the new refund-engine
    if (data.salesInvoiceId) {
      const refundResult = await createRefundRequest(auth.userId, {
        salesInvoiceId: data.salesInvoiceId,
        posSessionId: data.sessionId,
        posTerminalId: data.terminalId,
        items: data.items.map((i) => ({
          salesInvoiceItemId: i.salesInvoiceItemId,
          productVariantId: i.productVariantId,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          returnDisposition: i.returnDisposition || 'resalable',
          reason: i.reason,
        })),
        refundMethod: (data.refundMethod === 'credit_card' || data.refundMethod === 'debit_card' || data.refundMethod === 'cash' || data.refundMethod === 'store_credit' || data.refundMethod === 'customer_wallet' || data.refundMethod === 'bank_transfer' || data.refundMethod === 'original_payment_method')
          ? data.refundMethod
          : 'cash',
        reason: data.reason || data.notes,
        notes: data.notes,
        pin: data.pin,
        managerPin: data.managerPin,
        inventoryReturnRequired: true,
      })

      // If approved or created and autoExecute is true, execute disbursement & restock immediately
      if (data.autoExecute && (refundResult.status === 'approved' || refundResult.status === 'requested')) {
        try {
          const executed = await executeRefund(auth.userId, {
            refundId: refundResult.id,
            managerPin: data.managerPin,
            restockWarehouseId: data.warehouseId,
          })
          return Response.json({ success: true, data: executed }, { status: 201 })
        } catch {
          // Return the created refund request if auto-execution needs separate step
          return Response.json({ success: true, data: refundResult }, { status: 201 })
        }
      }

      return Response.json({ success: true, data: refundResult }, { status: 201 })
    }

    // Otherwise, fallback to legacy sales order return processing
    if (data.originalOrderId && data.sessionId && data.terminalId && data.warehouseId) {
      const legacyResult = await processPosReturn(auth.userId, {
        originalOrderId: data.originalOrderId,
        sessionId: data.sessionId,
        terminalId: data.terminalId,
        warehouseId: data.warehouseId,
        items: data.items.map((i) => ({
          salesOrderItemId: i.salesOrderItemId,
          productVariantId: i.productVariantId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          reason: i.reason,
          restockToWarehouseId: i.restockToWarehouseId,
        })),
        refundMethod: (data.refundMethod as any),
        refundAmount: data.refundAmount,
        notes: data.notes,
      })
      return Response.json({ success: true, data: legacyResult }, { status: 201 })
    }

    return Response.json(
      { success: false, error: { message: 'Either salesInvoiceId or (originalOrderId, sessionId, terminalId, warehouseId) must be provided' } },
      { status: 400 }
    )
  } catch (error: unknown) {
    return handleRouteError(error, 'Return processing failed')
  }
})

export const Route = createFileRoute('/api/pos/returns')({
  server: {
    handlers: { GET, POST },
  },
})
