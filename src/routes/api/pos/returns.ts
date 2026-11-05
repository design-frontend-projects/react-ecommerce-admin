import { createFileRoute } from '@tanstack/react-router'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { lookupOrderForReturn, processPosReturn } from '@/server/fns/pos-return-engine'
import {
  lookupInvoiceForRefund,
  getRefundableItems,
  createRefundRequest,
  submitRefund,
  approveRefund,
  rejectRefund,
  executeRefund,
  cancelRefund,
  getRefundById,
  listRefunds,
  type ListRefundsFilters,
} from '@/server/fns/refund-engine'
import { z } from 'zod'

// ── GET: Search for returnable invoices, items, lists, or legacy orders ──
const GET = withAuth(PERMISSIONS.POS_REFUND, async ({ request, auth }) => {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action === 'refundable-items') {
      const invoiceId = url.searchParams.get('invoiceId')
      if (!invoiceId) {
        return Response.json(
          { success: false, error: { message: 'invoiceId is required' } },
          { status: 400 }
        )
      }
      const data = await getRefundableItems(auth.userId, invoiceId)
      return Response.json({ success: true, data })
    }

    if (action === 'detail') {
      const refundId = url.searchParams.get('refundId') || url.searchParams.get('id')
      if (!refundId) {
        return Response.json(
          { success: false, error: { message: 'refundId is required' } },
          { status: 400 }
        )
      }
      const data = await getRefundById(auth.userId, refundId)
      return Response.json({ success: true, data })
    }

    if (action === 'list') {
      const filters: ListRefundsFilters = {
        status: (url.searchParams.get('status') as any) || undefined,
        salesInvoiceId: url.searchParams.get('salesInvoiceId') || undefined,
        storeId: url.searchParams.get('storeId') || undefined,
        branchId: url.searchParams.get('branchId') || undefined,
        customerId: url.searchParams.get('customerId') || undefined,
        dateFrom: url.searchParams.get('dateFrom') || undefined,
        dateTo: url.searchParams.get('dateTo') || undefined,
        search: url.searchParams.get('search') || undefined,
        page: url.searchParams.get('page') ? Number(url.searchParams.get('page')) : undefined,
        pageSize: url.searchParams.get('pageSize') ? Number(url.searchParams.get('pageSize')) : undefined,
      }
      const data = await listRefunds(auth.userId, filters)
      return Response.json({ success: true, data })
    }

    if (action === 'search-invoices') {
      const params = {
        invoiceNo: url.searchParams.get('invoiceNo') || undefined,
        customerId: url.searchParams.get('customerId') || undefined,
        storeId: url.searchParams.get('storeId') || undefined,
        dateFrom: url.searchParams.get('dateFrom') || undefined,
        dateTo: url.searchParams.get('dateTo') || undefined,
        page: url.searchParams.get('page') ? Number(url.searchParams.get('page')) : undefined,
        pageSize: url.searchParams.get('pageSize') ? Number(url.searchParams.get('pageSize')) : undefined,
      }
      const data = await lookupInvoiceForRefund(auth.userId, params)
      return Response.json({ success: true, data })
    }

    // Default: lookup by orderRef or invoiceNo
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

// ── POST: Process return, lifecycle action, or invoice refund ──
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

    // 1. Lifecycle actions
    if (body.action === 'submit') {
      if (!body.refundId) {
        return Response.json({ success: false, error: { message: 'refundId is required' } }, { status: 400 })
      }
      const result = await submitRefund(auth.userId, body.refundId)
      return Response.json({ success: true, data: result })
    }

    if (body.action === 'approve') {
      if (!body.refundId) {
        return Response.json({ success: false, error: { message: 'refundId is required' } }, { status: 400 })
      }
      const result = await approveRefund(auth.userId, {
        refundId: body.refundId,
        notes: body.notes,
        managerPin: body.managerPin,
        managerTenantUserId: body.managerTenantUserId,
      })
      return Response.json({ success: true, data: result })
    }

    if (body.action === 'reject') {
      if (!body.refundId || !body.reason) {
        return Response.json({ success: false, error: { message: 'refundId and reason are required' } }, { status: 400 })
      }
      const result = await rejectRefund(auth.userId, {
        refundId: body.refundId,
        reason: body.reason,
        managerPin: body.managerPin,
        managerTenantUserId: body.managerTenantUserId,
      })
      return Response.json({ success: true, data: result })
    }

    if (body.action === 'execute') {
      if (!body.refundId) {
        return Response.json({ success: false, error: { message: 'refundId is required' } }, { status: 400 })
      }
      const result = await executeRefund(auth.userId, {
        refundId: body.refundId,
        managerPin: body.managerPin,
        managerTenantUserId: body.managerTenantUserId,
        restockWarehouseId: body.restockWarehouseId,
        paymentReference: body.paymentReference,
      })
      return Response.json({ success: true, data: result })
    }

    if (body.action === 'cancel') {
      if (!body.refundId || !body.reason) {
        return Response.json({ success: false, error: { message: 'refundId and reason are required' } }, { status: 400 })
      }
      const result = await cancelRefund(auth.userId, {
        refundId: body.refundId,
        reason: body.reason,
      })
      return Response.json({ success: true, data: result })
    }

    // 2. Direct creation via CreateRefundInput
    if (body.action === 'create' || (body.salesInvoiceId && body.items?.[0]?.refundQuantity !== undefined)) {
      const result = await createRefundRequest(auth.userId, {
        salesInvoiceId: body.salesInvoiceId,
        items: body.items,
        refundMethod: body.refundMethod || 'cash',
        refundReference: body.refundReference,
        reason: body.reason,
        notes: body.notes,
        pin: body.pin,
        managerPin: body.managerPin,
        managerTenantUserId: body.managerTenantUserId,
        inventoryReturnRequired: body.inventoryReturnRequired ?? true,
        idempotencyKey: body.idempotencyKey,
      })
      return Response.json({ success: true, data: result }, { status: 201 })
    }

    // 3. Fallback: refundPostSchema validation
    const parsed = refundPostSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { success: false, error: { code: 'INVALID_REQUEST', details: parsed.error.format() } },
        { status: 400 }
      )
    }

    const data = parsed.data

    // If salesInvoiceId is present, execute via the refund-engine
    if (data.salesInvoiceId) {
      const refundResult = await createRefundRequest(auth.userId, {
        salesInvoiceId: data.salesInvoiceId,
        posSessionId: data.sessionId,
        posTerminalId: data.terminalId,
        items: data.items.map((i) => ({
          salesInvoiceItemId: i.salesInvoiceItemId!,
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
