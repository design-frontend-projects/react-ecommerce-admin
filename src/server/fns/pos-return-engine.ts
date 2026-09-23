'use server'

import prisma from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import type { payment_method_type_enum } from '@/generated/prisma/enums'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import { ApiError } from '@/server/utils/api-error'
import { createInventoryTransaction } from './inventory-transaction-engine'

// ============================================================================
// TYPES
// ============================================================================

export interface PosReturnLineItem {
  salesOrderItemId?: string
  productVariantId: string
  quantity: number | string
  unitPrice: number | string
  reason?: string
  restockToWarehouseId?: string
}

export interface PosReturnInput {
  originalOrderId: string
  sessionId: string
  terminalId: string
  warehouseId: string
  items: PosReturnLineItem[]
  refundMethod: payment_method_type_enum
  refundAmount?: number | string
  notes?: string
}

export interface PosReturnResult {
  returnOrderId: string
  returnOrderNumber: string
  refundAmount: string
  restockedItems: number
}

function toDecimal(val: number | string | Prisma.Decimal | null | undefined, d = 0): Prisma.Decimal {
  if (val === null || val === undefined) return new Prisma.Decimal(d)
  if (val instanceof Prisma.Decimal) return val
  return new Prisma.Decimal(val)
}

// ============================================================================
// POS RETURN ENGINE
// ============================================================================

/**
 * Looks up a sales order by order number or ID for returns.
 */
export async function lookupOrderForReturn(authUserId: string, orderIdOrNumber: string) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const order = await prisma.sales_orders.findFirst({
      where: {
        tenant_id: tenantId,
        OR: [
          { id: orderIdOrNumber },
          { order_number: orderIdOrNumber },
        ],
        status: 'completed',
      },
      include: {
        sales_order_payments: true,
      },
    })

    if (!order) {
      throw new ApiError('Order not found or not eligible for return.', 404)
    }

    // Load order items with existing return quantities
    const orderItems = await prisma.sales_order_items.findMany({
      where: { sales_order_id: order.id },
      include: {
        product_variants: {
          select: {
            id: true,
            sku: true,
            name: true,
            products: { select: { name: true } },
          },
        },
      },
    })

    // Check existing returns for these items
    const existingReturns = await prisma.sales_return_items.findMany({
      where: {
        tenant_id: tenantId,
        sales_invoice_item_id: { in: orderItems.map((oi) => oi.id) },
      },
    })

    const returnedQtyMap = new Map<string, Prisma.Decimal>()
    for (const ret of existingReturns) {
      const existing = returnedQtyMap.get(ret.sales_invoice_item_id ?? '') ?? new Prisma.Decimal(0)
      returnedQtyMap.set(ret.sales_invoice_item_id ?? '', existing.plus(ret.quantity))
    }

    return {
      order: {
        id: order.id,
        orderNumber: order.order_number,
        totalAmount: order.total_amount.toString(),
        orderDate: order.order_date,
        customerId: order.customer_id,
        paymentStatus: order.payment_status,
      },
      items: orderItems.map((oi) => {
        const alreadyReturned = returnedQtyMap.get(oi.id) ?? new Prisma.Decimal(0)
        const returnableQty = oi.qty_ordered.minus(alreadyReturned)

        return {
          id: oi.id,
          productVariantId: oi.product_variant_id,
          sku: oi.product_variants?.sku ?? null,
          productName: oi.product_variants?.products?.name ?? null,
          variantName: oi.product_variants?.name ?? null,
          qtyOrdered: oi.qty_ordered.toString(),
          qtyAlreadyReturned: alreadyReturned.toString(),
          qtyReturnable: returnableQty.toString(),
          unitPrice: oi.unit_price.toString(),
          lineTotal: oi.line_total.toString(),
        }
      }),
      payments: order.sales_order_payments.map((p) => ({
        method: p.payment_method,
        amount: p.amount.toString(),
      })),
    }
  })
}

/**
 * Processes a POS return/refund.
 *
 * 1. Validates original order and returnable quantities
 * 2. Creates a return sales order (negative amounts)
 * 3. Restocks inventory via central engine (SALE_RETURN)
 * 4. Records refund payment and cash movement
 */
export async function processPosReturn(
  authUserId: string,
  input: PosReturnInput
): Promise<PosReturnResult> {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    // 1. Validate session is open
    const session = await prisma.pos_sessions.findFirst({
      where: { id: input.sessionId, tenant_id: tenantId, status: 'open' },
    })
    if (!session) {
      throw new ApiError('POS session is not open.', 400)
    }

    // 2. Load original order
    const originalOrder = await prisma.sales_orders.findFirst({
      where: { id: input.originalOrderId, tenant_id: tenantId, status: 'completed' },
    })
    if (!originalOrder) {
      throw new ApiError('Original order not found or not eligible for return.', 404)
    }

    // 3. Validate return items
    if (!input.items || input.items.length === 0) {
      throw new ApiError('At least one return item is required.', 400)
    }

    const originalItems = await prisma.sales_order_items.findMany({
      where: { sales_order_id: originalOrder.id },
    })
    const originalItemMap = new Map(originalItems.map((oi) => [oi.product_variant_id, oi]))

    let totalRefund = new Prisma.Decimal(0)
    const validatedItems: Array<{
      productVariantId: string
      quantity: Prisma.Decimal
      unitPrice: Prisma.Decimal
      lineTotal: Prisma.Decimal
      reason: string
      warehouseId: string
    }> = []

    for (const item of input.items) {
      const qty = toDecimal(item.quantity)
      if (qty.lte(0)) {
        throw new ApiError('Return quantity must be greater than 0.', 400)
      }

      const origItem = originalItemMap.get(item.productVariantId)
      if (!origItem) {
        throw new ApiError(`Product variant ${item.productVariantId} was not in the original order.`, 400)
      }

      // Check returnable quantity
      const maxReturnable = origItem.qty_ordered.minus(origItem.cancelled_qty)
      if (qty.gt(maxReturnable)) {
        throw new ApiError(
          `Return quantity (${qty.toString()}) exceeds returnable quantity (${maxReturnable.toString()}) for variant ${item.productVariantId}.`,
          400
        )
      }

      // Calculate effective unit price accounting for item discounts paid
      const effectivePaidUnitPrice = origItem.qty_ordered.gt(0)
        ? origItem.line_total.dividedBy(origItem.qty_ordered)
        : origItem.unit_price
      const unitPrice = item.unitPrice ? toDecimal(item.unitPrice) : effectivePaidUnitPrice
      const lineTotal = qty.times(unitPrice)
      totalRefund = totalRefund.plus(lineTotal)

      validatedItems.push({
        productVariantId: item.productVariantId,
        quantity: qty,
        unitPrice,
        lineTotal,
        reason: item.reason ?? 'Customer return',
        warehouseId: item.restockToWarehouseId ?? input.warehouseId,
      })
    }

    // Use calculated refund or specified amount (for partial refunds)
    const refundAmount = input.refundAmount
      ? toDecimal(input.refundAmount)
      : totalRefund

    // 4. Create return order and restock inventory atomically
    const returnResult = await prisma.$transaction(async (tx) => {
      // 4a. Create return sales order
      const returnOrder = await tx.sales_orders.create({
        data: {
          tenant_id: tenantId,
          customer_id: originalOrder.customer_id,
          branch_id: originalOrder.branch_id,
          store_id: originalOrder.store_id,
          warehouse_id: input.warehouseId,
          channel_id: originalOrder.channel_id,
          pos_terminal_id: input.terminalId,
          pos_session_id: input.sessionId,
          status: 'completed',
          payment_status: 'refunded',
          subtotal: totalRefund.neg(),
          discount_amount: new Prisma.Decimal(0),
          tax_amount: new Prisma.Decimal(0),
          total_amount: refundAmount.neg(),
          notes: `Return for order ${originalOrder.order_number}. ${input.notes ?? ''}`.trim(),
          confirmed_by: tenantUserId,
          confirmed_at: new Date(),
          created_by: tenantUserId,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        },
      })

      // 4b. Create return order items
      await tx.sales_order_items.createMany({
        data: validatedItems.map((vi, idx) => ({
          tenant_id: tenantId,
          sales_order_id: returnOrder.id,
          product_variant_id: vi.productVariantId,
          line_no: idx + 1,
          qty_ordered: vi.quantity.neg(),
          unit_price: vi.unitPrice,
          line_total: vi.lineTotal.neg(),
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        })),
      })

      // 4c. Create refund payment record
      await tx.sales_order_payments.create({
        data: {
          tenant_id: tenantId,
          sales_order_id: returnOrder.id,
          session_id: input.sessionId,
          payment_method: input.refundMethod,
          amount: refundAmount.neg(),
          status: 'refunded',
          notes: `Refund for ${originalOrder.order_number}`,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        },
      })

      // 4d. Update original order payment status
      await tx.sales_orders.update({
        where: { id: originalOrder.id },
        data: {
          payment_status: 'refunded',
          updated_by_user_id: tenantUserId,
        },
      })

      // 4e. Cash movement for cash refunds
      if (input.refundMethod === 'cash') {
        await tx.pos_cash_movements.create({
          data: {
            tenant_id: tenantId,
            session_id: input.sessionId,
            type: 'out',
            reason: 'customer_refund',
            amount: refundAmount,
            reference_type: 'sales_order',
            reference_id: returnOrder.id,
            notes: `Refund: ${originalOrder.order_number}`,
            created_by_user_id: tenantUserId,
            updated_by_user_id: tenantUserId,
          },
        })

        // Update session expected_cash
        await tx.pos_sessions.update({
          where: { id: input.sessionId },
          data: {
            expected_cash: { decrement: refundAmount },
            updated_by_user_id: tenantUserId,
          },
        })
      }

      return returnOrder
    }, {
      maxWait: 10000,
      timeout: 30000,
    })

    // 5. Restock inventory via central engine (SALE_RETURN)
    try {
      await createInventoryTransaction(authUserId, {
        typeCode: 'SALE_RETURN',
        destWarehouseId: input.warehouseId,
        referenceType: 'sales_order',
        referenceId: returnResult.id,
        notes: `POS Return: ${returnResult.order_number} (Original: ${originalOrder.order_number})`,
        autoPost: true,
        items: validatedItems.map((vi) => ({
          productVariantId: vi.productVariantId,
          quantity: vi.quantity,
          destWarehouseId: vi.warehouseId,
        })),
      })
    } catch (invError) {
      console.error('[POS Return] Inventory restock failed:', invError)
    }

    return {
      returnOrderId: returnResult.id,
      returnOrderNumber: returnResult.order_number,
      refundAmount: refundAmount.toString(),
      restockedItems: validatedItems.length,
    }
  })
}
