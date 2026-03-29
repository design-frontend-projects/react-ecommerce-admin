import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PosTransactionDetail {
  detail_id: number
  product_id: number
  quantity: number
  unit_price: number
  discount_amount: number
  tax_amount: number
  subtotal: number
  products: { name: string; sku: string } | null
}

export interface PosTransactionRecord {
  transaction_id: string
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
}

export interface CreateRefundPayload {
  /** UUID of the original transaction being refunded */
  saleId: string
  /** The cash/card amount being refunded */
  refundAmount: number
  reason: string
  /** clerk userId of the manager who authorized */
  processedBy: string
  notes?: string
  /** the number of the transaction id */
  orderId: string
  /** clerk user id of the manager who authorized */
  clerk_user_id: string
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch the last 50 completed POS sales from the last 7 days.
 * Used for the transaction-lookup step in the refund dialog.
 */
export async function getRecentPosSales(
  transactionNumber: string
): Promise<PosTransactionRecord[]> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data, error } = await supabase
    .from('transactions')
    .select(
      `
      id,
      transaction_number,
      transaction_type,
      tenant_id,
      clerk_user_id,
      status,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      notes,
      created_at,
      transaction_details (
        transaction_id,
        product_id,
        quantity,
        discount_amount,
        tax_amount,
        subtotal,
        products ( name, sku )
      )
    `
    )
    .eq('transaction_type', 'sale')
    .eq('transaction_number', transactionNumber)
    .eq('status', 'completed')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return (data ?? []) as unknown as PosTransactionRecord[]
}

/**
 * Fetch a single transaction by its UUID with full line-item details.
 */
export async function getTransactionById(
  transactionId: string
): Promise<PosTransactionRecord | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select(
      `
      transaction_id,
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
        detail_id,
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
    .eq('transaction_id', transactionId)
    .maybeSingle()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw error
  }
  return data as unknown as PosTransactionRecord
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Insert a refund record into the `refunds` table AND create a corresponding
 * `transactions` row for auditing / reporting.
 * Returns the new refund_id on success.
 */
export async function createRefund(
  payload: CreateRefundPayload
): Promise<string> {
  // 1. Insert into `refunds`
  const { data, error } = await supabase
    .from('refunds')
    .insert({
      // sale_id: payload.saleId,
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

  // 2. Fetch the original transaction to inherit tenant_id, currency, etc.
  const { data: originalTx, error: txError } = await supabase
    .from('transactions')
    .select('id, tenant_id, clerk_user_id, currency, transaction_number')
    .eq('transaction_number', payload.orderId)
    .maybeSingle()

  if (txError) {
    // eslint-disable-next-line no-console
    console.error(
      'Failed to fetch original transaction for refund sync:',
      txError
    )
    // Return the refund_id anyway — the refund itself succeeded
    return String((data as { refund_id: string | number }).refund_id)
  }

  // 3. Build notes string
  const refundNotes = [
    `Refund: ${payload.reason}`,
    payload.notes ? payload.notes : null,
  ]
    .filter(Boolean)
    .join('. ')

  // 4. Insert a mirrored record in `transactions`
  const { error: txInsertError } = await supabase.from('transactions').insert({
    tenant_id: originalTx.tenant_id,
    clerk_user_id: originalTx.clerk_user_id,
    transaction_number: `REF-${originalTx.transaction_number}`,
    transaction_type: 'refund',
    status: 'completed',
    currency: originalTx.currency,
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
