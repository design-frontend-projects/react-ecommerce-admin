import { supabase } from '@/lib/supabase'

export interface PosTransactionDetail {
  id: string
  transaction_id: string
  product_id: number
  quantity: number
  unit_price: number
  discount_amount: number
  tax_amount: number
  subtotal: number
  products: { name: string; sku: string } | null
}

export interface PosLatestRefund {
  refund_id: number | string
  order_id: string | null
  refund_date: string | null
  refund_amount: number | string
  reason: string | null
  notes: string | null
  refund_status: string | null
}

export interface PosTransactionRecord {
  id: string
  transaction_number: string
  transaction_type: string
  status: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  notes: string | null
  created_at: string
  transaction_details: PosTransactionDetail[]
  isRefunded: boolean
  latestRefund: PosLatestRefund | null
}

export interface CreateRefundPayload {
  saleId: string
  refundAmount: number
  reason: string
  processedBy: string
  notes?: string
  orderId: string
  clerk_user_id: string
}

interface RefundLookupRow {
  refund_id: number | string
  order_id: string | null
  refund_date: string | null
  refund_amount: number | string | null
  reason: string | null
  notes: string | null
  refund_status: string | null
}

/**
 * Fetch recent completed POS sales from the last 7 days.
 * If search is provided, apply partial matching on transaction_number.
 * Each sale row is enriched with refund state using refunds.order_id.
 */
export async function getRecentPosSales(
  search = ''
): Promise<PosTransactionRecord[]> {
  const normalizedSearch = search.trim()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  let query = supabase
    .from('transactions')
    .select(
      `
      id,
      transaction_number,
      transaction_type,
      status,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      notes,
      created_at,
      transaction_details (
        id,
        transaction_id,
        product_id,
        quantity,
        unit_price,
        discount_amount,
        tax_amount,
        subtotal,
        products ( name, sku )
      )
    `
    )
    .eq('transaction_type', 'sale')
    .eq('status', 'completed')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  if (normalizedSearch.length > 0) {
    query = query.ilike('transaction_number', `%${normalizedSearch}%`)
  }

  const { data, error } = await query
  if (error) throw error

  const baseTransactions = (data ?? []) as unknown as Array<
    Omit<PosTransactionRecord, 'isRefunded' | 'latestRefund'>
  >

  if (baseTransactions.length === 0) return []

  const transactionNumbers = baseTransactions.map((tx) => tx.transaction_number)

  const { data: refunds, error: refundsError } = await supabase
    .from('refunds')
    .select(
      'refund_id, order_id, refund_date, refund_amount, reason, notes, refund_status'
    )
    .in('order_id', transactionNumbers)
    .order('refund_date', { ascending: false })

  if (refundsError) throw refundsError

  const latestRefundByOrder = new Map<string, PosLatestRefund>()
  for (const refund of (refunds ?? []) as RefundLookupRow[]) {
    const orderId = refund.order_id
    if (!orderId || latestRefundByOrder.has(orderId)) continue

    latestRefundByOrder.set(orderId, {
      refund_id: refund.refund_id,
      order_id: refund.order_id,
      refund_date: refund.refund_date,
      refund_amount: refund.refund_amount ?? 0,
      reason: refund.reason,
      notes: refund.notes,
      refund_status: refund.refund_status,
    })
  }

  return baseTransactions.map((tx) => {
    const latestRefund = latestRefundByOrder.get(tx.transaction_number) ?? null
    return {
      ...tx,
      isRefunded: Boolean(latestRefund),
      latestRefund,
    }
  })
}

/**
 * Fetch one completed sale transaction by UUID with details and refund state.
 */
export async function getTransactionById(
  transactionId: string
): Promise<PosTransactionRecord | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select(
      `
      id,
      transaction_number,
      transaction_type,
      status,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      notes,
      created_at,
      transaction_details (
        id,
        transaction_id,
        product_id,
        quantity,
        unit_price,
        discount_amount,
        tax_amount,
        subtotal,
        products ( name, sku )
      )
    `
    )
    .eq('id', transactionId)
    .eq('transaction_type', 'sale')
    .eq('status', 'completed')
    .maybeSingle()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  if (!data) return null

  const baseTx = data as unknown as Omit<
    PosTransactionRecord,
    'isRefunded' | 'latestRefund'
  >

  const { data: refunds, error: refundsError } = await supabase
    .from('refunds')
    .select(
      'refund_id, order_id, refund_date, refund_amount, reason, notes, refund_status'
    )
    .eq('order_id', baseTx.transaction_number)
    .order('refund_date', { ascending: false })
    .limit(1)

  if (refundsError) throw refundsError

  const latestRefundRow = (refunds?.[0] ?? null) as RefundLookupRow | null
  const latestRefund: PosLatestRefund | null = latestRefundRow
    ? {
        refund_id: latestRefundRow.refund_id,
        order_id: latestRefundRow.order_id,
        refund_date: latestRefundRow.refund_date,
        refund_amount: latestRefundRow.refund_amount ?? 0,
        reason: latestRefundRow.reason,
        notes: latestRefundRow.notes,
        refund_status: latestRefundRow.refund_status,
      }
    : null

  return {
    ...baseTx,
    isRefunded: Boolean(latestRefund),
    latestRefund,
  }
}

/**
 * Insert a refund record and mirror it in transactions for audit/reporting.
 * Returns the newly created refund_id.
 */
export async function createRefund(
  payload: CreateRefundPayload
): Promise<string> {
  const { data, error } = await supabase
    .from('refunds')
    .insert({
      order_id: payload.orderId,
      refund_amount: payload.refundAmount,
      reason: payload.reason,
      processed_by: payload.processedBy,
      notes: payload.notes ?? null,
      clerk_user_id: payload.clerk_user_id,
    })
    .select('refund_id')
    .maybeSingle()

  if (error) throw error

  const { data: originalTx, error: txError } = await supabase
    .from('transactions')
    .select(
      'id, tenant_id, clerk_user_id, currency, transaction_number, sales_invoice_id'
    )
    .eq('transaction_number', payload.orderId)
    .maybeSingle()

  if (txError || !originalTx) {
    // eslint-disable-next-line no-console
    console.error(
      'Failed to fetch original transaction for refund sync:',
      txError
    )
    return String((data as { refund_id: string | number }).refund_id)
  }

  const refundNotes = [
    `Refund: ${payload.reason}`,
    payload.notes ? payload.notes : null,
  ]
    .filter(Boolean)
    .join('. ')

  const { error: txInsertError } = await supabase.from('transactions').insert({
    tenant_id: originalTx.tenant_id,
    clerk_user_id: originalTx.clerk_user_id,
    transaction_number: `REF-${originalTx.transaction_number}`,
    transaction_type: 'refund',
    status: 'completed',
    currency: originalTx.currency,
    sales_invoice_id: originalTx.sales_invoice_id ?? null,
    subtotal: -Math.abs(payload.refundAmount),
    tax_amount: 0,
    discount_amount: 0,
    total_amount: -Math.abs(payload.refundAmount),
    reference_transaction_id: originalTx.id,
    notes: refundNotes,
  })

  if (txInsertError) {
    // eslint-disable-next-line no-console
    console.error('Failed to create refund transaction record:', txInsertError)
  }

  return String((data as { refund_id: string | number }).refund_id)
}
