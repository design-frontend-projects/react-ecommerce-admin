import { startOfMonth, subMonths, format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  activeCustomers: number
  totalSuppliers: number
}

interface ChartData {
  name: string
  total: number
}

interface DashboardData {
  stats: DashboardStats
  chartData: ChartData[]
  recentRefunds: any[]
  pendingPurchaseOrders: any[]
  recentSales: any[]
}

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard_data'],
    queryFn: async (): Promise<DashboardData> => {
      // 1. Fetch KPI Stats
      const { data: revenueData, error: revenueError } = await supabase
        .from('orders')
        .select('total_amount')

      if (revenueError) throw revenueError

      const totalRevenue = revenueData.reduce(
        (acc, curr) => acc + (Number(curr.total_amount) || 0),
        0
      )

      const { count: totalOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })

      if (ordersError) throw ordersError

      const { count: activeCustomers, error: customersError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      if (customersError) throw customersError

      const { count: totalSuppliers, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*', { count: 'exact', head: true })

      if (suppliersError) throw suppliersError

      // 2. Fetch Chart Data (Last 6 months sales)
      // Note: Grouping by month in Supabase via JS client usually requires fetching data and processing it in JS
      // or using a stored procedure/view. For simplicity and since we might not have a huge dataset yet,
      // we'll fetch orders from last 6 months and process here.
      const sixMonthsAgo = subMonths(startOfMonth(new Date()), 6).toISOString()

      const { data: recentOrders, error: recentOrdersError } = await supabase
        .from('orders')
        .select('order_date, total_amount')
        .gte('order_date', sixMonthsAgo)
        .order('order_date', { ascending: true })

      if (recentOrdersError) throw recentOrdersError

      // Process chart data
      const monthlyData: Record<string, number> = {}
      recentOrders.forEach((order) => {
        const month = format(new Date(order.order_date), 'MMM')
        monthlyData[month] =
          (monthlyData[month] || 0) + (Number(order.total_amount) || 0)
      })

      const chartData: ChartData[] = Object.keys(monthlyData).map((month) => ({
        name: month,
        total: monthlyData[month],
      }))

      // 3. Fetch Recent Refunds
      const { data: recentRefunds, error: refundsError } = await supabase
        .from('refunds')
        .select('*')
        .order('refund_date', { ascending: false })
        .limit(5)

      if (refundsError) throw refundsError

      // 4. Fetch Pending Purchase Orders
      const { data: pendingPurchaseOrders, error: poError } = await supabase
        .from('purchase_orders')
        .select(
          `
          purchase_order_id,
          po_number,
          order_date,
          total_amount,
          status,
          suppliers (
            name
          )
        `
        )
        .eq('status', 'Pending')
        .order('order_date', { ascending: true })
        .limit(5)

      if (poError) throw poError

      // 5. Fetch Recent Sales (Orders with Customer info)
      const { data: recentSalesData, error: salesError } = await supabase
        .from('orders')
        .select(
          `
          order_id,
          total_amount,
          customers (
            first_name,
            last_name,
            email
          )
        `
        )
        .order('order_date', { ascending: false })
        .limit(5)

      if (salesError) throw salesError

      return {
        stats: {
          totalRevenue,
          totalOrders: totalOrders || 0,
          activeCustomers: activeCustomers || 0,
          totalSuppliers: totalSuppliers || 0,
        },
        chartData,
        recentRefunds,
        pendingPurchaseOrders,
        recentSales: recentSalesData,
      }
    },
  })
}
