'use server'

import prisma from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import type {
  invoice_status_enum,
  invoice_type_enum,
  invoice_payment_status_enum,
  payment_method_type_enum,
  payment_status_enum,
  discount_type_enum,
} from '@/generated/prisma/enums'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import { ApiError } from '@/server/utils/api-error'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface InvoiceItemInput {
  productVariantId: string
  productId?: string | null
  description?: string | null
  quantity: number | string | Prisma.Decimal
  unitPrice: number | string | Prisma.Decimal
  unitCost?: number | string | Prisma.Decimal
  discountType?: discount_type_enum | null
  discountValue?: number | string | Prisma.Decimal
  discountAmount?: number | string | Prisma.Decimal
  taxRateId?: string | null
  taxRate?: number | string | Prisma.Decimal
  taxAmount?: number | string | Prisma.Decimal
  warehouseId?: string | null
  batchId?: string | null
  skuSnapshot?: string | null
  productNameSnapshot?: string | null
  variantNameSnapshot?: string | null
  uomSnapshot?: string | null
}

export interface InvoicePaymentInput {
  paymentMethod: payment_method_type_enum
  amount: number | string | Prisma.Decimal
  currency?: string
  referenceNumber?: string | null
  notes?: string | null
  financialTransactionId?: string | null
  salesOrderPaymentId?: string | null
}

export interface CreateSalesInvoiceInput {
  invoiceNo?: string
  invoiceType?: invoice_type_enum
  sourceType?: 'POS' | 'SALES_ORDER' | 'MANUAL' | 'MARKETPLACE' | 'INVOICE'
  sourceId?: string | null
  branchId?: string
  storeId?: string | null
  warehouseId?: string | null
  posTerminalId?: string | null
  customerId?: string | null
  currencyId?: string | null
  channelId?: string | null
  priceListId?: string | null
  invoiceDate?: Date | string
  dueDate?: Date | string | null
  status?: invoice_status_enum
  items: InvoiceItemInput[]
  orderDiscountAmount?: number | string | Prisma.Decimal
  shippingAmount?: number | string | Prisma.Decimal
  notes?: string | null
  terms?: string | null
  initialPayments?: InvoicePaymentInput[]
}

export interface UpdateSalesInvoiceInput {
  customerId?: string | null
  warehouseId?: string | null
  currencyId?: string | null
  dueDate?: Date | string | null
  notes?: string | null
  terms?: string | null
  orderDiscountAmount?: number | string | Prisma.Decimal
  shippingAmount?: number | string | Prisma.Decimal
  items?: InvoiceItemInput[]
}

export interface RecordInvoicePaymentInput {
  paymentMethod: payment_method_type_enum
  amount: number | string | Prisma.Decimal
  currency?: string
  referenceNumber?: string | null
  notes?: string | null
  paymentDate?: Date | string
}

export interface ListSalesInvoicesFilter {
  search?: string
  status?: invoice_status_enum | 'all'
  paymentStatus?: invoice_payment_status_enum | 'all'
  invoiceType?: invoice_type_enum | 'all'
  customerId?: string
  storeId?: string
  warehouseId?: string
  sourceType?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  sortBy?: 'invoice_date' | 'created_at' | 'total_amount' | 'invoice_no'
  sortOrder?: 'asc' | 'desc'
}

export interface InvoiceReportParams {
  reportType: 'sales' | 'outstanding' | 'tax' | 'discount' | 'pos'
  dateFrom?: string
  dateTo?: string
  storeId?: string
  customerId?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function toDecimal(val: number | string | Prisma.Decimal | null | undefined, d = 0): Prisma.Decimal {
  if (val === null || val === undefined || val === '') return new Prisma.Decimal(d)
  if (val instanceof Prisma.Decimal) return val
  return new Prisma.Decimal(val)
}

export function serializeDecimal(val: unknown): number {
  if (val === null || val === undefined) return 0
  if (val instanceof Prisma.Decimal) return Number(val.toString())
  return Number(val) || 0
}

export function serializeInvoiceRecord<T extends Record<string, any>>(record: T): any {
  if (!record) return record

  const result: any = { ...record }

  // Decimal fields to convert to standard number
  const decimalFields = [
    'subtotal',
    'discount_value',
    'discount_amount',
    'tax_rate',
    'tax_amount',
    'shipping_amount',
    'rounding_amount',
    'total_amount',
    'paid_amount',
    'due_amount',
    'quantity',
    'unit_price',
    'gross_amount',
    'net_amount',
    'line_subtotal',
    'line_total',
    'unit_cost',
    'returned_quantity',
    'amount',
  ]

  for (const key of Object.keys(result)) {
    const val = result[key]
    if (decimalFields.includes(key) && val !== null && val !== undefined) {
      result[key] = serializeDecimal(val)
    } else if (val instanceof Date) {
      result[key] = val.toISOString()
    } else if (Array.isArray(val)) {
      result[key] = val.map((item) => (typeof item === 'object' && item !== null ? serializeInvoiceRecord(item) : item))
    } else if (typeof val === 'object' && val !== null && !(val instanceof Prisma.Decimal)) {
      result[key] = serializeInvoiceRecord(val)
    }
  }

  return result
}

// ============================================================================
// INVOICE NUMBER GENERATION
// ============================================================================

/**
 * Concurrency-safe, tenant-aware invoice sequence number generator.
 * Formats: INV-2026-000001
 */
export async function generateInvoiceNumber(
  tenantId: string,
  storeId?: string | null,
  prefix = 'INV',
  client?: Prisma.TransactionClient
): Promise<string> {
  const db = client ?? prisma
  const currentYear = new Date().getFullYear()

  const seq = await db.invoice_number_sequences.upsert({
    where: {
      tenant_id_store_id_prefix_fiscal_year: {
        tenant_id: tenantId,
        store_id: storeId ?? null,
        prefix,
        fiscal_year: currentYear,
      },
    },
    update: {
      last_number: { increment: 1 },
    },
    create: {
      tenant_id: tenantId,
      store_id: storeId ?? null,
      prefix,
      fiscal_year: currentYear,
      last_number: 1,
      format_template: '{prefix}-{year}-{seq}',
    },
  })

  const seqStr = String(seq.last_number).padStart(6, '0')
  return `${prefix}-${currentYear}-${seqStr}`
}

// ============================================================================
// CORE INVOICE OPERATIONS
// ============================================================================

/**
 * Creates a new Sales Invoice with full snapshot data and optional initial payments.
 */
export async function createSalesInvoice(
  authUserId: string,
  input: CreateSalesInvoiceInput,
  client?: Prisma.TransactionClient
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const executeCreate = async (tx: Prisma.TransactionClient) => {
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new ApiError('Sales invoice must have at least one line item.', 400)
    }

    // Generate invoice number if not provided
    const invoiceNo =
      input.invoiceNo ||
      (await generateInvoiceNumber(
        tenantId,
        input.storeId,
        input.invoiceType === 'credit_note' ? 'CN' : 'INV',
        tx
      ))

    // Pre-fetch variant snapshots for items that lack them
    const variantIdsToFetch = input.items
      .filter((i) => !i.skuSnapshot || !i.productNameSnapshot)
      .map((i) => i.productVariantId)

    const variantMap = new Map<string, any>()
    if (variantIdsToFetch.length > 0) {
      const variants = await tx.product_variants.findMany({
        where: { id: { in: variantIdsToFetch }, tenant_id: tenantId },
        include: {
          products: { select: { id: true, name: true, sku: true } },
        },
      })
      variants.forEach((v) => variantMap.set(v.id, v))
    }

    // Line totals calculation
    let calculatedSubtotal = new Prisma.Decimal(0)
    let calculatedTaxTotal = new Prisma.Decimal(0)
    let calculatedItemDiscountTotal = new Prisma.Decimal(0)

    const preparedItems = input.items.map((item, idx) => {
      const qty = toDecimal(item.quantity)
      const price = toDecimal(item.unitPrice)
      const cost = toDecimal(item.unitCost, 0)
      const gross = qty.times(price)

      let discount = toDecimal(item.discountAmount, 0)
      if (item.discountType === 'percentage' && item.discountValue) {
        discount = gross.times(toDecimal(item.discountValue)).dividedBy(100)
      }

      const taxableAmount = gross.minus(discount)
      const taxRate = toDecimal(item.taxRate, 0)
      let tax = toDecimal(item.taxAmount, 0)
      if (tax.isZero() && taxRate.gt(0)) {
        tax = taxableAmount.times(taxRate).dividedBy(100)
      }

      const lineTotal = taxableAmount.plus(tax)

      calculatedSubtotal = calculatedSubtotal.plus(gross)
      calculatedTaxTotal = calculatedTaxTotal.plus(tax)
      calculatedItemDiscountTotal = calculatedItemDiscountTotal.plus(discount)

      const variant = variantMap.get(item.productVariantId)

      return {
        tenant_id: tenantId,
        line_no: idx + 1,
        product_variant_id: item.productVariantId,
        product_id: item.productId ?? variant?.products?.id ?? null,
        description: item.description ?? variant?.products?.name ?? null,
        sku_snapshot: item.skuSnapshot ?? variant?.sku ?? variant?.products?.sku ?? null,
        product_name_snapshot: item.productNameSnapshot ?? variant?.products?.name ?? null,
        variant_name_snapshot: item.variantNameSnapshot ?? variant?.name ?? null,
        uom_snapshot: item.uomSnapshot ?? null,
        quantity: qty,
        unit_price: price,
        unit_cost: cost,
        gross_amount: gross,
        discount_type: item.discountType ?? null,
        discount_value: item.discountValue ? toDecimal(item.discountValue) : new Prisma.Decimal(0),
        discount_amount: discount,
        tax_rate_id: item.taxRateId ?? null,
        tax_rate: taxRate,
        tax_amount: tax,
        net_amount: taxableAmount,
        line_subtotal: gross.minus(discount),
        line_total: lineTotal,
        warehouse_id: item.warehouseId ?? input.warehouseId ?? null,
        batch_id: item.batchId ?? null,
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      }
    })

    const orderDiscount = toDecimal(input.orderDiscountAmount, 0)
    const totalDiscount = calculatedItemDiscountTotal.plus(orderDiscount)
    const shipping = toDecimal(input.shippingAmount, 0)
    const totalAmount = calculatedSubtotal.minus(totalDiscount).plus(calculatedTaxTotal).plus(shipping)

    // Initial payments processing
    let paidAmount = new Prisma.Decimal(0)
    const preparedPayments = (input.initialPayments || []).map((p) => {
      const pAmount = toDecimal(p.amount)
      paidAmount = paidAmount.plus(pAmount)
      return {
        tenant_id: tenantId,
        payment_method: p.paymentMethod,
        amount: pAmount,
        currency: p.currency ?? 'USD',
        status: 'completed' as payment_status_enum,
        reference_number: p.referenceNumber ?? null,
        notes: p.notes ?? null,
        financial_transaction_id: p.financialTransactionId ?? null,
        sales_order_payment_id: p.salesOrderPaymentId ?? null,
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      }
    })

    const dueAmount = totalAmount.minus(paidAmount).clamp(new Prisma.Decimal(0), totalAmount)

    // Determine status and payment status
    let paymentStatus: invoice_payment_status_enum = 'pending'
    if (paidAmount.gte(totalAmount) && totalAmount.gt(0)) {
      paymentStatus = 'paid'
    } else if (paidAmount.gt(0)) {
      paymentStatus = 'partially_paid'
    }

    let invoiceStatus: invoice_status_enum = input.status || 'draft'
    if (paymentStatus === 'paid' && invoiceStatus !== 'cancelled' && invoiceStatus !== 'void') {
      invoiceStatus = 'paid'
    }

    const invoice = await tx.sales_invoices.create({
      data: {
        tenant_id: tenantId,
        invoice_no: invoiceNo,
        invoice_type: input.invoiceType || 'sale',
        source_type: input.sourceType || 'MANUAL',
        source_id: input.sourceId ?? null,
        branch_id: input.branchId ?? '00000000-0000-0000-0000-000000000000',
        store_id: input.storeId ?? null,
        warehouse_id: input.warehouseId ?? null,
        pos_terminal_id: input.posTerminalId ?? null,
        customer_id: input.customerId ?? null,
        currency_id: input.currencyId ?? null,
        channel_id: input.channelId ?? null,
        price_list_id: input.priceListId ?? null,
        invoice_date: input.invoiceDate ? new Date(input.invoiceDate) : new Date(),
        due_date: input.dueDate ? new Date(input.dueDate) : null,
        status: invoiceStatus,
        payment_status: paymentStatus,
        subtotal: calculatedSubtotal,
        discount_amount: totalDiscount,
        tax_amount: calculatedTaxTotal,
        shipping_amount: shipping,
        rounding_amount: new Prisma.Decimal(0),
        total_amount: totalAmount,
        paid_amount: paidAmount,
        due_amount: dueAmount,
        notes: input.notes ?? null,
        terms: input.terms ?? null,
        posted_at: invoiceStatus === 'paid' || invoiceStatus === 'posted' ? new Date() : null,
        created_by: tenantUserId,
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
        sales_invoice_items: {
          create: preparedItems,
        },
        sales_invoice_payments: preparedPayments.length > 0 ? {
          create: preparedPayments,
        } : undefined,
      },
      include: {
        sales_invoice_items: true,
        sales_invoice_payments: true,
      },
    })

    return invoice
  }

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    if (client) {
      return await executeCreate(client)
    }
    return await prisma.$transaction(async (tx) => {
      return await executeCreate(tx)
    })
  })
}

/**
 * Issues a draft invoice, advancing status to 'issued'.
 */
export async function issueSalesInvoice(authUserId: string, invoiceId: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.sales_invoices.findFirst({
        where: { id: invoiceId, tenant_id: tenantId, deleted_at: null },
      })

      if (!invoice) {
        throw new ApiError('Sales invoice not found.', 404)
      }

      if (invoice.status !== 'draft') {
        throw new ApiError(`Only draft invoices can be issued. Current status: ${invoice.status}`, 400)
      }

      const updated = await tx.sales_invoices.update({
        where: { id: invoiceId },
        data: {
          status: 'issued',
          posted_at: new Date(),
          updated_by_user_id: tenantUserId,
        },
        include: {
          sales_invoice_items: true,
          sales_invoice_payments: true,
          customers: true,
        },
      })

      return serializeInvoiceRecord(updated)
    })
  })
}

/**
 * Records a payment against a sales invoice, updating paid and due amounts.
 */
export async function recordInvoicePayment(
  authUserId: string,
  invoiceId: string,
  input: RecordInvoicePaymentInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.sales_invoices.findFirst({
        where: { id: invoiceId, tenant_id: tenantId, deleted_at: null },
      })

      if (!invoice) {
        throw new ApiError('Sales invoice not found.', 404)
      }

      if (invoice.status === 'cancelled' || invoice.status === 'void') {
        throw new ApiError(`Cannot record payment on a ${invoice.status} invoice.`, 400)
      }

      const pAmount = toDecimal(input.amount)
      if (pAmount.lte(0)) {
        throw new ApiError('Payment amount must be greater than zero.', 400)
      }

      // Create payment record
      const paymentRecord = await tx.sales_invoice_payments.create({
        data: {
          tenant_id: tenantId,
          invoice_id: invoiceId,
          payment_method: input.paymentMethod,
          amount: pAmount,
          currency: input.currency ?? 'USD',
          status: 'completed',
          reference_number: input.referenceNumber ?? null,
          notes: input.notes ?? null,
          payment_date: input.paymentDate ? new Date(input.paymentDate) : new Date(),
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        },
      })

      const currentPaid = toDecimal(invoice.paid_amount, 0)
      const currentTotal = toDecimal(invoice.total_amount, 0)
      const newPaid = currentPaid.plus(pAmount)
      const newDue = currentTotal.minus(newPaid).clamp(new Prisma.Decimal(0), currentTotal)

      let newPaymentStatus: invoice_payment_status_enum = invoice.payment_status
      let newInvoiceStatus: invoice_status_enum = invoice.status

      if (newPaid.gte(currentTotal)) {
        newPaymentStatus = 'paid'
        newInvoiceStatus = 'paid'
      } else if (newPaid.gt(0)) {
        newPaymentStatus = 'partially_paid'
        newInvoiceStatus = 'partially_paid'
      }

      const updatedInvoice = await tx.sales_invoices.update({
        where: { id: invoiceId },
        data: {
          paid_amount: newPaid,
          due_amount: newDue,
          payment_status: newPaymentStatus,
          status: newInvoiceStatus,
          updated_by_user_id: tenantUserId,
        },
        include: {
          sales_invoice_items: true,
          sales_invoice_payments: true,
          customers: true,
        },
      })

      return {
        payment: serializeInvoiceRecord(paymentRecord),
        invoice: serializeInvoiceRecord(updatedInvoice),
      }
    })
  })
}

/**
 * Cancels an unpaid invoice.
 */
export async function cancelSalesInvoice(authUserId: string, invoiceId: string, reason?: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.sales_invoices.findFirst({
        where: { id: invoiceId, tenant_id: tenantId, deleted_at: null },
      })

      if (!invoice) {
        throw new ApiError('Sales invoice not found.', 404)
      }

      if (invoice.status === 'paid' || invoice.payment_status === 'paid') {
        throw new ApiError('Cannot cancel a fully paid invoice. Please void or issue a credit note instead.', 400)
      }

      const notes = [invoice.notes, reason ? `[Cancelled]: ${reason}` : '[Cancelled]']
        .filter(Boolean)
        .join('\n')

      const updated = await tx.sales_invoices.update({
        where: { id: invoiceId },
        data: {
          status: 'cancelled',
          notes,
          updated_by_user_id: tenantUserId,
        },
        include: {
          sales_invoice_items: true,
          sales_invoice_payments: true,
        },
      })

      return serializeInvoiceRecord(updated)
    })
  })
}

/**
 * Voids a posted or issued invoice with an audit reason.
 */
export async function voidSalesInvoice(authUserId: string, invoiceId: string, reason: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  if (!reason || !reason.trim()) {
    throw new ApiError('A reason is required to void an invoice.', 400)
  }

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.sales_invoices.findFirst({
        where: { id: invoiceId, tenant_id: tenantId, deleted_at: null },
      })

      if (!invoice) {
        throw new ApiError('Sales invoice not found.', 404)
      }

      if (invoice.status === 'void') {
        throw new ApiError('Invoice is already voided.', 400)
      }

      const notes = [invoice.notes, `[VOIDED - ${new Date().toISOString()}]: ${reason}`]
        .filter(Boolean)
        .join('\n')

      const updated = await tx.sales_invoices.update({
        where: { id: invoiceId },
        data: {
          status: 'void',
          notes,
          updated_by_user_id: tenantUserId,
        },
        include: {
          sales_invoice_items: true,
          sales_invoice_payments: true,
        },
      })

      return serializeInvoiceRecord(updated)
    })
  })
}

/**
 * Creates a Credit Note linked to an existing invoice.
 */
export async function createCreditNote(
  authUserId: string,
  originalInvoiceId: string,
  input: {
    items?: Array<{
      productVariantId: string
      quantity: number | string
      unitPrice: number | string
      reason?: string
    }>
    amount?: number | string
    reason?: string
  }
) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    return await prisma.$transaction(async (tx) => {
      const original = await tx.sales_invoices.findFirst({
        where: { id: originalInvoiceId, tenant_id: tenantId, deleted_at: null },
        include: { sales_invoice_items: true },
      })

      if (!original) {
        throw new ApiError('Original sales invoice not found.', 404)
      }

      const creditNoteItems: InvoiceItemInput[] = (input.items || original.sales_invoice_items).map((item) => ({
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        description: `Credit return for Inv #${original.invoice_no}`,
      }))

      const creditNote = await createSalesInvoice(
        authUserId,
        {
          invoiceType: 'credit_note',
          sourceType: 'INVOICE',
          sourceId: original.id,
          branchId: original.branch_id,
          storeId: original.store_id,
          warehouseId: original.warehouse_id,
          customerId: original.customer_id,
          currencyId: original.currency_id,
          channelId: original.channel_id,
          status: 'issued',
          items: creditNoteItems,
          notes: input.reason ?? `Credit note for invoice ${original.invoice_no}`,
        },
        tx
      )

      return serializeInvoiceRecord(creditNote)
    })
  })
}

/**
 * Retrieves a single invoice with all nested relations.
 */
export async function getInvoiceById(authUserId: string, invoiceId: string) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const invoice = await prisma.sales_invoices.findFirst({
      where: {
        id: invoiceId,
        tenant_id: tenantId,
        deleted_at: null,
      },
      include: {
        sales_invoice_items: {
          orderBy: { line_no: 'asc' },
        },
        sales_invoice_payments: {
          orderBy: { payment_date: 'desc' },
        },
        customers: {
          select: {
            id: true,
            code: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            address_line1: true,
            city: true,
            state: true,
            postal_code: true,
            country: true,
          },
        },
        warehouses: {
          select: { id: true, name: true, code: true },
        },
        currencies: {
          select: { id: true, code: true, symbol: true },
        },
        channels: {
          select: { id: true, name: true, channel_type: true },
        },
      },
    })

    if (!invoice) {
      throw new ApiError('Sales invoice not found.', 404)
    }

    return serializeInvoiceRecord(invoice)
  })
}

/**
 * Returns a paginated, filtered list of sales invoices.
 */
export async function listSalesInvoices(authUserId: string, filters: ListSalesInvoicesFilter) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const page = Math.max(1, filters.page || 1)
    const pageSize = Math.max(1, Math.min(100, filters.pageSize || 20))
    const skip = (page - 1) * pageSize

    const where: Prisma.sales_invoicesWhereInput = {
      tenant_id: tenantId,
      deleted_at: null,
    }

    if (filters.status && filters.status !== 'all') {
      where.status = filters.status
    }

    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      where.payment_status = filters.paymentStatus
    }

    if (filters.invoiceType && filters.invoiceType !== 'all') {
      where.invoice_type = filters.invoiceType
    }

    if (filters.customerId) {
      where.customer_id = filters.customerId
    }

    if (filters.storeId) {
      where.store_id = filters.storeId
    }

    if (filters.warehouseId) {
      where.warehouse_id = filters.warehouseId
    }

    if (filters.sourceType) {
      where.source_type = filters.sourceType
    }

    if (filters.dateFrom || filters.dateTo) {
      where.invoice_date = {}
      if (filters.dateFrom) {
        where.invoice_date.gte = new Date(filters.dateFrom)
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo)
        to.setHours(23, 59, 59, 999)
        where.invoice_date.lte = to
      }
    }

    if (filters.search && filters.search.trim()) {
      const s = filters.search.trim()
      where.OR = [
        { invoice_no: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
        {
          customers: {
            OR: [
              { first_name: { contains: s, mode: 'insensitive' } },
              { last_name: { contains: s, mode: 'insensitive' } },
              { code: { contains: s, mode: 'insensitive' } },
              { email: { contains: s, mode: 'insensitive' } },
              { phone: { contains: s, mode: 'insensitive' } },
            ],
          },
        },
      ]
    }

    const orderBy: Prisma.sales_invoicesOrderByWithRelationInput = {}
    const sortField = filters.sortBy || 'created_at'
    const sortDir = filters.sortOrder || 'desc'
    orderBy[sortField] = sortDir

    const [total, items] = await Promise.all([
      prisma.sales_invoices.count({ where }),
      prisma.sales_invoices.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          customers: {
            select: {
              id: true,
              code: true,
              first_name: true,
              last_name: true,
              email: true,
              phone: true,
            },
          },
          warehouses: {
            select: { id: true, name: true, code: true },
          },
          currencies: {
            select: { id: true, code: true, symbol: true },
          },
          _count: {
            select: {
              sales_invoice_items: true,
              sales_invoice_payments: true,
            },
          },
        },
      }),
    ])

    return {
      items: items.map(serializeInvoiceRecord),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  })
}

/**
 * Calculates high-level dashboard metrics for the Invoices module.
 */
export async function getInvoiceDashboardStats(
  authUserId: string,
  dateRange?: { from?: string; to?: string }
) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const where: Prisma.sales_invoicesWhereInput = {
      tenant_id: tenantId,
      deleted_at: null,
    }

    if (dateRange?.from || dateRange?.to) {
      where.invoice_date = {}
      if (dateRange.from) where.invoice_date.gte = new Date(dateRange.from)
      if (dateRange.to) {
        const to = new Date(dateRange.to)
        to.setHours(23, 59, 59, 999)
        where.invoice_date.lte = to
      }
    }

    const [aggregates, countByStatus, countByPaymentStatus, recentInvoices] = await Promise.all([
      prisma.sales_invoices.aggregate({
        where,
        _sum: {
          total_amount: true,
          paid_amount: true,
          due_amount: true,
          tax_amount: true,
          discount_amount: true,
        },
        _count: {
          id: true,
        },
      }),
      prisma.sales_invoices.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
        _sum: { total_amount: true },
      }),
      prisma.sales_invoices.groupBy({
        by: ['payment_status'],
        where,
        _count: { id: true },
        _sum: { total_amount: true, due_amount: true },
      }),
      prisma.sales_invoices.findMany({
        where,
        take: 5,
        orderBy: { created_at: 'desc' },
        include: {
          customers: {
            select: { first_name: true, last_name: true },
          },
        },
      }),
    ])

    return {
      totalInvoiced: serializeDecimal(aggregates._sum.total_amount),
      totalPaid: serializeDecimal(aggregates._sum.paid_amount),
      totalDue: serializeDecimal(aggregates._sum.due_amount),
      totalTax: serializeDecimal(aggregates._sum.tax_amount),
      totalDiscount: serializeDecimal(aggregates._sum.discount_amount),
      totalInvoicesCount: aggregates._count.id,
      statusBreakdown: countByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
        amount: serializeDecimal(s._sum.total_amount),
      })),
      paymentStatusBreakdown: countByPaymentStatus.map((p) => ({
        paymentStatus: p.payment_status,
        count: p._count.id,
        amount: serializeDecimal(p._sum.total_amount),
        dueAmount: serializeDecimal(p._sum.due_amount),
      })),
      recentInvoices: recentInvoices.map(serializeInvoiceRecord),
    }
  })
}

/**
 * Generates structured reports across invoices (Sales, Tax, Discount, Outstanding, POS).
 */
export async function getInvoiceReports(authUserId: string, params: InvoiceReportParams) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const where: Prisma.sales_invoicesWhereInput = {
      tenant_id: tenantId,
      deleted_at: null,
    }

    if (params.dateFrom || params.dateTo) {
      where.invoice_date = {}
      if (params.dateFrom) where.invoice_date.gte = new Date(params.dateFrom)
      if (params.dateTo) {
        const to = new Date(params.dateTo)
        to.setHours(23, 59, 59, 999)
        where.invoice_date.lte = to
      }
    }

    if (params.storeId) {
      where.store_id = params.storeId
    }

    if (params.customerId) {
      where.customer_id = params.customerId
    }

    switch (params.reportType) {
      case 'outstanding': {
        where.due_amount = { gt: 0 }
        where.status = { notIn: ['cancelled', 'void'] }
        const invoices = await prisma.sales_invoices.findMany({
          where,
          orderBy: { due_date: 'asc' },
          include: {
            customers: {
              select: { id: true, code: true, first_name: true, last_name: true, phone: true, email: true },
            },
          },
        })

        const totalDue = invoices.reduce((acc, inv) => acc + serializeDecimal(inv.due_amount), 0)
        return {
          reportType: 'outstanding',
          summary: { totalDue, invoiceCount: invoices.length },
          items: invoices.map(serializeInvoiceRecord),
        }
      }

      case 'tax': {
        const invoices = await prisma.sales_invoices.findMany({
          where: {
            ...where,
            tax_amount: { gt: 0 },
            status: { notIn: ['cancelled', 'void'] },
          },
          include: {
            sales_invoice_items: {
              where: { tax_amount: { gt: 0 } },
              select: {
                line_no: true,
                sku_snapshot: true,
                product_name_snapshot: true,
                tax_rate: true,
                tax_amount: true,
                net_amount: true,
              },
            },
          },
        })

        const totalTax = invoices.reduce((acc, inv) => acc + serializeDecimal(inv.tax_amount), 0)
        const taxableAmount = invoices.reduce((acc, inv) => acc + (serializeDecimal(inv.total_amount) - serializeDecimal(inv.tax_amount)), 0)

        return {
          reportType: 'tax',
          summary: { totalTax, taxableAmount, invoiceCount: invoices.length },
          items: invoices.map(serializeInvoiceRecord),
        }
      }

      case 'discount': {
        const invoices = await prisma.sales_invoices.findMany({
          where: {
            ...where,
            discount_amount: { gt: 0 },
            status: { notIn: ['cancelled', 'void'] },
          },
          include: {
            inv_sales_invoice_discounts: true,
            inv_sales_invoice_item_discounts: true,
          },
        })

        const totalDiscount = invoices.reduce((acc, inv) => acc + serializeDecimal(inv.discount_amount), 0)
        return {
          reportType: 'discount',
          summary: { totalDiscount, invoiceCount: invoices.length },
          items: invoices.map(serializeInvoiceRecord),
        }
      }

      case 'pos': {
        where.source_type = 'POS'
        const invoices = await prisma.sales_invoices.findMany({
          where,
          orderBy: { created_at: 'desc' },
          include: {
            sales_invoice_payments: true,
            customers: {
              select: { first_name: true, last_name: true },
            },
          },
        })

        const totalSales = invoices.reduce((acc, inv) => acc + serializeDecimal(inv.total_amount), 0)
        return {
          reportType: 'pos',
          summary: { totalSales, count: invoices.length },
          items: invoices.map(serializeInvoiceRecord),
        }
      }

      case 'sales':
      default: {
        const invoices = await prisma.sales_invoices.findMany({
          where,
          orderBy: { invoice_date: 'desc' },
          include: {
            customers: {
              select: { id: true, code: true, first_name: true, last_name: true },
            },
          },
        })

        const totalAmount = invoices.reduce((acc, inv) => acc + serializeDecimal(inv.total_amount), 0)
        const totalPaid = invoices.reduce((acc, inv) => acc + serializeDecimal(inv.paid_amount), 0)
        const totalDue = invoices.reduce((acc, inv) => acc + serializeDecimal(inv.due_amount), 0)

        return {
          reportType: 'sales',
          summary: { totalAmount, totalPaid, totalDue, invoiceCount: invoices.length },
          items: invoices.map(serializeInvoiceRecord),
        }
      }
    }
  })
}
