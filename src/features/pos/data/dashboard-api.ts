import { supabase } from '@/lib/supabase'

export async function getShiftMetrics() {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('total_amount, transaction_type')
    .gte('created_at', startOfDay.toISOString())

  if (error) throw error

  const salesToday = (transactions || [])
    .filter((t) => t.transaction_type === 'sale')
    .reduce((acc, t) => acc + Number(t.total_amount), 0)

  const countToday = (transactions || []).filter(
    (t) => t.transaction_type === 'sale'
  ).length

  return {
    salesToday,
    countToday,
    averageOrderValue: countToday > 0 ? salesToday / countToday : 0,
  }
}

export async function getTopSellers() {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('transaction_details')
    .select(
      `
      product_id,
      quantity,
      products ( name )
    `
    )
    .gte('created_at', startOfDay.toISOString())

  if (error) throw error

  // Group by product_id
  const grouping: Record<number, { name: string; quantity: number }> = {}
  data?.forEach((d) => {
    const pid = d.product_id
    if (!grouping[pid]) {
      grouping[pid] = {
        name: (d.products as unknown as { name: string })?.name || 'Unknown',
        quantity: 0,
      }
    }
    grouping[pid].quantity += Number(d.quantity)
  })

  return Object.entries(grouping)
    .map(([id, info]) => ({ id: Number(id), ...info }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
}

export async function getLowStock() {
  const { data, error } = await supabase
    .from('inventory')
    .select(
      `
      product_id,
      quantity,
      products ( name, sku )
    `
    )
    .lt('quantity', 10)
    .order('quantity', { ascending: true })
    .limit(10)

  if (error) throw error
  return data || []
}
