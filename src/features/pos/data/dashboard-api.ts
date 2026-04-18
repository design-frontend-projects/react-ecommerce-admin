import { supabase } from '@/lib/supabase'

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

export type ShiftRangeDays = 1 | 7 | 15 | 30

export interface ShiftSaleTransactionRow {
  id: string
  transaction_number: string
  transaction_type: string
  status: string
  total_amount: number | string | null
  created_at: string | null
}

export interface ShiftRefundRow {
  refund_id: number | string
  order_id: string | null
  refund_date: string | null
  refund_amount: number | string | null
  reason: string | null
}

export interface ShiftTransactionDetailRow {
  id: string
  transaction_id: string
  product_id: number
  quantity: number | string | null
  unit_price: number | string | null
  subtotal: number | string | null
  products: {
    name?: string | null
    sku?: string | null
  } | null
}

export interface ShiftDashboardKpis {
  grossSales: number
  refundAmount: number
  netSales: number
  orderCount: number
  avgOrderValue: number
  itemsSold: number
  refundCount: number
  refundRate: number
}

export interface ShiftTrendPoint {
  key: string
  label: string
  bucketStart: string
  sales: number
  refunds: number
  net: number
}

export interface ShiftTopProduct {
  productId: number
  name: string
  sku: string | null
  quantitySold: number
  revenue: number
}

export interface ShiftActivityItem {
  id: string
  type: 'sale' | 'refund'
  reference: string
  timestamp: string
  amount: number
  note: string | null
}

export interface ShiftDashboardAnalytics {
  rangeDays: ShiftRangeDays
  startAt: string
  endAt: string
  kpis: ShiftDashboardKpis
  trend: ShiftTrendPoint[]
  topProducts: ShiftTopProduct[]
  recentActivity: ShiftActivityItem[]
}

const toNumber = (value: number | string | null | undefined) =>
  Number(value ?? 0) || 0

const floorUtcHour = (date: Date) => {
  const next = new Date(date)
  next.setUTCMinutes(0, 0, 0)
  return next
}

const utcDayKey = (date: Date) => {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const hourLabel = (date: Date) => {
  const hour = String(date.getUTCHours()).padStart(2, '0')
  return `${hour}:00`
}

const dayLabel = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)

const buildRangeStart = (range: ShiftRangeDays, now: Date) =>
  new Date(now.getTime() - range * DAY_MS)

type TrendBucket = {
  key: string
  label: string
  bucketStart: string
  sales: number
  refunds: number
}

const buildTrendBuckets = (range: ShiftRangeDays, now: Date): TrendBucket[] => {
  if (range === 1) {
    const endHour = floorUtcHour(now)
    const firstHour = new Date(endHour.getTime() - 23 * HOUR_MS)
    return Array.from({ length: 24 }, (_, idx) => {
      const bucketDate = new Date(firstHour.getTime() + idx * HOUR_MS)
      return {
        key: bucketDate.toISOString(),
        label: hourLabel(bucketDate),
        bucketStart: bucketDate.toISOString(),
        sales: 0,
        refunds: 0,
      }
    })
  }

  const startDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  startDay.setUTCDate(startDay.getUTCDate() - (range - 1))

  return Array.from({ length: range }, (_, idx) => {
    const bucketDate = new Date(startDay.getTime() + idx * DAY_MS)
    return {
      key: utcDayKey(bucketDate),
      label: dayLabel(bucketDate),
      bucketStart: bucketDate.toISOString(),
      sales: 0,
      refunds: 0,
    }
  })
}

export function buildShiftDashboardAnalytics({
  range,
  salesTransactions,
  refundRows,
  transactionDetails,
  now = new Date(),
}: {
  range: ShiftRangeDays
  salesTransactions: ShiftSaleTransactionRow[]
  refundRows: ShiftRefundRow[]
  transactionDetails: ShiftTransactionDetailRow[]
  now?: Date
}): ShiftDashboardAnalytics {
  const startAt = buildRangeStart(range, now)

  const inWindow = (isoString: string | null | undefined) => {
    if (!isoString) return false
    const ts = new Date(isoString).getTime()
    return ts >= startAt.getTime() && ts <= now.getTime()
  }

  const filteredSales = salesTransactions.filter(
    (tx) =>
      tx.transaction_type === 'sale' &&
      tx.status === 'completed' &&
      inWindow(tx.created_at)
  )

  const filteredRefunds = refundRows.filter((refund) =>
    inWindow(refund.refund_date)
  )

  const saleIdSet = new Set(filteredSales.map((tx) => tx.id))
  const filteredDetails = transactionDetails.filter((detail) =>
    saleIdSet.has(detail.transaction_id)
  )

  const grossSales = filteredSales.reduce(
    (sum, tx) => sum + toNumber(tx.total_amount),
    0
  )
  const refundAmount = filteredRefunds.reduce(
    (sum, refund) => sum + Math.abs(toNumber(refund.refund_amount)),
    0
  )
  const orderCount = filteredSales.length
  const itemsSold = filteredDetails.reduce(
    (sum, detail) => sum + toNumber(detail.quantity),
    0
  )
  const refundCount = filteredRefunds.length

  const productMap = new Map<number, ShiftTopProduct>()
  filteredDetails.forEach((detail) => {
    const qty = toNumber(detail.quantity)
    const revenue =
      detail.subtotal !== null && detail.subtotal !== undefined
        ? toNumber(detail.subtotal)
        : qty * toNumber(detail.unit_price)

    const existing = productMap.get(detail.product_id)
    if (existing) {
      existing.quantitySold += qty
      existing.revenue += revenue
      return
    }

    productMap.set(detail.product_id, {
      productId: detail.product_id,
      name: detail.products?.name || `Product #${detail.product_id}`,
      sku: detail.products?.sku || null,
      quantitySold: qty,
      revenue,
    })
  })

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue
      return b.quantitySold - a.quantitySold
    })
    .slice(0, 8)

  const trend = buildTrendBuckets(range, now)
  const trendIndex = new Map<string, number>(
    trend.map((bucket, idx) => [bucket.key, idx])
  )

  const bucketKey = (timestamp: string) => {
    const ts = new Date(timestamp)
    if (range === 1) return floorUtcHour(ts).toISOString()
    return utcDayKey(ts)
  }

  filteredSales.forEach((tx) => {
    if (!tx.created_at) return
    const key = bucketKey(tx.created_at)
    const idx = trendIndex.get(key)
    if (idx === undefined) return
    trend[idx].sales += toNumber(tx.total_amount)
  })

  filteredRefunds.forEach((refund) => {
    if (!refund.refund_date) return
    const key = bucketKey(refund.refund_date)
    const idx = trendIndex.get(key)
    if (idx === undefined) return
    trend[idx].refunds += Math.abs(toNumber(refund.refund_amount))
  })

  const recentActivity: ShiftActivityItem[] = [
    ...filteredSales.map((tx) => ({
      id: tx.id,
      type: 'sale' as const,
      reference: tx.transaction_number,
      timestamp: tx.created_at || now.toISOString(),
      amount: toNumber(tx.total_amount),
      note: null,
    })),
    ...filteredRefunds.map((refund) => ({
      id: `refund-${refund.refund_id}`,
      type: 'refund' as const,
      reference: refund.order_id || `REF-${refund.refund_id}`,
      timestamp: refund.refund_date || now.toISOString(),
      amount: -Math.abs(toNumber(refund.refund_amount)),
      note: refund.reason,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 25)

  return {
    rangeDays: range,
    startAt: startAt.toISOString(),
    endAt: now.toISOString(),
    kpis: {
      grossSales,
      refundAmount,
      netSales: grossSales - refundAmount,
      orderCount,
      avgOrderValue: orderCount > 0 ? grossSales / orderCount : 0,
      itemsSold,
      refundCount,
      refundRate: orderCount > 0 ? (refundCount / orderCount) * 100 : 0,
    },
    trend: trend.map((bucket) => ({
      ...bucket,
      net: bucket.sales - bucket.refunds,
    })),
    topProducts,
    recentActivity,
  }
}

export async function getShiftDashboardAnalytics(
  range: ShiftRangeDays
): Promise<ShiftDashboardAnalytics> {
  const now = new Date()
  const startAt = buildRangeStart(range, now)

  const [{ data: salesRows, error: salesError }, { data: refundRows, error: refundError }] =
    await Promise.all([
      supabase
        .from('transactions')
        .select(
          'id, transaction_number, transaction_type, status, total_amount, created_at'
        )
        .eq('transaction_type', 'sale')
        .eq('status', 'completed')
        .gte('created_at', startAt.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('refunds')
        .select('refund_id, order_id, refund_date, refund_amount, reason')
        .gte('refund_date', startAt.toISOString())
        .order('refund_date', { ascending: false }),
    ])

  if (salesError) throw salesError
  if (refundError) throw refundError

  const saleIds = (salesRows || []).map((row) => row.id)
  let detailRows: ShiftTransactionDetailRow[] = []

  if (saleIds.length > 0) {
    const { data: details, error: detailsError } = await supabase
      .from('transaction_details')
      .select(
        `
          id,
          transaction_id,
          product_id,
          quantity,
          unit_price,
          subtotal,
          products ( name, sku )
        `
      )
      .in('transaction_id', saleIds)

    if (detailsError) throw detailsError
    detailRows = (details ?? []) as ShiftTransactionDetailRow[]
  }

  return buildShiftDashboardAnalytics({
    range,
    salesTransactions: (salesRows ?? []) as ShiftSaleTransactionRow[],
    refundRows: (refundRows ?? []) as ShiftRefundRow[],
    transactionDetails: detailRows,
    now,
  })
}

export async function getShiftMetrics() {
  const analytics = await getShiftDashboardAnalytics(1)
  return {
    salesToday: analytics.kpis.grossSales,
    countToday: analytics.kpis.orderCount,
    averageOrderValue: analytics.kpis.avgOrderValue,
  }
}

export async function getTopSellers() {
  const analytics = await getShiftDashboardAnalytics(1)
  return analytics.topProducts.slice(0, 5).map((item) => ({
    id: item.productId,
    name: item.name,
    quantity: item.quantitySold,
  }))
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

/**
 * Fetch recent completed sale transactions, excluding any that have been
 * refunded (i.e. whose transaction_number appears as `order_id` in the
 * `refunds` table).
 */
export async function getRecentTransactions() {
  // 1. Fetch refunded order IDs
  const { data: refunds } = await supabase
    .from('refunds')
    .select('order_id')

  const refundedOrderIds = new Set(
    (refunds ?? []).map((r) => r.order_id).filter(Boolean)
  )

  // 2. Fetch recent completed sale transactions
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('transaction_type', 'sale')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(20) // fetch extra to compensate for filtered-out refunds

  if (error) throw error

  // 3. Filter out refunded transactions and return top 10
  return (transactions ?? [])
    .filter((tx) => !refundedOrderIds.has(tx.transaction_number))
    .slice(0, 10)
}

