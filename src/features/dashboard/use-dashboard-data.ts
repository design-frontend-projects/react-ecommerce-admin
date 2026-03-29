import { startOfMonth, subMonths, format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalRevenue: number
  totalSales: number
  totalRefunds: number
  totalRefundAmount: number
  activeCustomers: number
  totalSuppliers: number
  totalPurchaseOrders: number
  totalReceivedItems: number
  totalReceivedAmount: number
  pendingOrdersCount: number
}

export interface ChartData {
  name: string
  sales: number
  refunds: number
}

export interface RecentSale {
  id: string
  transaction_number: string
  total_amount: number
  created_at: string
  transaction_details: {
    product_id: number
    quantity: number
    unit_price: number
    subtotal: number
    products: {
      name: string
    }
  }[]
}

export interface RecentRefund {
  refund_id: number
  sale_id: string | null
  order_id: string | null
  refund_date: string
  refund_amount: number
  reason: string | null
  refund_status: string | null
}

export interface PendingPurchaseOrder {
  po_id: number
  po_number: number | null
  order_date: string
  total_amount: number
  status: string
  suppliers: {
    name: string
  }
}

export interface DashboardData {
  stats: DashboardStats
  chartData: ChartData[]
  recentSales: RecentSale[]
  recentRefunds: RecentRefund[]
  pendingPurchaseOrders: PendingPurchaseOrder[]
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard_data'],
    queryFn: async (): Promise<DashboardData> => {
      // ─── 1. Transactions: Total Sales & Refunds ───
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('id, transaction_type, total_amount, status, created_at')

      if (txError) throw txError

      const salesTransactions = (transactions || []).filter(
        (t) => t.transaction_type === 'sale'
      )
      const refundTransactions = (transactions || []).filter(
        (t) => t.transaction_type === 'refund'
      )

      const totalRevenue = salesTransactions.reduce(
        (acc, t) => acc + (Number(t.total_amount) || 0),
        0
      )
      const totalSales = salesTransactions.length
      const totalRefundFromTransactions = refundTransactions.reduce(
        (acc, t) => acc + (Number(t.total_amount) || 0),
        0
      )

      // ─── 2. Customers count ───
      const { count: activeCustomers, error: custError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      if (custError) throw custError

      // ─── 3. Suppliers count ───
      const { count: totalSuppliers, error: suppError } = await supabase
        .from('suppliers')
        .select('*', { count: 'exact', head: true })

      if (suppError) throw suppError

      // ─── 4. Purchase Orders: total POs, received items, received amount ───
      const { data: purchaseOrders, error: poError } = await supabase
        .from('purchase_orders')
        .select(
          `
          po_id,
          po_number,
          order_date,
          total_amount,
          status,
          suppliers ( name ),
          purchase_order_items (
            po_item_id,
            quantity_ordered,
            unit_cost,
            subtotal
          )
        `
        )

      if (poError) throw poError

      const totalPurchaseOrders = (purchaseOrders || []).length
      const receivedPOs = (purchaseOrders || []).filter(
        (po) => po.status === 'Received'
      )
      const totalReceivedItems = receivedPOs.reduce(
        (acc, po) =>
          acc +
          (po.purchase_order_items || []).reduce(
            (sum: number, item: { quantity_ordered: number }) =>
              sum + (item.quantity_ordered || 0),
            0
          ),
        0
      )
      const totalReceivedAmount = receivedPOs.reduce(
        (acc, po) => acc + (Number(po.total_amount) || 0),
        0
      )

      const pendingPOs = (purchaseOrders || []).filter(
        (po) =>
          po.status === 'pending' ||
          po.status === 'Pending' ||
          po.status === 'ordered'
      )
      const pendingOrdersCount = pendingPOs.length

      // ─── 5. Refunds table: total refund amount from refunds ───
      const { data: refundsData, error: refundsError } = await supabase
        .from('refunds')
        .select('refund_id, refund_amount, refund_date, refund_status')

      if (refundsError) throw refundsError

      const totalRefundAmount = (refundsData || []).reduce(
        (acc, r) => acc + (Number(r.refund_amount) || 0),
        0
      )

      // Combine refunds from both tables (transactions + refunds)
      const totalRefunds =
        refundTransactions.length + (refundsData || []).length
      const combinedRefundAmount =
        totalRefundFromTransactions + totalRefundAmount

      // ─── 6. Chart Data: Monthly Sales vs Refunds (last 6 months) ───
      const sixMonthsAgo = subMonths(startOfMonth(new Date()), 6).toISOString()

      const monthlyData: Record<string, { sales: number; refunds: number }> = {}
      // Initialize 6 months
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i)
        monthlyData[format(d, 'MMM')] = { sales: 0, refunds: 0 }
      }

      ;(transactions || []).forEach((t) => {
        if (!t.created_at) return
        const date = new Date(t.created_at)
        if (date.toISOString() >= sixMonthsAgo) {
          const monthKey = format(date, 'MMM')
          if (monthlyData[monthKey]) {
            if (t.transaction_type === 'sale') {
              monthlyData[monthKey].sales += Number(t.total_amount) || 0
            } else if (t.transaction_type === 'refund') {
              monthlyData[monthKey].refunds += Number(t.total_amount) || 0
            }
          }
        }
      })

      const chartData: ChartData[] = Object.entries(monthlyData).map(
        ([name, data]) => ({
          name,
          sales: data.sales,
          refunds: data.refunds,
        })
      )

      // ─── 7. Recent Sales (last 5 sale transactions with details) ───
      const { data: recentSalesData, error: salesError } = await supabase
        .from('transactions')
        .select(
          `
          id,
          transaction_number,
          total_amount,
          created_at,
          transaction_details (
            product_id,
            quantity,
            unit_price,
            subtotal,
            products ( name )
          )
        `
        )
        .eq('transaction_type', 'sale')
        .order('created_at', { ascending: false })
        .limit(5)

      if (salesError) throw salesError

      // ─── 8. Recent Refunds (last 5) ───
      const { data: recentRefunds, error: recentRefundsError } = await supabase
        .from('refunds')
        .select('*')
        .order('refund_date', { ascending: false })
        .limit(5)

      if (recentRefundsError) throw recentRefundsError

      // ─── 9. Pending Purchase Orders (last 5) ───
      const pendingPurchaseOrders = pendingPOs
        .sort(
          (a, b) =>
            new Date(a.order_date).getTime() - new Date(b.order_date).getTime()
        )
        .slice(0, 5)
        .map((po) => ({
          po_id: po.po_id,
          po_number: po.po_number,
          order_date: po.order_date,
          total_amount: Number(po.total_amount) || 0,
          status: po.status || 'pending',
          suppliers: po.suppliers as unknown as { name: string },
        }))

      return {
        stats: {
          totalRevenue,
          totalSales,
          totalRefunds,
          totalRefundAmount: combinedRefundAmount,
          activeCustomers: activeCustomers || 0,
          totalSuppliers: totalSuppliers || 0,
          totalPurchaseOrders,
          totalReceivedItems,
          totalReceivedAmount,
          pendingOrdersCount,
        },
        chartData,
        recentSales: (recentSalesData || []) as unknown as RecentSale[],
        recentRefunds: (recentRefunds || []) as RecentRefund[],
        pendingPurchaseOrders,
      }
    },
  })
}
