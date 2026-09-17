'use server'

import prisma from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import type { payment_method_type_enum } from '@/generated/prisma/enums'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import { ApiError } from '@/server/utils/api-error'
import { createInventoryTransaction } from './inventory-transaction-engine'
import { resolvePosChannelId } from './pos-pricing-resolver'

// ============================================================================
// TYPES
// ============================================================================

export interface PosCheckoutLineItem {
  productVariantId: string
  sku?: string
  productName?: string
  variantName?: string
  quantity: number | string
  unitPrice: number | string
  unitCost?: number | string
  discountAmount?: number | string
  taxAmount?: number | string
  taxRateId?: string | null
  batchId?: string | null
}

export interface PosCheckoutPayment {
  method: payment_method_type_enum
  amount: number | string
  referenceNumber?: string
  notes?: string
}

export interface PosCheckoutInput {
  terminalId: string
  sessionId: string
  warehouseId: string
  storeId?: string
  branchId?: string
  customerId?: string | null
  priceListId?: string | null
  items: PosCheckoutLineItem[]
  payments: PosCheckoutPayment[]
  orderDiscountAmount?: number | string
  notes?: string
  idempotencyKey?: string
}

export interface PosCheckoutResult {
  orderId: string
  orderNumber: string
  invoiceId: string | null
  invoiceNo: string | null
  totalAmount: string
  payments: Array<{ method: string; amount: string }>
  cashChange: string
  isDuplicate: boolean
}

function toDecimal(val: number | string | Prisma.Decimal | null | undefined, d = 0): Prisma.Decimal {
  if (val === null || val === undefined) return new Prisma.Decimal(d)
  if (val instanceof Prisma.Decimal) return val
  return new Prisma.Decimal(val)
}

function generateInvoiceNo(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString()
  return `INV-${dateStr}-${randomSuffix}`
}

// ============================================================================
// POS CHECKOUT ENGINE
// ============================================================================

/**
 * Processes a complete POS sale transaction.
 *
 * 1. Validates session, terminal, and cashier authorization
 * 2. Validates item stock availability
 * 3. Validates payment totals match order total
 * 4. Creates sales_orders, sales_order_items, sales_order_payments
 * 5. Posts inventory transaction via central engine (SALE_POS)
 * 6. Creates sales_invoices for accounting
 * 7. Records cash movements for cash payments
 * 8. Handles idempotency
 */
export async function processPosSale(
  authUserId: string,
  input: PosCheckoutInput
): Promise<PosCheckoutResult> {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    // ── 1. Idempotency check ──
    if (input.idempotencyKey) {
      const existing = await prisma.sales_orders.findFirst({
        where: {
          tenant_id: tenantId,
          idempotency_key: input.idempotencyKey,
        },
        select: {
          id: true,
          order_number: true,
          total_amount: true,
          sales_invoice_id: true,
          sales_order_payments: true,
        },
      })
      if (existing) {
        return {
          orderId: existing.id,
          orderNumber: existing.order_number,
          invoiceId: existing.sales_invoice_id,
          invoiceNo: null,
          totalAmount: existing.total_amount.toString(),
          payments: existing.sales_order_payments.map((p) => ({
            method: p.payment_method,
            amount: p.amount.toString(),
          })),
          cashChange: '0',
          isDuplicate: true,
        }
      }
    }

    // ── 2. Validate session & terminal ──
    const session = await prisma.pos_sessions.findFirst({
      where: { id: input.sessionId, tenant_id: tenantId, status: 'open' },
    })
    if (!session) {
      throw new ApiError('POS session is not open or does not exist.', 400)
    }
    if (session.terminal_id !== input.terminalId) {
      throw new ApiError('Session does not belong to the specified terminal.', 400)
    }

    // Validate cashier owns the session
    if (session.cashier_id !== tenantUserId) {
      throw new ApiError('You are not the active cashier for this session.', 403)
    }

    // ── 3. Validate items ──
    if (!input.items || input.items.length === 0) {
      throw new ApiError('At least one item is required for checkout.', 400)
    }

    // ── 4. Validate stock availability ──
    const variantIds = [...new Set(input.items.map((i) => i.productVariantId))]
    const stockBalances = await prisma.stock_balances.findMany({
      where: {
        product_variant_id: { in: variantIds },
        warehouse_id: input.warehouseId,
        tenant_id: tenantId,
      },
    })
    const stockMap = new Map(stockBalances.map((sb) => [sb.product_variant_id, sb]))

    for (const item of input.items) {
      const qty = toDecimal(item.quantity)
      const balance = stockMap.get(item.productVariantId)
      const available = balance?.qty_available ?? new Prisma.Decimal(0)

      if (qty.gt(available)) {
        throw new ApiError(
          `Insufficient stock for ${item.productName ?? item.sku ?? item.productVariantId}: ` +
            `requested ${qty.toString()}, available ${available.toString()}.`,
          409
        )
      }
    }

    // ── 5. Calculate totals ──
    let subtotal = new Prisma.Decimal(0)
    let totalDiscount = toDecimal(input.orderDiscountAmount)
    let totalTax = new Prisma.Decimal(0)

    const lineItems = input.items.map((item, index) => {
      const qty = toDecimal(item.quantity)
      const price = toDecimal(item.unitPrice)
      const cost = toDecimal(item.unitCost)
      const lineDiscount = toDecimal(item.discountAmount)
      const lineTax = toDecimal(item.taxAmount)
      const lineTotal = qty.times(price).minus(lineDiscount)

      subtotal = subtotal.plus(qty.times(price))
      totalDiscount = totalDiscount.plus(lineDiscount)
      totalTax = totalTax.plus(lineTax)

      return {
        productVariantId: item.productVariantId,
        sku: item.sku,
        productName: item.productName,
        variantName: item.variantName,
        lineNo: index + 1,
        quantity: qty,
        unitPrice: price,
        unitCost: cost,
        discountAmount: lineDiscount,
        taxAmount: lineTax,
        lineTotal,
        taxRateId: item.taxRateId ?? null,
        batchId: item.batchId ?? null,
      }
    })

    const totalAmount = subtotal.minus(toDecimal(input.orderDiscountAmount)).plus(totalTax)

    // ── 6. Validate payments ──
    if (!input.payments || input.payments.length === 0) {
      throw new ApiError('At least one payment method is required.', 400)
    }

    let totalPayments = new Prisma.Decimal(0)
    let cashTendered = new Prisma.Decimal(0)

    for (const payment of input.payments) {
      const amt = toDecimal(payment.amount)
      if (amt.lte(0)) {
        throw new ApiError('Payment amounts must be greater than 0.', 400)
      }
      totalPayments = totalPayments.plus(amt)
      if (payment.method === 'cash') {
        cashTendered = cashTendered.plus(amt)
      }
    }

    // For cash-only: allow overpayment (change). For mixed/card: exact match required.
    const cashChange = totalPayments.minus(totalAmount)
    if (cashChange.lt(0)) {
      throw new ApiError(
        `Payment total (${totalPayments.toString()}) is less than order total (${totalAmount.toString()}).`,
        400
      )
    }

    // If there's change, it must be from cash payment
    if (cashChange.gt(0) && cashTendered.lte(0)) {
      throw new ApiError('Overpayment can only occur with a cash payment method.', 400)
    }

    // Resolve POS channel
    const posChannelId = await resolvePosChannelId(tenantId)

    // ── 7. Atomic Transaction: Create order, invoice, payments, inventory ──
    const result = await prisma.$transaction(async (tx) => {
      // 7a. Create sales_orders
      const order = await tx.sales_orders.create({
        data: {
          tenant_id: tenantId,
          customer_id: input.customerId ?? null,
          branch_id: input.branchId ?? null,
          store_id: input.storeId ?? null,
          warehouse_id: input.warehouseId,
          channel_id: posChannelId,
          pos_terminal_id: input.terminalId,
          pos_session_id: input.sessionId,
          status: 'completed',
          payment_status: 'completed',
          subtotal,
          discount_amount: toDecimal(input.orderDiscountAmount),
          tax_amount: totalTax,
          total_amount: totalAmount,
          idempotency_key: input.idempotencyKey ?? null,
          notes: input.notes ?? null,
          confirmed_by: tenantUserId,
          confirmed_at: new Date(),
          created_by: tenantUserId,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        },
      })

      // 7b. Create sales_order_items
      await tx.sales_order_items.createMany({
        data: lineItems.map((li) => ({
          tenant_id: tenantId,
          sales_order_id: order.id,
          product_variant_id: li.productVariantId,
          line_no: li.lineNo,
          qty_ordered: li.quantity,
          qty_fulfilled: li.quantity,
          unit_price: li.unitPrice,
          unit_cost: li.unitCost,
          discount_amount: li.discountAmount,
          tax_amount: li.taxAmount,
          line_total: li.lineTotal,
          tax_rate_id: li.taxRateId,
          batch_id: li.batchId,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        })),
      })

      // 7c. Create sales_order_payments
      const paymentRecords = await Promise.all(
        input.payments.map((p) =>
          tx.sales_order_payments.create({
            data: {
              tenant_id: tenantId,
              sales_order_id: order.id,
              session_id: input.sessionId,
              payment_method: p.method,
              amount: toDecimal(p.amount),
              status: 'completed',
              reference_number: p.referenceNumber ?? null,
              notes: p.notes ?? null,
              created_by_user_id: tenantUserId,
              updated_by_user_id: tenantUserId,
            },
          })
        )
      )

      // 7d. Create sales_invoices
      const invoiceNo = generateInvoiceNo()
      const invoice = await tx.sales_invoices.create({
        data: {
          tenant_id: tenantId,
          branch_id: input.branchId ?? '00000000-0000-0000-0000-000000000000',
          store_id: input.storeId ?? null,
          pos_terminal_id: input.terminalId,
          invoice_no: invoiceNo,
          invoice_date: new Date(),
          status: 'paid',
          subtotal,
          discount_amount: toDecimal(input.orderDiscountAmount),
          tax_amount: totalTax,
          total_amount: totalAmount,
          paid_amount: totalAmount,
          due_amount: new Prisma.Decimal(0),
          channel_id: posChannelId,
          customer_id: input.customerId ?? null,
          price_list_id: input.priceListId ?? null,
          posted_at: new Date(),
          created_by: tenantUserId,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        },
      })

      // Link invoice to order
      await tx.sales_orders.update({
        where: { id: order.id },
        data: { sales_invoice_id: invoice.id },
      })

      // 7e. Create sales_invoice_items
      await tx.sales_invoice_items.createMany({
        data: lineItems.map((li) => ({
          tenant_id: tenantId,
          sales_invoice_id: invoice.id,
          product_variant_id: li.productVariantId,
          quantity: li.quantity,
          unit_price: li.unitPrice,
          discount_amount: li.discountAmount,
          tax_amount: li.taxAmount,
          line_total: li.lineTotal,
          tax_rate_id: li.taxRateId,
          batch_id: li.batchId,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        })),
      })

      // 7f. Record cash movements for cash payments
      const cashPayments = input.payments.filter((p) => p.method === 'cash')
      if (cashPayments.length > 0) {
        // Only record the actual sale amount (not change)
        const cashSaleAmount = cashTendered.gt(totalAmount) ? totalAmount : cashTendered
        await tx.pos_cash_movements.create({
          data: {
            tenant_id: tenantId,
            session_id: input.sessionId,
            type: 'in',
            reason: 'sale',
            amount: cashSaleAmount,
            reference_type: 'sales_order',
            reference_id: order.id,
            notes: `Sale ${order.order_number}`,
            created_by_user_id: tenantUserId,
            updated_by_user_id: tenantUserId,
          },
        })

        // Update session expected_cash
        await tx.pos_sessions.update({
          where: { id: input.sessionId },
          data: {
            expected_cash: { increment: cashSaleAmount },
            updated_by_user_id: tenantUserId,
          },
        })
      }

      return { order, invoice, paymentRecords }
    })

    // ── 8. Post inventory deduction via central engine ──
    // This runs outside the main tx so that a partial failure doesn't rollback the order
    // The inventory engine has its own atomicity guarantees
    try {
      await createInventoryTransaction(authUserId, {
        typeCode: 'SALE_POS',
        sourceWarehouseId: input.warehouseId,
        sourceStoreId: input.storeId ?? null,
        referenceType: 'sales_order',
        referenceId: result.order.id,
        notes: `POS Sale: ${result.order.order_number}`,
        idempotencyKey: input.idempotencyKey
          ? `inv-sale-${input.idempotencyKey}`
          : undefined,
        autoPost: true,
        items: lineItems.map((li) => ({
          productVariantId: li.productVariantId,
          quantity: li.quantity,
          unitCost: li.unitCost,
          sourceWarehouseId: input.warehouseId,
          batchId: li.batchId,
          referenceItemType: 'sales_order_item',
        })),
      })
    } catch (invError) {
      // If inventory deduction fails, mark order with a warning but don't rollback
      // This prevents stock data inconsistency from blocking the sale
      console.error('[POS Checkout] Inventory deduction failed:', invError)
      await prisma.sales_orders.update({
        where: { id: result.order.id },
        data: {
          notes: `${result.order.notes ?? ''}\n[WARNING] Inventory deduction failed: ${invError instanceof Error ? invError.message : 'Unknown error'}`.trim(),
        },
      })
    }

    return {
      orderId: result.order.id,
      orderNumber: result.order.order_number,
      invoiceId: result.invoice.id,
      invoiceNo: result.invoice.invoice_no,
      totalAmount: totalAmount.toString(),
      payments: result.paymentRecords.map((p) => ({
        method: p.payment_method,
        amount: p.amount.toString(),
      })),
      cashChange: cashChange.toString(),
      isDuplicate: false,
    }
  })
}
