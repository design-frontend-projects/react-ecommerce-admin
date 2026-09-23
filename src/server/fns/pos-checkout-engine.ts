'use server'

import prisma from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import type {
  payment_method_type_enum,
  inv_discount_source_enum,
  discount_type_enum,
} from '@/generated/prisma/enums'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import { ApiError } from '@/server/utils/api-error'
import { createInventoryTransaction } from './inventory-transaction-engine'
import { resolvePosChannelId } from './pos-pricing-resolver'
import { generateInvoiceNumber } from './sales-invoice-engine'

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
  promotionId?: string | null
  promotionRuleId?: string | null
  couponId?: string | null
  discountType?: 'percentage' | 'fixed' | null
  discountRate?: number | string | null
}

export interface PosCheckoutPayment {
  method: payment_method_type_enum
  amount: number | string
  referenceNumber?: string
  notes?: string
}

export interface PosCheckoutShipment {
  recipientName?: string
  recipientPhone?: string
  deliveryAddress?: string
  city?: string
  state?: string
  postalCode?: string
  carrier?: string
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
  couponCode?: string | null
  appliedCouponId?: string | null
  appliedPromotionIds?: string[]
  notes?: string
  idempotencyKey?: string
  isShipment?: boolean
  shipment?: PosCheckoutShipment
}

export interface PosCheckoutResult {
  orderId: string
  orderNumber: string
  invoiceId: string | null
  invoiceNo: string | null
  invoiceNumber?: string | null
  totalAmount: string
  payments: Array<{ method: string; amount: string }>
  cashChange: string
  isDuplicate: boolean
  shipmentId?: string | null
}

function toDecimal(val: number | string | Prisma.Decimal | null | undefined, d = 0): Prisma.Decimal {
  if (val === null || val === undefined) return new Prisma.Decimal(d)
  if (val instanceof Prisma.Decimal) return val
  return new Prisma.Decimal(val)
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
        OR: [
          { store_id: input.storeId ?? null },
          { store_id: null },
        ],
      },
    })
    // Pick the best balance per variant (highest qty_available)
    const stockMap = new Map<string, (typeof stockBalances)[number]>()
    for (const sb of stockBalances) {
      const existing = stockMap.get(sb.product_variant_id)
      if (!existing || (sb.qty_available ?? sb.qty_on_hand).gt(existing.qty_available ?? existing.qty_on_hand)) {
        stockMap.set(sb.product_variant_id, sb)
      }
    }

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
    const round2 = (val: Prisma.Decimal) =>
      val.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)

    let subtotal = new Prisma.Decimal(0)
    let totalDiscount = round2(toDecimal(input.orderDiscountAmount))
    let totalTax = new Prisma.Decimal(0)

    const lineItems = input.items.map((item, index) => {
      const qty = toDecimal(item.quantity)
      const price = round2(toDecimal(item.unitPrice))
      const cost = round2(toDecimal(item.unitCost))
      const lineDiscount = round2(toDecimal(item.discountAmount))
      const lineTax = round2(toDecimal(item.taxAmount))
      const lineTotal = round2(qty.times(price).minus(lineDiscount))

      subtotal = round2(subtotal.plus(qty.times(price)))
      totalDiscount = round2(totalDiscount.plus(lineDiscount))
      totalTax = round2(totalTax.plus(lineTax))

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

    const totalAmount = round2(
      subtotal.minus(round2(toDecimal(input.orderDiscountAmount))).plus(totalTax)
    )

    // ── 6. Validate payments ──
    if (!input.payments || input.payments.length === 0) {
      throw new ApiError('At least one payment method is required.', 400)
    }

    let totalPayments = new Prisma.Decimal(0)
    let cashTendered = new Prisma.Decimal(0)

    for (const payment of input.payments) {
      const amt = round2(toDecimal(payment.amount))
      if (amt.lte(0)) {
        throw new ApiError('Payment amounts must be greater than 0.', 400)
      }
      totalPayments = round2(totalPayments.plus(amt))
      if (payment.method === 'cash') {
        cashTendered = round2(cashTendered.plus(amt))
      }
    }

    // For cash-only: allow overpayment (change). For mixed/card: exact match required.
    let cashChange = round2(totalPayments.minus(totalAmount))
    if (cashChange.lt(new Prisma.Decimal('-0.01'))) {
      throw new ApiError(
        `Payment total (${totalPayments.toFixed(2)}) is less than order total (${totalAmount.toFixed(2)}).`,
        400
      )
    }
    if (cashChange.lt(0)) {
      cashChange = new Prisma.Decimal(0)
    }

    // If there's change, it must be from cash payment
    if (cashChange.gt(0) && cashTendered.lte(0)) {
      throw new ApiError('Overpayment can only occur with a cash payment method.', 400)
    }

    // Resolve POS channel
    const posChannelId = await resolvePosChannelId(tenantId)

    // Pre-generate invoice number and IDs to minimize round trips inside transaction
    const invoiceNo = await generateInvoiceNumber(tenantId, input.storeId, 'INV')
    const orderId = crypto.randomUUID()
    const invoiceId = crypto.randomUUID()

    // ── 7. Atomic Transaction: Create order, invoice, payments, inventory ──
    const result = await prisma.$transaction(async (tx) => {
      // 7a. Create sales_orders
      const order = await tx.sales_orders.create({
        data: {
          id: orderId,
          sales_invoice_id: invoiceId,
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
          sales_order_id: orderId,
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
      const orderPaymentsData = input.payments.map((p) => ({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        sales_order_id: orderId,
        session_id: input.sessionId,
        payment_method: p.method,
        amount: toDecimal(p.amount),
        status: 'completed' as const,
        reference_number: p.referenceNumber ?? null,
        notes: p.notes ?? null,
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      }))

      await tx.sales_order_payments.createMany({
        data: orderPaymentsData,
      })

      // 7d. Create sales_invoices
      const invoice = await tx.sales_invoices.create({
        data: {
          id: invoiceId,
          tenant_id: tenantId,
          branch_id: input.branchId ?? '00000000-0000-0000-0000-000000000000',
          store_id: input.storeId ?? null,
          warehouse_id: input.warehouseId,
          pos_terminal_id: input.terminalId,
          invoice_no: invoiceNo,
          invoice_type: 'sale',
          source_type: 'POS',
          source_id: orderId,
          invoice_date: new Date(),
          status: 'paid',
          payment_status: 'paid',
          subtotal,
          discount_amount: toDecimal(input.orderDiscountAmount),
          tax_amount: totalTax,
          shipping_amount: new Prisma.Decimal(0),
          rounding_amount: new Prisma.Decimal(0),
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

      // 7d-1. Create shipment if requested
      let shipmentRecord = null
      if (input.isShipment && input.shipment) {
        const serializedNotes = JSON.stringify({
          recipientName: input.shipment.recipientName,
          recipientPhone: input.shipment.recipientPhone,
          deliveryAddress: input.shipment.deliveryAddress,
          city: input.shipment.city,
          state: input.shipment.state,
          postalCode: input.shipment.postalCode,
          notes: input.shipment.notes,
        })

        shipmentRecord = await tx.shipments.create({
          data: {
            tenant_id: tenantId,
            sales_invoice_id: invoiceId,
            order_id: orderId,
            carrier: input.shipment.carrier || null,
            status: 'prepared',
            notes: serializedNotes,
            created_by_user_id: tenantUserId,
            updated_by_user_id: tenantUserId,
          },
        })
      }

      // 7e. Create sales_invoice_items
      const invoiceItemsData = lineItems.map((li, idx) => {
        const rawInputItem = input.items[idx]
        return {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          invoice_id: invoiceId,
          line_no: idx + 1,
          product_variant_id: li.productVariantId,
          sku_snapshot: rawInputItem?.sku ?? null,
          product_name_snapshot: rawInputItem?.productName ?? null,
          variant_name_snapshot: rawInputItem?.variantName ?? null,
          quantity: li.quantity,
          unit_price: li.unitPrice,
          unit_cost: toDecimal(li.unitCost, 0),
          gross_amount: li.quantity.times(li.unitPrice),
          discount_amount: li.discountAmount,
          tax_amount: li.taxAmount,
          tax_rate_id: li.taxRateId,
          tax_rate: new Prisma.Decimal(0),
          net_amount: li.quantity.times(li.unitPrice).minus(li.discountAmount),
          line_subtotal: li.lineSubtotal,
          line_total: li.lineTotal,
          warehouse_id: input.warehouseId,
          batch_id: li.batchId,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        }
      })

      await tx.sales_invoice_items.createMany({
        data: invoiceItemsData,
      })

      // 7e-1. Create sales_invoice_payments
      const invoicePaymentsData = orderPaymentsData.map((p) => ({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        invoice_id: invoiceId,
        payment_method: p.payment_method,
        amount: p.amount,
        currency: 'USD',
        status: 'completed' as const,
        reference_number: p.reference_number,
        notes: p.notes,
        sales_order_payment_id: p.id,
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      }))

      await tx.sales_invoice_payments.createMany({
        data: invoicePaymentsData,
      })

      // 7e-2. Record item-level discounts
      const itemDiscountsData: any[] = []
      for (let i = 0; i < lineItems.length; i++) {
        const li = lineItems[i]
        const invItem = invoiceItemsData[i]
        const rawInputItem = input.items[i]
        if (li.discountAmount.gt(0)) {
          const discountSource = rawInputItem?.couponId
            ? 'coupon'
            : rawInputItem?.promotionId
            ? 'promotion'
            : 'manual'
          const discountType = rawInputItem?.discountType === 'fixed' ? 'fixed' : 'percentage'
          const finalUnitPrice = li.lineTotal.dividedBy(li.quantity)

          itemDiscountsData.push({
            tenant_id: tenantId,
            sales_invoice_item_id: invItem.id,
            sales_invoice_id: invoiceId,
            promotion_id: rawInputItem?.promotionId ?? null,
            promotion_rule_id: rawInputItem?.promotionRuleId ?? null,
            coupon_id: rawInputItem?.couponId ?? null,
            discount_source: discountSource as inv_discount_source_enum,
            discount_type: discountType as discount_type_enum,
            discount_rate: rawInputItem?.discountRate ? toDecimal(rawInputItem.discountRate) : null,
            discount_amount: li.discountAmount,
            original_unit_price: li.unitPrice,
            final_unit_price: finalUnitPrice,
            quantity: li.quantity,
          })
        }
      }

      if (itemDiscountsData.length > 0) {
        await tx.inv_sales_invoice_item_discounts.createMany({
          data: itemDiscountsData,
        })
      }

      // 7e-3. Record Coupon Redemption if coupon was supplied
      let appliedCouponRecord: { id: string; promotion_id: string; code: string } | null = null
      if (input.couponCode && input.couponCode.trim()) {
        appliedCouponRecord = await tx.inv_coupons.findFirst({
          where: {
            tenant_id: tenantId,
            code: { equals: input.couponCode.trim(), mode: 'insensitive' },
          },
          select: { id: true, promotion_id: true, code: true },
        })

        if (appliedCouponRecord) {
          await tx.inv_coupon_redemptions.create({
            data: {
              tenant_id: tenantId,
              coupon_id: appliedCouponRecord.id,
              promotion_id: appliedCouponRecord.promotion_id,
              customer_id: input.customerId ?? null,
              sales_invoice_id: invoiceId,
              sales_order_id: orderId,
              discount_amount: toDecimal(input.orderDiscountAmount),
              created_by_user_id: tenantUserId,
            },
          })

          await tx.inv_coupons.update({
            where: { id: appliedCouponRecord.id },
            data: { current_usages: { increment: 1 } },
          })
        }
      }

      // 7e-4. Record Invoice-Level Discounts & Promotion Usage Logs
      const orderDiscountDec = toDecimal(input.orderDiscountAmount)
      if (orderDiscountDec.gt(0)) {
        const promoId = appliedCouponRecord?.promotion_id ?? input.appliedPromotionIds?.[0] ?? null
        const discountSource = appliedCouponRecord ? 'coupon' : promoId ? 'promotion' : 'manual'

        await tx.inv_sales_invoice_discounts.create({
          data: {
            tenant_id: tenantId,
            sales_invoice_id: invoiceId,
            promotion_id: promoId,
            coupon_id: appliedCouponRecord?.id ?? null,
            discount_source: discountSource as inv_discount_source_enum,
            discount_type: 'fixed',
            discount_amount: orderDiscountDec,
            reason: appliedCouponRecord ? `Coupon: ${appliedCouponRecord.code}` : promoId ? 'Automated Promotion' : 'Cashier Manual Discount',
            applied_by_user_id: tenantUserId,
          },
        })

        if (promoId) {
          await tx.inv_promotion_usage_logs.create({
            data: {
              tenant_id: tenantId,
              promotion_id: promoId,
              sales_invoice_id: invoiceId,
              sales_order_id: orderId,
              customer_id: input.customerId ?? null,
              discount_amount: orderDiscountDec,
              channel_id: posChannelId,
              store_id: input.storeId ?? null,
              branch_id: input.branchId ?? null,
              created_by_user_id: tenantUserId,
            },
          })

          await tx.inv_promotions.update({
            where: { id: promoId },
            data: {
              current_usage_count: { increment: 1 },
              current_discount_amount: { increment: orderDiscountDec },
            },
          })
        }
      }

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
            reference_id: orderId,
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

      // ── 8. Post inventory deduction via central engine (INSIDE TRANSACTION) ──
      // Runs inside tx for full ACID atomicity. If stock fails, everything rolls back.
      await createInventoryTransaction(
        authUserId,
        {
          typeCode: 'SALE_POS',
          sourceWarehouseId: input.warehouseId,
          sourceStoreId: input.storeId ?? null,
          referenceType: 'sales_order',
          referenceId: orderId,
          notes: `POS Sale: ${order.order_number}`,
          idempotencyKey: input.idempotencyKey
            ? `inv-sale-${input.idempotencyKey}`
            : undefined,
          autoPost: true,
          items: lineItems.map((li, idx) => ({
            productVariantId: li.productVariantId,
            quantity: li.quantity,
            unitCost: li.unitCost,
            sourceWarehouseId: input.warehouseId,
            stockBalanceId: stockMap.get(li.productVariantId)?.id,
            skuSnapshot: input.items[idx]?.sku ?? li.sku,
            productNameSnapshot: input.items[idx]?.productName ?? li.productName,
            batchId: li.batchId,
            referenceItemType: 'sales_order_item',
          })),
        },
        tx
      )

      return {
        order,
        invoice,
        paymentRecords: orderPaymentsData,
        shipmentRecord,
      }
    }, {
      maxWait: 15000,
      timeout: 30000,
    })

    return {
      orderId: result.order.id,
      orderNumber: result.order.order_number,
      invoiceId: result.invoice.id,
      invoiceNo: result.invoice.invoice_no,
      invoiceNumber: result.invoice.invoice_no,
      totalAmount: totalAmount.toString(),
      payments: result.paymentRecords.map((p) => ({
        method: p.payment_method,
        amount: p.amount.toString(),
      })),
      cashChange: cashChange.toString(),
      isDuplicate: false,
      shipmentId: result.shipmentRecord?.id ?? null,
    }
  })
}

/**
 * Evaluates promotional discounts for a POS basket prior to finalizing payment.
 */
export async function evaluatePosCartDiscounts(
  authUserId: string,
  context: {
    items: Array<{
      productVariantId: string
      productId: string
      categoryId?: string | null
      brandId?: string | null
      quantity: number
      unitPrice: number
    }>
    couponCode?: string | null
    customerId?: string | null
    customerGroupId?: string | null
    branchId?: string | null
    storeId?: string | null
    currencyId?: string | null
    manualDiscountPercent?: number | null
    userMaxDiscountPercent?: number | null
  }
) {
  const { calculateApplicableDiscounts } = await import('./promotion-engine')
  return calculateApplicableDiscounts(authUserId, {
    cartItems: context.items.map((it, idx) => ({
      lineId: `line_${idx}`,
      variantId: it.productVariantId,
      productId: it.productId,
      categoryId: it.categoryId ?? undefined,
      brandId: it.brandId ?? undefined,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      subtotal: it.quantity * it.unitPrice,
    })),
    couponCode: context.couponCode ?? undefined,
    customerId: context.customerId ?? undefined,
    customerGroupId: context.customerGroupId ?? undefined,
    branchId: context.branchId ?? undefined,
    storeId: context.storeId ?? undefined,
    currencyId: context.currencyId ?? undefined,
    manualDiscountPercent: context.manualDiscountPercent ?? undefined,
    userMaxDiscountPercent: context.userMaxDiscountPercent ?? undefined,
  })
}

