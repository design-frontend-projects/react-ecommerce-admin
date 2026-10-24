'use server'

import { z } from 'zod'
import { Prisma } from '@/generated/prisma/client'
import type {
  refund_status_enum,
  refund_method_enum,
  refund_inventory_return_status_enum,
  refund_approval_level_enum,
  return_disposition_enum,
  stock_condition_enum,
  invoice_status_enum,
  invoice_payment_status_enum,
} from '@/generated/prisma/enums'
import prisma from '@/lib/prisma'
import { requireTenantId, resolveTenantUserId, isValidUuid } from '@/server/utils/tenant'
import { getDatabasePermissionNames } from '@/server/utils/auth'
import { ApiError } from '@/server/utils/api-error'
import { NotificationPublisher } from '@/server/redis/notification-publisher'
import { verifyUserPin, verifyManagerPin } from './pos-pin'
import { getTenantRefundPolicy, type RefundPolicy } from './refund-policy'
import { evaluateRefundAuthorization } from './refund-authorization'
import { generateInvoiceNumber } from './sales-invoice-engine'
import { createInventoryTransaction } from './inventory-transaction-engine'

// ============================================================================
// VALID STATE MACHINE TRANSITIONS
// ============================================================================

export const VALID_REFUND_TRANSITIONS: Record<refund_status_enum, refund_status_enum[]> = {
  draft: ['requested', 'cancelled'],
  requested: ['pending_approval', 'approved', 'rejected', 'cancelled'],
  pending_approval: ['approved', 'rejected', 'cancelled'],
  approved: ['processing', 'completed', 'cancelled'],
  processing: ['completed', 'failed'],
  rejected: [],
  completed: [],
  failed: ['processing', 'cancelled'],
  cancelled: [],
}

export function canTransitionRefund(
  current: refund_status_enum,
  next: refund_status_enum
): boolean {
  const allowed = VALID_REFUND_TRANSITIONS[current] ?? []
  return allowed.includes(next)
}

export function validateRefundStateTransition(
  current: refund_status_enum,
  next: refund_status_enum
): void {
  if (!canTransitionRefund(current, next)) {
    throw new ApiError(
      `Invalid refund state transition from '${current}' to '${next}'.`,
      400
    )
  }
}

// ============================================================================
// SCHEMAS & INTERFACES
// ============================================================================

export const RefundItemInputSchema = z.object({
  salesInvoiceItemId: z.string().uuid(),
  refundQuantity: z.number().positive(),
  disposition: z.enum([
    'resalable',
    'damaged',
    'quarantine',
    'defective',
    'expired',
    'scrap',
  ]).default('resalable'),
  reason: z.string().optional(),
})

export const CreateRefundInputSchema = z.object({
  salesInvoiceId: z.string().uuid(),
  items: z.array(RefundItemInputSchema).min(1),
  refundMethod: z.enum([
    'cash',
    'card',
    'original_payment_method',
    'store_credit',
    'customer_wallet',
    'bank_transfer',
    'other',
  ]),
  refundReference: z.string().max(255).optional(),
  reason: z.string().max(500).optional(),
  notes: z.string().optional(),
  pin: z.string().optional(),
  managerPin: z.string().optional(),
  managerTenantUserId: z.string().uuid().optional(),
  inventoryReturnRequired: z.boolean().default(true),
  idempotencyKey: z.string().max(128).optional(),
})

export type CreateRefundInput = z.infer<typeof CreateRefundInputSchema>

export interface ListRefundsFilters {
  status?: refund_status_enum
  salesInvoiceId?: string
  storeId?: string
  branchId?: string
  customerId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  pageSize?: number
}

// Helper to convert to Decimal
function toDecimal(
  val: number | string | Prisma.Decimal | null | undefined,
  defaultValue = 0
): Prisma.Decimal {
  if (val === null || val === undefined) return new Prisma.Decimal(defaultValue)
  if (val instanceof Prisma.Decimal) return val
  return new Prisma.Decimal(val)
}

// Map return disposition to inventory stock condition
function mapDispositionToCondition(
  disposition: return_disposition_enum
): stock_condition_enum {
  switch (disposition) {
    case 'resalable':
      return 'good'
    case 'damaged':
    case 'scrap':
      return 'damaged'
    case 'quarantine':
    case 'defective':
    case 'expired':
    default:
      return 'quarantine'
  }
}

/**
 * Ensure the system has the SALE_RETURN inventory transaction type registered
 */
export async function ensureSaleReturnTransactionType(client?: Prisma.TransactionClient) {
  const db = client ?? prisma
  await db.$executeRawUnsafe(`
    INSERT INTO "public"."inventory_transaction_types" (
      "id", "code", "name", "description", "direction", "category",
      "requires_approval", "requires_destination", "allows_negative_stock",
      "auto_post", "is_system", "is_active"
    ) VALUES (
      gen_random_uuid(), 'SALE_RETURN', 'Sales Return / Refund', 'Customer returns and refunds via POS',
      'inbound', 'adjustment', false, true, false, true, true, true
    ) ON CONFLICT ("code") DO NOTHING;
  `).catch(() => null)
}

// ============================================================================
// INVOICE LOOKUP & REFUNDABLE ITEMS CALCULATION
// ============================================================================

/**
 * Lookup invoices eligible for POS refund
 */
export async function lookupInvoiceForRefund(
  authUserId: string,
  searchParams: {
    invoiceNo?: string
    customerId?: string
    storeId?: string
    dateFrom?: string
    dateTo?: string
    page?: number
    pageSize?: number
  }
) {
  const tenantId = await requireTenantId(authUserId)
  const page = Math.max(1, searchParams.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, searchParams.pageSize ?? 20))

  const where: Prisma.sales_invoicesWhereInput = {
    tenant_id: tenantId,
    deleted_at: null,
    status: {
      in: ['issued', 'posted', 'paid', 'partially_paid', 'partially_returned'],
    },
  }

  if (searchParams.invoiceNo) {
    where.invoice_no = { contains: searchParams.invoiceNo, mode: 'insensitive' }
  }
  if (searchParams.customerId && isValidUuid(searchParams.customerId)) {
    where.customer_id = searchParams.customerId
  }
  if (searchParams.storeId && isValidUuid(searchParams.storeId)) {
    where.store_id = searchParams.storeId
  }
  if (searchParams.dateFrom || searchParams.dateTo) {
    where.invoice_date = {}
    if (searchParams.dateFrom) where.invoice_date.gte = new Date(searchParams.dateFrom)
    if (searchParams.dateTo) where.invoice_date.lte = new Date(searchParams.dateTo)
  }

  const [total, items] = await Promise.all([
    prisma.sales_invoices.count({ where }),
    prisma.sales_invoices.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customers: {
          select: { id: true, name: true, phone: true, email: true },
        },
        sales_invoice_items: {
          select: {
            id: true,
            line_no: true,
            product_variant_id: true,
            sku_snapshot: true,
            product_name_snapshot: true,
            variant_name_snapshot: true,
            quantity: true,
            returned_quantity: true,
            unit_price: true,
            discount_amount: true,
            tax_amount: true,
            line_total: true,
          },
        },
        sales_invoice_payments: {
          select: {
            id: true,
            payment_method: true,
            amount: true,
            status: true,
            created_at: true,
          },
        },
      },
    }),
  ])

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

/**
 * Calculate accurate refundable items with remaining refundable quantities
 */
export async function getRefundableItems(authUserId: string, invoiceId: string) {
  const tenantId = await requireTenantId(authUserId)

  const invoice = await prisma.sales_invoices.findFirst({
    where: { id: invoiceId, tenant_id: tenantId, deleted_at: null },
    include: {
      customers: true,
      sales_invoice_items: true,
      sales_invoice_payments: true,
    },
  })

  if (!invoice) {
    throw new ApiError('Sales invoice not found in this tenant.', 404)
  }

  // Load existing active or completed refund items for this invoice
  const previousRefundItems = await prisma.refund_items.findMany({
    where: {
      tenant_id: tenantId,
      refunds: {
        sales_invoice_id: invoiceId,
        status: { in: ['approved', 'processing', 'completed'] },
      },
    },
    select: {
      sales_invoice_item_id: true,
      refund_quantity: true,
      refund_amount: true,
    },
  })

  const refundedQtyMap = new Map<string, Prisma.Decimal>()
  for (const item of previousRefundItems) {
    const current = refundedQtyMap.get(item.sales_invoice_item_id) ?? new Prisma.Decimal(0)
    refundedQtyMap.set(item.sales_invoice_item_id, current.plus(item.refund_quantity))
  }

  const items = invoice.sales_invoice_items.map((line) => {
    const originalQty = toDecimal(line.quantity)
    const dbReturnedQty = toDecimal(line.returned_quantity)
    const trackedRefundedQty = refundedQtyMap.get(line.id) ?? new Prisma.Decimal(0)
    // Max of returned_quantity and active refund_items
    const previouslyRefundedQty = Prisma.Decimal.max(dbReturnedQty, trackedRefundedQty)
    const remainingQty = Prisma.Decimal.max(new Prisma.Decimal(0), originalQty.minus(previouslyRefundedQty))

    // Calculate per-unit price, discount, tax, and line total
    const unitPrice = toDecimal(line.unit_price)
    const discountAmount = toDecimal(line.discount_amount)
    const taxAmount = toDecimal(line.tax_amount)
    const lineTotal = toDecimal(line.line_total)

    const effectiveUnitPrice = originalQty.gt(0)
      ? lineTotal.dividedBy(originalQty)
      : unitPrice

    return {
      salesInvoiceItemId: line.id,
      productVariantId: line.product_variant_id,
      skuSnapshot: line.sku_snapshot,
      productNameSnapshot: line.product_name_snapshot,
      variantNameSnapshot: line.variant_name_snapshot,
      uomSnapshot: line.uom_snapshot,
      originalQuantity: originalQty.toNumber(),
      previouslyRefundedQuantity: previouslyRefundedQty.toNumber(),
      remainingRefundableQuantity: remainingQty.toNumber(),
      unitPrice: unitPrice.toNumber(),
      effectiveUnitPrice: effectiveUnitPrice.toNumber(),
      discountAmount: discountAmount.toNumber(),
      taxAmount: taxAmount.toNumber(),
      lineTotal: lineTotal.toNumber(),
      isFullyRefunded: remainingQty.lte(0),
    }
  })

  const primaryPayment = invoice.sales_invoice_payments[0]
  const policy = await getTenantRefundPolicy(tenantId)

  return {
    invoice: {
      id: invoice.id,
      invoiceNo: invoice.invoice_no,
      invoiceDate: invoice.invoice_date,
      status: invoice.status,
      paymentStatus: invoice.payment_status,
      totalAmount: toDecimal(invoice.total_amount).toNumber(),
      paidAmount: toDecimal(invoice.paid_amount).toNumber(),
      storeId: invoice.store_id,
      branchId: invoice.branch_id,
      customerId: invoice.customer_id,
      customerName: invoice.customers?.name ?? null,
      primaryPaymentMethod: primaryPayment?.payment_method ?? null,
    },
    items,
    policy,
  }
}

// ============================================================================
// CREATE REFUND REQUEST (ATOMIC & IDEMPOTENT)
// ============================================================================

/**
 * Creates a refund request with server-side authorization evaluation,
 * PIN validation, and idempotent processing.
 */
export async function createRefundRequest(
  authUserId: string,
  rawInput: CreateRefundInput
) {
  const input = CreateRefundInputSchema.parse(rawInput)
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  return prisma.$transaction(async (tx) => {
    // 1. Idempotency Check
    if (input.idempotencyKey) {
      const existing = await tx.refunds.findFirst({
        where: {
          tenant_id: tenantId,
          idempotency_key: input.idempotencyKey,
        },
        include: {
          refund_items: true,
        },
      })
      if (existing) {
        return { refund: existing, isDuplicate: true }
      }
    }

    // 2. Load Sales Invoice
    const invoice = await tx.sales_invoices.findFirst({
      where: {
        id: input.salesInvoiceId,
        tenant_id: tenantId,
        deleted_at: null,
      },
      include: {
        sales_invoice_items: true,
        sales_invoice_payments: true,
      },
    })

    if (!invoice) {
      throw new ApiError('Sales invoice not found.', 404)
    }

    const nonRefundableStatuses: invoice_status_enum[] = ['cancelled', 'void']
    if (nonRefundableStatuses.includes(invoice.status)) {
      throw new ApiError(`Cannot refund invoice in '${invoice.status}' status.`, 400)
    }

    // 3. Item Validation & Calculations
    const invoiceItemMap = new Map(invoice.sales_invoice_items.map((i) => [i.id, i]))

    // Check active refunds for remaining quantity calculations
    const activeRefundItems = await tx.refund_items.findMany({
      where: {
        tenant_id: tenantId,
        refunds: {
          sales_invoice_id: invoice.id,
          status: { in: ['approved', 'processing', 'completed'] },
        },
      },
      select: {
        sales_invoice_item_id: true,
        refund_quantity: true,
      },
    })

    const refundedSumMap = new Map<string, Prisma.Decimal>()
    for (const ri of activeRefundItems) {
      const cur = refundedSumMap.get(ri.sales_invoice_item_id) ?? new Prisma.Decimal(0)
      refundedSumMap.set(ri.sales_invoice_item_id, cur.plus(ri.refund_quantity))
    }

    let calculatedTotalRefundAmount = new Prisma.Decimal(0)
    const preparedRefundItems: Array<{
      sales_invoice_item_id: string
      product_variant_id: string
      original_quantity: Prisma.Decimal
      previously_refunded_qty: Prisma.Decimal
      refund_quantity: Prisma.Decimal
      unit_price: Prisma.Decimal
      discount_amount: Prisma.Decimal
      tax_amount: Prisma.Decimal
      refund_amount: Prisma.Decimal
      reason?: string | null
      condition: stock_condition_enum
      disposition: return_disposition_enum
      sku_snapshot?: string | null
      product_name_snapshot?: string | null
      variant_name_snapshot?: string | null
    }> = []

    for (const reqItem of input.items) {
      const line = invoiceItemMap.get(reqItem.salesInvoiceItemId)
      if (!line) {
        throw new ApiError(`Invoice item '${reqItem.salesInvoiceItemId}' does not belong to invoice.`, 400)
      }

      const origQty = toDecimal(line.quantity)
      const prevQty = Prisma.Decimal.max(
        toDecimal(line.returned_quantity),
        refundedSumMap.get(line.id) ?? new Prisma.Decimal(0)
      )
      const remainingQty = Prisma.Decimal.max(new Prisma.Decimal(0), origQty.minus(prevQty))
      const reqQty = new Prisma.Decimal(reqItem.refundQuantity)

      if (reqQty.gt(remainingQty)) {
        throw new ApiError(
          `Requested refund quantity (${reqQty}) exceeds remaining refundable quantity (${remainingQty}) for item '${line.product_name_snapshot ?? line.sku_snapshot}'.`,
          400
        )
      }

      // Proportional refund calculation based on original invoice line total
      const unitPrice = toDecimal(line.unit_price)
      const lineTotal = toDecimal(line.line_total)
      const propDiscount = origQty.gt(0)
        ? toDecimal(line.discount_amount).times(reqQty).dividedBy(origQty)
        : new Prisma.Decimal(0)
      const propTax = origQty.gt(0)
        ? toDecimal(line.tax_amount).times(reqQty).dividedBy(origQty)
        : new Prisma.Decimal(0)
      const itemRefundAmount = origQty.gt(0)
        ? lineTotal.times(reqQty).dividedBy(origQty)
        : unitPrice.times(reqQty)

      calculatedTotalRefundAmount = calculatedTotalRefundAmount.plus(itemRefundAmount)

      const disposition = reqItem.disposition as return_disposition_enum
      const condition = mapDispositionToCondition(disposition)

      preparedRefundItems.push({
        sales_invoice_item_id: line.id,
        product_variant_id: line.product_variant_id,
        original_quantity: origQty,
        previously_refunded_qty: prevQty,
        refund_quantity: reqQty,
        unit_price: unitPrice,
        discount_amount: propDiscount,
        tax_amount: propTax,
        refund_amount: itemRefundAmount,
        reason: reqItem.reason ?? input.reason ?? null,
        condition,
        disposition,
        sku_snapshot: line.sku_snapshot,
        product_name_snapshot: line.product_name_snapshot,
        variant_name_snapshot: line.variant_name_snapshot,
      })
    }

    // 4. Server-Side Authorization Evaluation
    const primaryPayment = invoice.sales_invoice_payments[0]
    const authResult = await evaluateRefundAuthorization({
      tenantId,
      authUserId,
      amount: calculatedTotalRefundAmount.toNumber(),
      originalInvoiceDate: invoice.invoice_date,
      originalPaymentMethod: primaryPayment?.payment_method ?? null,
      requestedRefundMethod: input.refundMethod,
    })

    if (!authResult.authorized && !authResult.requiresApproval) {
      throw new ApiError(authResult.reason || 'Refund unauthorized by policy.', 403)
    }

    // 5. PIN Verification (if provided or required)
    if (input.pin && tenantUserId) {
      const pinRes = await verifyUserPin(tenantId, tenantUserId, input.pin)
      if (!pinRes.valid) {
        throw new ApiError(pinRes.error || 'Invalid POS user PIN.', 401)
      }
    } else if (authResult.requiresPin && !input.managerPin) {
      // Initiator requires PIN
      throw new ApiError('POS PIN verification required to proceed with this refund.', 401)
    }

    // Manager PIN Override (if manager approved on the spot)
    let managerApprovedOnSpot = false
    let approverUserId: string | null = null

    if (input.managerPin && input.managerTenantUserId) {
      const mgrPinRes = await verifyManagerPin(
        tenantId,
        input.managerTenantUserId,
        input.managerPin,
        authResult.approvalLevel === 'manager' || authResult.approvalLevel === 'top_management'
          ? 'pos.refund.high_value'
          : 'pos.refund.approve'
      )
      if (!mgrPinRes.valid) {
        throw new ApiError(mgrPinRes.error || 'Manager PIN authorization failed.', 401)
      }
      managerApprovedOnSpot = true
      approverUserId = input.managerTenantUserId
    }

    // 6. Determine Initial Status
    let initialStatus: refund_status_enum
    let approvalRequired = authResult.requiresApproval
    let approvalLevel: refund_approval_level_enum = authResult.approvalLevel

    if (managerApprovedOnSpot) {
      initialStatus = 'approved'
      approvalRequired = true
    } else if (authResult.requiresApproval) {
      initialStatus = 'pending_approval'
    } else {
      // Fully authorized within cashier limit or admin override
      const { permissionNames } = await getDatabasePermissionNames(authUserId)
      const canDirectApprove =
        permissionNames.includes('*') ||
        permissionNames.includes('pos.refund.approve') ||
        permissionNames.includes('pos.refund.override')
      initialStatus = canDirectApprove ? 'approved' : 'requested'
      if (canDirectApprove) {
        approverUserId = tenantUserId
      }
    }

    // 7. Generate Sequence Refund Number
    const refundNumber = await generateInvoiceNumber(tenantId, invoice.store_id, 'REF', tx)

    // 8. Create Refund Header
    const now = new Date()
    const refund = await tx.refunds.create({
      data: {
        tenant_id: tenantId,
        refund_number: refundNumber,
        sales_invoice_id: invoice.id,
        store_id: invoice.store_id,
        branch_id: invoice.branch_id,
        pos_terminal_id: invoice.pos_terminal_id,
        customer_id: invoice.customer_id,
        status: initialStatus,
        currency: invoice.currency_id ? 'USD' : 'USD',
        requested_amount: calculatedTotalRefundAmount,
        approved_amount: initialStatus === 'approved' ? calculatedTotalRefundAmount : 0,
        refunded_amount: 0,
        refund_method: input.refundMethod as refund_method_enum,
        original_payment_method: primaryPayment?.payment_method ?? null,
        refund_reference: input.refundReference ?? null,
        reason: input.reason ?? null,
        notes: input.notes ?? null,
        approval_required: approvalRequired,
        approval_level: approvalLevel,
        approval_reason: authResult.reason ?? null,
        requested_at: now,
        requested_by_user_id: tenantUserId,
        approved_at: initialStatus === 'approved' ? now : null,
        approved_by_user_id: initialStatus === 'approved' ? approverUserId : null,
        inventory_return_required: input.inventoryReturnRequired,
        inventory_return_status: input.inventoryReturnRequired ? 'pending' : 'not_required',
        idempotency_key: input.idempotencyKey ?? null,
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
        refund_items: {
          create: preparedRefundItems.map((item) => ({
            tenant_id: tenantId,
            sales_invoice_item_id: item.sales_invoice_item_id,
            product_variant_id: item.product_variant_id,
            original_quantity: item.original_quantity,
            previously_refunded_qty: item.previously_refunded_qty,
            refund_quantity: item.refund_quantity,
            unit_price: item.unit_price,
            discount_amount: item.discount_amount,
            tax_amount: item.tax_amount,
            refund_amount: item.refund_amount,
            reason: item.reason,
            condition: item.condition,
            disposition: item.disposition,
            sku_snapshot: item.sku_snapshot,
            product_name_snapshot: item.product_name_snapshot,
            variant_name_snapshot: item.variant_name_snapshot,
            created_by_user_id: tenantUserId,
          })),
        },
      },
      include: {
        refund_items: true,
        sales_invoices: true,
      },
    })

    // 9. Notifications & Events
    if (initialStatus === 'pending_approval') {
      await NotificationPublisher.publish({
        v: 1,
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        type: 'alert',
        severity: 'WARNING',
        priority: 'high',
        target_type: 'ROLE',
        title: 'POS Refund Approval Required',
        message: `Refund ${refundNumber} for ${calculatedTotalRefundAmount.toFixed(2)} requires ${approvalLevel} approval.`,
        business_event: {
          type: 'refund_approval_required',
          entity_type: 'refunds',
          entity_id: refund.id,
        },
        action: {
          url: `/pos/refunds?id=${refund.id}`,
          label: 'Review Refund',
        },
        created_at: now.toISOString(),
      }).catch((err) => console.error('Redis pub error on refund approval required:', err))
    } else if (initialStatus === 'approved') {
      await NotificationPublisher.publish({
        v: 1,
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        type: 'alert',
        severity: 'INFO',
        priority: 'normal',
        target_type: 'USER',
        recipient_user_ids: tenantUserId ? [tenantUserId] : [],
        title: 'POS Refund Approved',
        message: `Refund ${refundNumber} for ${calculatedTotalRefundAmount.toFixed(2)} was approved and is ready for execution.`,
        business_event: {
          type: 'refund_approved',
          entity_type: 'refunds',
          entity_id: refund.id,
        },
        action: {
          url: `/pos/refunds?id=${refund.id}`,
          label: 'Execute Refund',
        },
        created_at: now.toISOString(),
      }).catch((err) => console.error('Redis pub error on refund approved:', err))
    }

    return {
      refund,
      authorization: authResult,
      isDuplicate: false,
    }
  })
}

// ============================================================================
// SUBMIT REFUND FOR APPROVAL
// ============================================================================

export async function submitRefund(authUserId: string, refundId: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  return prisma.$transaction(async (tx) => {
    const refund = await tx.refunds.findFirst({
      where: { id: refundId, tenant_id: tenantId },
      include: { refund_items: true },
    })

    if (!refund) {
      throw new ApiError('Refund record not found.', 404)
    }

    validateRefundStateTransition(refund.status, 'pending_approval')

    const updated = await tx.refunds.update({
      where: { id: refund.id },
      data: {
        status: 'pending_approval',
        approval_required: true,
        submitted_at: new Date(),
        submitted_by_user_id: tenantUserId,
        updated_at: new Date(),
        updated_by_user_id: tenantUserId,
        version: { increment: 1 },
      },
    })

    await NotificationPublisher.publish({
      v: 1,
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      type: 'alert',
      severity: 'WARNING',
      priority: 'high',
      target_type: 'ROLE',
      title: 'POS Refund Submitted for Approval',
      message: `Refund ${refund.refund_number} submitted for approval.`,
      business_event: {
        type: 'refund_approval_required',
        entity_type: 'refunds',
        entity_id: refund.id,
      },
      created_at: new Date().toISOString(),
    }).catch(() => null)

    return updated
  })
}

// ============================================================================
// APPROVE REFUND
// ============================================================================

export const ApproveRefundInputSchema = z.object({
  refundId: z.string().uuid(),
  pin: z.string().optional(),
  approvalReason: z.string().optional(),
})

export type ApproveRefundInput = z.infer<typeof ApproveRefundInputSchema>

export async function approveRefund(
  authUserId: string,
  rawInput: ApproveRefundInput
) {
  const input = ApproveRefundInputSchema.parse(rawInput)
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const { permissionNames } = await getDatabasePermissionNames(authUserId)
  const isSuperAdmin = permissionNames.includes('*')
  const canApprove =
    isSuperAdmin ||
    permissionNames.includes('pos.refund.approve') ||
    permissionNames.includes('pos.refund.high_value') ||
    permissionNames.includes('pos.refund.override')

  if (!canApprove) {
    throw new ApiError('Unauthorized: Missing pos.refund.approve permission.', 403)
  }

  // PIN validation for approver if provided
  if (input.pin && tenantUserId) {
    const pinRes = await verifyUserPin(tenantId, tenantUserId, input.pin)
    if (!pinRes.valid) {
      throw new ApiError(pinRes.error || 'Approver PIN verification failed.', 401)
    }
  }

  return prisma.$transaction(async (tx) => {
    const refund = await tx.refunds.findFirst({
      where: { id: input.refundId, tenant_id: tenantId },
    })

    if (!refund) {
      throw new ApiError('Refund record not found.', 404)
    }

    validateRefundStateTransition(refund.status, 'approved')

    const now = new Date()
    const updated = await tx.refunds.update({
      where: { id: refund.id },
      data: {
        status: 'approved',
        approved_amount: refund.requested_amount,
        approved_at: now,
        approved_by_user_id: tenantUserId,
        approval_reason: input.approvalReason ?? refund.approval_reason,
        updated_at: now,
        updated_by_user_id: tenantUserId,
        version: { increment: 1 },
      },
    })

    await NotificationPublisher.publish({
      v: 1,
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      type: 'alert',
      severity: 'INFO',
      priority: 'normal',
      target_type: 'USER',
      recipient_user_ids: refund.requested_by_user_id ? [refund.requested_by_user_id] : [],
      title: 'POS Refund Approved',
      message: `Refund ${refund.refund_number} has been approved and can now be executed.`,
      business_event: {
        type: 'refund_approved',
        entity_type: 'refunds',
        entity_id: refund.id,
      },
      created_at: now.toISOString(),
    }).catch(() => null)

    return updated
  })
}

// ============================================================================
// REJECT REFUND
// ============================================================================

export const RejectRefundInputSchema = z.object({
  refundId: z.string().uuid(),
  rejectionReason: z.string().min(3).max(500),
})

export type RejectRefundInput = z.infer<typeof RejectRefundInputSchema>

export async function rejectRefund(
  authUserId: string,
  rawInput: RejectRefundInput
) {
  const input = RejectRefundInputSchema.parse(rawInput)
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const { permissionNames } = await getDatabasePermissionNames(authUserId)
  const canReject =
    permissionNames.includes('*') ||
    permissionNames.includes('pos.refund.reject') ||
    permissionNames.includes('pos.refund.approve') ||
    permissionNames.includes('pos.refund.override')

  if (!canReject) {
    throw new ApiError('Unauthorized: Missing pos.refund.reject permission.', 403)
  }

  return prisma.$transaction(async (tx) => {
    const refund = await tx.refunds.findFirst({
      where: { id: input.refundId, tenant_id: tenantId },
    })

    if (!refund) {
      throw new ApiError('Refund record not found.', 404)
    }

    validateRefundStateTransition(refund.status, 'rejected')

    const now = new Date()
    const updated = await tx.refunds.update({
      where: { id: refund.id },
      data: {
        status: 'rejected',
        rejected_at: now,
        rejected_by_user_id: tenantUserId,
        rejection_reason: input.rejectionReason,
        updated_at: now,
        updated_by_user_id: tenantUserId,
        version: { increment: 1 },
      },
    })

    await NotificationPublisher.publish({
      v: 1,
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      type: 'alert',
      severity: 'WARNING',
      priority: 'high',
      target_type: 'USER',
      recipient_user_ids: refund.requested_by_user_id ? [refund.requested_by_user_id] : [],
      title: 'POS Refund Rejected',
      message: `Refund ${refund.refund_number} was rejected: ${input.rejectionReason}`,
      business_event: {
        type: 'refund_rejected',
        entity_type: 'refunds',
        entity_id: refund.id,
      },
      created_at: now.toISOString(),
    }).catch(() => null)

    return updated
  })
}

// ============================================================================
// EXECUTE REFUND (THE ATOMIC TRANSACTION)
// ============================================================================

export const ExecuteRefundInputSchema = z.object({
  refundId: z.string().uuid(),
  pin: z.string().optional(),
})

export type ExecuteRefundInput = z.infer<typeof ExecuteRefundInputSchema>

/**
 * Atomically executes financial disbursement and inventory restocking
 * within a single database transaction. Rollbacks on any failure.
 */
export async function executeRefund(
  authUserId: string,
  rawInput: ExecuteRefundInput
) {
  const input = ExecuteRefundInputSchema.parse(rawInput)
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const { permissionNames } = await getDatabasePermissionNames(authUserId)
  const canExecute =
    permissionNames.includes('*') ||
    permissionNames.includes('pos.refund.execute') ||
    permissionNames.includes('pos.refund.approve') ||
    permissionNames.includes('pos.refund.override')

  if (!canExecute) {
    throw new ApiError('Unauthorized: Missing pos.refund.execute permission.', 403)
  }

  // PIN validation for executor if provided
  if (input.pin && tenantUserId) {
    const pinRes = await verifyUserPin(tenantId, tenantUserId, input.pin)
    if (!pinRes.valid) {
      throw new ApiError(pinRes.error || 'Executor PIN verification failed.', 401)
    }
  }

  // Ensure SALE_RETURN transaction type exists in DB
  await ensureSaleReturnTransactionType()

  return prisma.$transaction(async (tx) => {
    // 1. Lock and fetch refund record
    const refund = await tx.refunds.findFirst({
      where: { id: input.refundId, tenant_id: tenantId },
      include: {
        refund_items: true,
        sales_invoices: {
          include: {
            sales_invoice_items: true,
            sales_invoice_payments: true,
          },
        },
      },
    })

    if (!refund) {
      throw new ApiError('Refund record not found.', 404)
    }

    validateRefundStateTransition(refund.status, 'processing')

    // Mark as processing
    await tx.refunds.update({
      where: { id: refund.id },
      data: {
        status: 'processing',
        processed_at: new Date(),
        processed_by_user_id: tenantUserId,
        updated_at: new Date(),
        version: { increment: 1 },
      },
    })

    const invoice = refund.sales_invoices
    if (!invoice) {
      throw new ApiError('Linked sales invoice not found.', 404)
    }

    const refundAmount = toDecimal(refund.approved_amount)
    const now = new Date()

    // 2. FINANCIAL REFUND (Negative Payment Entry)
    const refundPaymentMethod = refund.refund_method ?? 'cash'
    await tx.sales_invoice_payments.create({
      data: {
        tenant_id: tenantId,
        invoice_id: invoice.id,
        payment_method: refundPaymentMethod,
        amount: refundAmount.negated(),
        currency: refund.currency,
        status: 'completed',
        reference_number: refund.refund_number,
        notes: `Refund payout for ${refund.refund_number}`,
        payment_date: now,
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      },
    })

    // Update invoice financial balances
    const currentPaid = toDecimal(invoice.paid_amount)
    const newPaid = currentPaid.minus(refundAmount).clamp(new Prisma.Decimal(0), currentPaid)
    const invoiceTotal = toDecimal(invoice.total_amount)
    const newDue = invoiceTotal.minus(newPaid).clamp(new Prisma.Decimal(0), invoiceTotal)

    // 3. PHYSICAL INVENTORY RESTOCKING
    let inventoryTransactionId: string | null = null

    if (refund.inventory_return_required && refund.refund_items.length > 0) {
      const inventoryItemsInput = refund.refund_items.map((ri) => ({
        productVariantId: ri.product_variant_id,
        quantity: ri.refund_quantity,
        unitCost: ri.unit_price,
        skuSnapshot: ri.sku_snapshot,
        productNameSnapshot: ri.product_name_snapshot,
        destWarehouseId: invoice.warehouse_id ?? null,
        destStoreId: invoice.store_id ?? null,
        condition: ri.condition ?? 'good',
        referenceItemType: 'REFUND_ITEM',
        referenceItemId: ri.id,
        notes: `Return from refund ${refund.refund_number}`,
      }))

      // Delegate to mature inventory transaction engine with autoPost: true
      const invTxnResult = await createInventoryTransaction(
        authUserId,
        {
          typeCode: 'SALE_RETURN',
          destWarehouseId: invoice.warehouse_id,
          destStoreId: invoice.store_id,
          referenceType: 'REFUND',
          referenceId: refund.id,
          notes: `Restock from refund ${refund.refund_number}`,
          autoPost: true,
          items: inventoryItemsInput,
        },
        tx
      )

      inventoryTransactionId = invTxnResult.transaction.id
    }

    // 4. Update sales_invoice_items.returned_quantity
    for (const ri of refund.refund_items) {
      await tx.sales_invoice_items.update({
        where: { id: ri.sales_invoice_item_id },
        data: {
          returned_quantity: { increment: ri.refund_quantity },
          updated_at: now,
          updated_by_user_id: tenantUserId,
        },
      })
    }

    // 5. Update sales_invoices status
    const allInvoiceItems = await tx.sales_invoice_items.findMany({
      where: { invoice_id: invoice.id },
      select: { quantity: true, returned_quantity: true },
    })

    const isFullyReturned = allInvoiceItems.every((item) =>
      toDecimal(item.returned_quantity).gte(toDecimal(item.quantity))
    )

    let nextInvoiceStatus: invoice_status_enum = invoice.status
    let nextPaymentStatus: invoice_payment_status_enum = invoice.payment_status

    if (isFullyReturned) {
      nextInvoiceStatus = 'returned'
      nextPaymentStatus = 'refunded'
    } else {
      nextInvoiceStatus = 'partially_returned'
      if (newPaid.lte(0)) {
        nextPaymentStatus = 'refunded'
      }
    }

    await tx.sales_invoices.update({
      where: { id: invoice.id },
      data: {
        paid_amount: newPaid,
        due_amount: newDue,
        status: nextInvoiceStatus,
        payment_status: nextPaymentStatus,
        updated_at: now,
        updated_by_user_id: tenantUserId,
      },
    })

    // 6. Complete Refund Record
    const completedRefund = await tx.refunds.update({
      where: { id: refund.id },
      data: {
        status: 'completed',
        refunded_amount: refund.approved_amount,
        inventory_transaction_id: inventoryTransactionId,
        inventory_return_status: refund.inventory_return_required ? 'completed' : 'not_required',
        completed_at: now,
        completed_by_user_id: tenantUserId,
        updated_at: now,
        updated_by_user_id: tenantUserId,
        version: { increment: 1 },
      },
      include: {
        refund_items: true,
      },
    })

    // 7. Post-execution Event Dispatch
    await NotificationPublisher.publish({
      v: 1,
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      type: 'alert',
      severity: 'INFO',
      priority: 'high',
      target_type: 'TENANT',
      title: 'POS Refund Completed',
      message: `Refund ${refund.refund_number} for ${refundAmount.toFixed(2)} completed successfully.`,
      business_event: {
        type: 'refund_completed',
        entity_type: 'refunds',
        entity_id: refund.id,
      },
      created_at: now.toISOString(),
    }).catch(() => null)

    return completedRefund
  })
}

// ============================================================================
// CANCEL REFUND
// ============================================================================

export const CancelRefundInputSchema = z.object({
  refundId: z.string().uuid(),
  cancellationReason: z.string().min(3).max(500),
})

export type CancelRefundInput = z.infer<typeof CancelRefundInputSchema>

export async function cancelRefund(
  authUserId: string,
  rawInput: CancelRefundInput
) {
  const input = CancelRefundInputSchema.parse(rawInput)
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const { permissionNames } = await getDatabasePermissionNames(authUserId)
  const canCancel =
    permissionNames.includes('*') ||
    permissionNames.includes('pos.refund.cancel') ||
    permissionNames.includes('pos.refund.approve') ||
    permissionNames.includes('pos.refund.override')

  if (!canCancel) {
    throw new ApiError('Unauthorized: Missing pos.refund.cancel permission.', 403)
  }

  return prisma.$transaction(async (tx) => {
    const refund = await tx.refunds.findFirst({
      where: { id: input.refundId, tenant_id: tenantId },
    })

    if (!refund) {
      throw new ApiError('Refund record not found.', 404)
    }

    validateRefundStateTransition(refund.status, 'cancelled')

    const now = new Date()
    const updated = await tx.refunds.update({
      where: { id: refund.id },
      data: {
        status: 'cancelled',
        cancelled_at: now,
        cancelled_by_user_id: tenantUserId,
        cancellation_reason: input.cancellationReason,
        updated_at: now,
        updated_by_user_id: tenantUserId,
        version: { increment: 1 },
      },
    })

    await NotificationPublisher.publish({
      v: 1,
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      type: 'alert',
      severity: 'INFO',
      priority: 'normal',
      target_type: 'USER',
      recipient_user_ids: refund.requested_by_user_id ? [refund.requested_by_user_id] : [],
      title: 'POS Refund Cancelled',
      message: `Refund ${refund.refund_number} was cancelled: ${input.cancellationReason}`,
      business_event: {
        type: 'refund_cancelled',
        entity_type: 'refunds',
        entity_id: refund.id,
      },
      created_at: now.toISOString(),
    }).catch(() => null)

    return updated
  })
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

export async function getRefundById(authUserId: string, refundId: string) {
  const tenantId = await requireTenantId(authUserId)

  const refund = await prisma.refunds.findFirst({
    where: { id: refundId, tenant_id: tenantId },
    include: {
      refund_items: true,
      sales_invoices: {
        include: {
          customers: true,
          sales_invoice_payments: true,
        },
      },
    },
  })

  if (!refund) {
    throw new ApiError('Refund not found.', 404)
  }

  return refund
}

export async function listRefunds(authUserId: string, filters: ListRefundsFilters = {}) {
  const tenantId = await requireTenantId(authUserId)
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20))

  const where: Prisma.refundsWhereInput = {
    tenant_id: tenantId,
  }

  if (filters.status) where.status = filters.status
  if (filters.salesInvoiceId && isValidUuid(filters.salesInvoiceId)) {
    where.sales_invoice_id = filters.salesInvoiceId
  }
  if (filters.storeId && isValidUuid(filters.storeId)) {
    where.store_id = filters.storeId
  }
  if (filters.branchId && isValidUuid(filters.branchId)) {
    where.branch_id = filters.branchId
  }
  if (filters.customerId && isValidUuid(filters.customerId)) {
    where.customer_id = filters.customerId
  }
  if (filters.search) {
    where.OR = [
      { refund_number: { contains: filters.search, mode: 'insensitive' } },
      { refund_reference: { contains: filters.search, mode: 'insensitive' } },
      { reason: { contains: filters.search, mode: 'insensitive' } },
    ]
  }
  if (filters.dateFrom || filters.dateTo) {
    where.created_at = {}
    if (filters.dateFrom) where.created_at.gte = new Date(filters.dateFrom)
    if (filters.dateTo) where.created_at.lte = new Date(filters.dateTo)
  }

  const [total, items] = await Promise.all([
    prisma.refunds.count({ where }),
    prisma.refunds.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        refund_items: true,
        sales_invoices: {
          select: {
            id: true,
            invoice_no: true,
            invoice_date: true,
            total_amount: true,
            customers: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
      },
    }),
  ])

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}
