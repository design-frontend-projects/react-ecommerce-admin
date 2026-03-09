import { supabase } from '@/lib/supabase'

export type PosProduct = {
  product_id: number
  name: string
  sku: string
  barcode: string | null
  base_price: number
  stock_quantity: number
}

export async function getPosProducts(): Promise<PosProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(
      `
      product_id,
      name,
      sku,
      barcode,
      base_price,
      inventory ( quantity )
    `
    )
    .eq('is_active', true)
    .order('name')

  if (error) throw error

  return (data || []).map((p) => ({
    product_id: p.product_id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    base_price: Number(p.base_price),
    stock_quantity: p.inventory
      ? Number((p.inventory as unknown as { quantity: number }).quantity || 0)
      : 0,
  }))
}

export async function createPosTransaction(payload: {
  tenant_id: string
  clerk_user_id: string
  transaction_number: string
  notes: string
  items: Array<{
    product_id: number
    quantity: number
    unit_price: number
    discount_amount: number
    tax_amount: number
  }>
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_transaction', {
    p_tenant_id: payload.tenant_id,
    p_clerk_user_id: payload.clerk_user_id,
    p_transaction_number: payload.transaction_number,
    p_transaction_type: 'sale',
    p_currency: 'USD',
    p_notes: payload.notes,
    p_items: payload.items,
  })

  if (error) throw error

  return data as string
}
