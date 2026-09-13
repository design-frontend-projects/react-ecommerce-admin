'use server'

import prisma from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import type { financial_transaction_type_enum } from '@/generated/prisma/enums'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import { ApiError } from '@/server/utils/api-error'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface FinancialTransactionItemInput {
  product_id: string
  quantity: number | string | Prisma.Decimal
  unit_price: number | string | Prisma.Decimal
  discount_amount?: number | string | Prisma.Decimal | null
  tax_amount?: number | string | Prisma.Decimal | null
  sales_invoice_item_id?: string | null
  sales_return_item_id?: string | null
}

export interface CreateFinancialTransactionInput {
  transaction_type: financial_transaction_type_enum
  status?: string
  currency?: string
  notes?: string | null
  sales_invoice_id?: string | null
  sales_return_id?: string | null
  reference_transaction_id?: string | null
  metadata?: Record<string, unknown> | null
  ip_address?: string | null
  user_agent?: string | null
  // Optional direct amounts (used if items are empty, e.g. operational expense)
  subtotal?: number | string | Prisma.Decimal
  tax_amount?: number | string | Prisma.Decimal
  discount_amount?: number | string | Prisma.Decimal
  total_amount?: number | string | Prisma.Decimal
  items?: FinancialTransactionItemInput[]
}

export interface ListFinancialTransactionsParams {
  page?: number
  pageSize?: number
  type?: financial_transaction_type_enum
  status?: string
  currency?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  salesInvoiceId?: string
  salesReturnId?: string
  referenceTransactionId?: string
}

export interface RefundFinancialTransactionInput {
  originalTransactionId: string
  reason: string
  amount?: number
  items?: FinancialTransactionItemInput[]
}

// ============================================================================
// HELPER: Generate Transaction Number
// ============================================================================

function generateTransactionNumber(type: financial_transaction_type_enum): string {
  const prefixMap: Record<financial_transaction_type_enum, string> = {
    sale: 'SAL',
    purchase: 'PUR',
    payment_in: 'PIN',
    payment_out: 'POT',
    refund: 'REF',
    expense: 'EXP',
    income: 'INC',
    opening_balance: 'OPB',
    adjustment: 'ADJ',
  }
  const prefix = prefixMap[type] || 'FTX'
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${dateStr}-${randomSuffix}`
}

// ============================================================================
// 1. LIST FINANCIAL TRANSACTIONS
// ============================================================================

export async function listFinancialTransactions(
  authUserId: string,
  params: ListFinancialTransactionsParams = {}
) {
  const tenantId = await requireTenantId(authUserId)

  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.max(1, Math.min(100, Number(params.pageSize) || 20))
  const skip = (page - 1) * pageSize

  const where: Prisma.financial_transactionsWhereInput = {
    tenant_id: tenantId,
  }

  if (params.type) {
    where.transaction_type = params.type
  }

  if (params.status && params.status !== '__all__') {
    where.status = params.status
  }

  if (params.currency && params.currency !== '__all__') {
    where.currency = params.currency
  }

  if (params.salesInvoiceId) {
    where.sales_invoice_id = params.salesInvoiceId
  }

  if (params.salesReturnId) {
    where.sales_return_id = params.salesReturnId
  }

  if (params.referenceTransactionId) {
    where.reference_transaction_id = params.referenceTransactionId
  }

  if (params.search?.trim()) {
    const s = params.search.trim()
    where.OR = [
      { transaction_number: { contains: s, mode: 'insensitive' } },
      { notes: { contains: s, mode: 'insensitive' } },
    ]
  }

  if (params.dateFrom || params.dateTo) {
    where.created_at = {}
    if (params.dateFrom) {
      where.created_at.gte = new Date(params.dateFrom)
    }
    if (params.dateTo) {
      const end = new Date(params.dateTo)
      end.setHours(23, 59, 59, 999)
      where.created_at.lte = end
    }
  }

  const [total, transactions] = await Promise.all([
    prisma.financial_transactions.count({ where }),
    prisma.financial_transactions.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: pageSize,
    }),
  ])

  // Enhance transactions with creator names and item counts
  const userIds = Array.from(
    new Set(
      transactions
        .map((t) => t.created_by_user_id)
        .filter((id): id is string => Boolean(id))
    )
  )

  const users = userIds.length > 0
    ? await prisma.tenant_users.findMany({
        where: { id: { in: userIds } },
        select: { id: true, first_name: true, last_name: true, email: true },
      })
    : []

  const userMap = new Map(
    users.map((u) => [
      u.id,
      `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'User',
    ])
  )

  // Fetch line item counts per transaction
  const transactionIds = transactions.map((t) => t.id)
  const detailCounts = transactionIds.length > 0
    ? await prisma.financial_transaction_details.groupBy({
        by: ['transaction_id'],
        where: { transaction_id: { in: transactionIds } },
        _count: { id: true },
      })
    : []

  const detailCountMap = new Map(
    detailCounts.map((dc) => [dc.transaction_id, dc._count.id])
  )

  const items = transactions.map((t) => ({
    id: t.id,
    tenant_id: t.tenant_id,
    transaction_number: t.transaction_number,
    transaction_type: t.transaction_type,
    status: t.status,
    currency: t.currency,
    subtotal: Number(t.subtotal),
    tax_amount: Number(t.tax_amount || 0),
    discount_amount: Number(t.discount_amount || 0),
    total_amount: Number(t.total_amount),
    ip_address: t.ip_address,
    user_agent: t.user_agent,
    notes: t.notes,
    created_at: t.created_at?.toISOString() || null,
    updated_at: t.updated_at?.toISOString() || null,
    reference_transaction_id: t.reference_transaction_id,
    sales_invoice_id: t.sales_invoice_id,
    sales_return_id: t.sales_return_id,
    created_by_name: t.created_by_user_id ? userMap.get(t.created_by_user_id) || null : null,
    items_count: detailCountMap.get(t.id) || 0,
  }))

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  }
}

// ============================================================================
// 2. GET SINGLE FINANCIAL TRANSACTION WITH DETAILS
// ============================================================================

export async function getFinancialTransaction(
  authUserId: string,
  id: string
) {
  const tenantId = await requireTenantId(authUserId)

  const transaction = await prisma.financial_transactions.findFirst({
    where: { id, tenant_id: tenantId },
  })

  if (!transaction) {
    throw new ApiError('Financial transaction not found.', 404)
  }

  // Load line items
  const details = await prisma.financial_transaction_details.findMany({
    where: { transaction_id: id, tenant_id: tenantId },
  })

  // Load products for line items
  const productIds = Array.from(new Set(details.map((d) => d.product_id)))
  const products = productIds.length > 0
    ? await prisma.products.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, sku: true, barcode: true },
      })
    : []

  const productMap = new Map(products.map((p) => [p.id, p]))

  const formattedDetails = details.map((d) => {
    const prod = productMap.get(d.product_id)
    return {
      id: d.id,
      product_id: d.product_id,
      product_name: prod?.name || 'Unknown Product',
      sku: prod?.sku || null,
      barcode: prod?.barcode || null,
      quantity: Number(d.quantity),
      unit_price: Number(d.unit_price),
      discount_amount: Number(d.discount_amount || 0),
      tax_amount: Number(d.tax_amount || 0),
      subtotal: Number(d.subtotal),
      sales_invoice_item_id: d.sales_invoice_item_id,
      sales_return_item_id: d.sales_return_item_id,
    }
  })

  // Load Creator & Updater
  const auditUserIds = [
    transaction.created_by_user_id,
    transaction.updated_by_user_id,
  ].filter((uid): uid is string => Boolean(uid))

  const auditUsers = auditUserIds.length > 0
    ? await prisma.tenant_users.findMany({
        where: { id: { in: auditUserIds } },
        select: { id: true, first_name: true, last_name: true, email: true },
      })
    : []

  const auditUserMap = new Map(
    auditUsers.map((u) => [
      u.id,
      `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'User',
    ])
  )

  // Load Linked Reference Transaction (if this is a refund)
  let referenceTransaction: {
    id: string
    transaction_number: string
    transaction_type: string
    total_amount: number
    currency: string
  } | null = null

  if (transaction.reference_transaction_id) {
    const ref = await prisma.financial_transactions.findFirst({
      where: { id: transaction.reference_transaction_id, tenant_id: tenantId },
      select: {
        id: true,
        transaction_number: true,
        transaction_type: true,
        total_amount: true,
        currency: true,
      },
    })
    if (ref) {
      referenceTransaction = {
        id: ref.id,
        transaction_number: ref.transaction_number,
        transaction_type: ref.transaction_type,
        total_amount: Number(ref.total_amount),
        currency: ref.currency,
      }
    }
  }

  // Load Child Refunds (if any transactions reference this one)
  const childRefunds = await prisma.financial_transactions.findMany({
    where: { reference_transaction_id: id, tenant_id: tenantId },
    select: {
      id: true,
      transaction_number: true,
      transaction_type: true,
      status: true,
      total_amount: true,
      currency: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
  })

  // Load Linked Sales Invoice if present
  let linkedInvoice: { id: string; invoice_no: string; status: string } | null = null
  if (transaction.sales_invoice_id) {
    const inv = await prisma.sales_invoices.findFirst({
      where: { id: transaction.sales_invoice_id, tenant_id: tenantId },
      select: { id: true, invoice_no: true, status: true },
    })
    if (inv) linkedInvoice = inv
  }

  // Load Linked Sales Return if present
  let linkedReturn: { id: string; return_no: string; status: string } | null = null
  if (transaction.sales_return_id) {
    const ret = await prisma.sales_returns.findFirst({
      where: { id: transaction.sales_return_id, tenant_id: tenantId },
      select: { id: true, return_no: true, status: true },
    })
    if (ret) linkedReturn = ret
  }

  return {
    id: transaction.id,
    tenant_id: transaction.tenant_id,
    transaction_number: transaction.transaction_number,
    transaction_type: transaction.transaction_type,
    status: transaction.status,
    currency: transaction.currency,
    subtotal: Number(transaction.subtotal),
    tax_amount: Number(transaction.tax_amount || 0),
    discount_amount: Number(transaction.discount_amount || 0),
    total_amount: Number(transaction.total_amount),
    ip_address: transaction.ip_address,
    user_agent: transaction.user_agent,
    metadata: transaction.metadata as Record<string, unknown> | null,
    notes: transaction.notes,
    created_at: transaction.created_at?.toISOString() || null,
    updated_at: transaction.updated_at?.toISOString() || null,
    reference_transaction_id: transaction.reference_transaction_id,
    sales_invoice_id: transaction.sales_invoice_id,
    sales_return_id: transaction.sales_return_id,
    created_by_name: transaction.created_by_user_id
      ? auditUserMap.get(transaction.created_by_user_id) || null
      : null,
    updated_by_name: transaction.updated_by_user_id
      ? auditUserMap.get(transaction.updated_by_user_id) || null
      : null,
    details: formattedDetails,
    reference_transaction: referenceTransaction,
    child_refunds: childRefunds.map((cr) => ({
      id: cr.id,
      transaction_number: cr.transaction_number,
      transaction_type: cr.transaction_type,
      status: cr.status,
      total_amount: Number(cr.total_amount),
      currency: cr.currency,
      created_at: cr.created_at?.toISOString() || null,
    })),
    linked_invoice: linkedInvoice,
    linked_return: linkedReturn,
  }
}

// ============================================================================
// 3. GET EXECUTIVE KPI STATS
// ============================================================================

export async function getFinancialTransactionStats(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)

  const allTenantTransactions = await prisma.financial_transactions.findMany({
    where: { tenant_id: tenantId },
    select: {
      transaction_type: true,
      status: true,
      total_amount: true,
      currency: true,
    },
  })

  let totalVolume = 0
  let totalInflow = 0
  let totalOutflow = 0
  let totalRefunds = 0
  let pendingCount = 0

  for (const t of allTenantTransactions) {
    const amt = Number(t.total_amount || 0)

    if (t.status === 'pending') {
      pendingCount++
    }

    if (t.status === 'completed' || t.status === 'posted') {
      totalVolume += amt

      switch (t.transaction_type) {
        case 'sale':
        case 'income':
        case 'payment_in':
        case 'opening_balance':
          totalInflow += amt
          break

        case 'purchase':
        case 'expense':
        case 'payment_out':
          totalOutflow += amt
          break

        case 'refund':
          totalRefunds += amt
          totalOutflow += amt
          break

        case 'adjustment':
          // Neutral balance adjustment
          break
      }
    }
  }

  return {
    totalVolume,
    totalInflow,
    totalOutflow,
    totalRefunds,
    pendingCount,
    totalCount: allTenantTransactions.length,
  }
}

// ============================================================================
// 4. CREATE FINANCIAL TRANSACTION (ATOMIC)
// ============================================================================

export async function createFinancialTransaction(
  authUserId: string,
  input: CreateFinancialTransactionInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const transactionNumber = generateTransactionNumber(input.transaction_type)
  const currency = input.currency || 'USD'
  const status = input.status || 'completed'

  const items = input.items || []

  // Compute financial totals
  let computedSubtotal = new Prisma.Decimal(0)
  let computedTax = new Prisma.Decimal(0)
  let computedDiscount = new Prisma.Decimal(0)

  if (items.length > 0) {
    for (const item of items) {
      const qty = new Prisma.Decimal(item.quantity.toString())
      const price = new Prisma.Decimal(item.unit_price.toString())
      const lineTax = new Prisma.Decimal(item.tax_amount?.toString() || '0')
      const lineDisc = new Prisma.Decimal(item.discount_amount?.toString() || '0')

      const lineBase = qty.mul(price)
      computedSubtotal = computedSubtotal.add(lineBase)
      computedTax = computedTax.add(lineTax)
      computedDiscount = computedDiscount.add(lineDisc)
    }
  } else {
    computedSubtotal = new Prisma.Decimal(input.subtotal?.toString() || '0')
    computedTax = new Prisma.Decimal(input.tax_amount?.toString() || '0')
    computedDiscount = new Prisma.Decimal(input.discount_amount?.toString() || '0')
  }

  const grandTotal = input.total_amount != null
    ? new Prisma.Decimal(input.total_amount.toString())
    : computedSubtotal.add(computedTax).sub(computedDiscount)

  return await prisma.$transaction(async (tx) => {
    const createdTx = await tx.financial_transactions.create({
      data: {
        tenant_id: tenantId,
        transaction_number: transactionNumber,
        transaction_type: input.transaction_type,
        status,
        currency,
        subtotal: computedSubtotal,
        tax_amount: computedTax,
        discount_amount: computedDiscount,
        total_amount: grandTotal,
        notes: input.notes || null,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? {},
        ip_address: input.ip_address || null,
        user_agent: input.user_agent || null,
        reference_transaction_id: input.reference_transaction_id || null,
        sales_invoice_id: input.sales_invoice_id || null,
        sales_return_id: input.sales_return_id || null,
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      },
    })

    if (items.length > 0) {
      await tx.financial_transaction_details.createMany({
        data: items.map((item) => {
          const q = new Prisma.Decimal(item.quantity.toString())
          const p = new Prisma.Decimal(item.unit_price.toString())
          const d = new Prisma.Decimal(item.discount_amount?.toString() || '0')
          const t = new Prisma.Decimal(item.tax_amount?.toString() || '0')
          const sub = q.mul(p).sub(d).add(t)

          return {
            tenant_id: tenantId,
            transaction_id: createdTx.id,
            product_id: item.product_id,
            quantity: q,
            unit_price: p,
            discount_amount: d,
            tax_amount: t,
            subtotal: sub,
            sales_invoice_item_id: item.sales_invoice_item_id || null,
            sales_return_item_id: item.sales_return_item_id || null,
            created_by_user_id: tenantUserId,
            updated_by_user_id: tenantUserId,
          }
        }),
      })
    }

    return {
      id: createdTx.id,
      transaction_number: createdTx.transaction_number,
      status: createdTx.status,
      total_amount: Number(createdTx.total_amount),
      currency: createdTx.currency,
    }
  })
}

// ============================================================================
// 5. UPDATE TRANSACTION STATUS
// ============================================================================

export async function updateFinancialTransactionStatus(
  authUserId: string,
  id: string,
  status: string,
  notes?: string
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const existing = await prisma.financial_transactions.findFirst({
    where: { id, tenant_id: tenantId },
  })

  if (!existing) {
    throw new ApiError('Financial transaction not found.', 404)
  }

  const validStatuses = ['pending', 'completed', 'cancelled', 'voided', 'failed', 'refunded']
  if (!validStatuses.includes(status)) {
    throw new ApiError(`Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`, 400)
  }

  const updatedNotes = notes?.trim()
    ? existing.notes
      ? `${existing.notes}\n[${new Date().toISOString()}] Status changed to ${status}: ${notes.trim()}`
      : `[${new Date().toISOString()}] Status changed to ${status}: ${notes.trim()}`
    : existing.notes

  const updated = await prisma.financial_transactions.update({
    where: { id },
    data: {
      status,
      notes: updatedNotes,
      updated_by_user_id: tenantUserId,
      updated_at: new Date(),
    },
  })

  return {
    id: updated.id,
    transaction_number: updated.transaction_number,
    status: updated.status,
  }
}

// ============================================================================
// 6. REFUND FINANCIAL TRANSACTION
// ============================================================================

export async function refundFinancialTransaction(
  authUserId: string,
  input: RefundFinancialTransactionInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const original = await prisma.financial_transactions.findFirst({
    where: { id: input.originalTransactionId, tenant_id: tenantId },
  })

  if (!original) {
    throw new ApiError('Original financial transaction not found.', 404)
  }

  if (original.status !== 'completed' && original.status !== 'partially_refunded') {
    throw new ApiError(
      `Cannot refund transaction in status '${original.status}'. Only completed transactions can be refunded.`,
      400
    )
  }

  const refundTxNumber = generateTransactionNumber('refund')
  const refundAmount = input.amount != null
    ? new Prisma.Decimal(input.amount.toString())
    : original.total_amount

  return await prisma.$transaction(async (tx) => {
    // 1. Create linked refund transaction
    const refundTx = await tx.financial_transactions.create({
      data: {
        tenant_id: tenantId,
        transaction_number: refundTxNumber,
        transaction_type: 'refund',
        status: 'completed',
        currency: original.currency,
        subtotal: refundAmount,
        tax_amount: new Prisma.Decimal(0),
        discount_amount: new Prisma.Decimal(0),
        total_amount: refundAmount,
        notes: `Refund for ${original.transaction_number}. Reason: ${input.reason}`,
        reference_transaction_id: original.id,
        sales_invoice_id: original.sales_invoice_id,
        sales_return_id: original.sales_return_id,
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      },
    })

    // 2. If itemized refund items provided, insert details
    if (input.items && input.items.length > 0) {
      await tx.financial_transaction_details.createMany({
        data: input.items.map((item) => {
          const q = new Prisma.Decimal(item.quantity.toString())
          const p = new Prisma.Decimal(item.unit_price.toString())
          const d = new Prisma.Decimal(item.discount_amount?.toString() || '0')
          const t = new Prisma.Decimal(item.tax_amount?.toString() || '0')
          const sub = q.mul(p).sub(d).add(t)

          return {
            tenant_id: tenantId,
            transaction_id: refundTx.id,
            product_id: item.product_id,
            quantity: q,
            unit_price: p,
            discount_amount: d,
            tax_amount: t,
            subtotal: sub,
            created_by_user_id: tenantUserId,
            updated_by_user_id: tenantUserId,
          }
        }),
      })
    }

    // 3. Compute total past refunds for parent to determine if fully or partially refunded
    const pastRefunds = await tx.financial_transactions.findMany({
      where: {
        reference_transaction_id: original.id,
        transaction_type: 'refund',
        status: 'completed',
      },
      select: { total_amount: true },
    })

    const cumulativeRefunded = pastRefunds.reduce(
      (sum, r) => sum.add(r.total_amount),
      new Prisma.Decimal(0)
    )

    const newParentStatus = cumulativeRefunded.gte(original.total_amount)
      ? 'refunded'
      : 'partially_refunded'

    await tx.financial_transactions.update({
      where: { id: original.id },
      data: {
        status: newParentStatus,
        updated_at: new Date(),
        updated_by_user_id: tenantUserId,
      },
    })

    return {
      refund_id: refundTx.id,
      refund_transaction_number: refundTx.transaction_number,
      parent_status: newParentStatus,
      refunded_amount: Number(refundAmount),
    }
  })
}
