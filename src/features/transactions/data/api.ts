import { supabase } from '@/lib/supabase'
import { TransactionRow } from './schema'

export async function getTransactions(): Promise<TransactionRow[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(
      `
      id,
      transaction_number,
      transaction_type,
      status,
      total_amount,
      created_at
    `
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching transactions:', error)
    throw new Error('Failed to fetch transactions')
  }

  // Map database response to match the TransactionRow schema
  return (data || []).map((t) => ({
    id: t.id,
    transaction_number: t.transaction_number,
    type: t.transaction_type,
    status: t.status,
    total: Number(t.total_amount),
    date: new Date(t.created_at),
  }))
}

export type CreateTransactionPayload = {
  tenant_id: string
  clerk_user_id: string
  transaction_number: string
  transaction_type: string
  currency: string
  notes: string
  items: Array<{
    product_id: number
    quantity: number
    unit_price: number
    discount_amount: number
    tax_amount: number
  }>
}

export async function createTransaction(
  payload: CreateTransactionPayload
): Promise<string> {
  const { data, error } = await supabase.rpc('create_transaction', {
    p_tenant_id: payload.tenant_id,
    p_clerk_user_id: payload.clerk_user_id,
    p_transaction_number: payload.transaction_number,
    p_transaction_type: payload.transaction_type,
    p_currency: payload.currency,
    p_notes: payload.notes,
    p_items: payload.items,
  })

  if (error) {
    console.error('Error creating transaction:', error)
    throw new Error(error.message || 'Failed to create transaction')
  }

  return data as string
}
