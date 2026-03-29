import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart as LineChartIcon,
  TrendingUp,
  Package,
  Receipt,
  ShoppingCart,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useProducts } from '../../products/hooks/use-products'
import { usePurchaseOrders } from '../../purchase-orders/hooks/use-purchase-orders'
import { getTransactions } from '../../transactions/data/api'
import { useOrders } from '../api/queries'

export function Analytics() {
  const { data: resOrders, isLoading: loadingOrders } = useOrders()
  const { data: transactions, isLoading: loadingTx } = useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
  })
  const { data: products, isLoading: loadingProducts } = useProducts()
  const { data: purchaseOrders, isLoading: loadingPo } = usePurchaseOrders()

  const isLoading = loadingOrders || loadingTx || loadingProducts || loadingPo

  // Aggregations
  const stats = useMemo(() => {
    const totalRevenue = (resOrders || [])
      .filter((o) => o.status === 'paid')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0)

    const totalTx = transactions?.length || 0
    const totalItems = products?.length || 0
    const pendingPo = (purchaseOrders || []).filter(
      (po) => po.status === 'pending' || po.status === 'partial'
    ).length

    return { totalRevenue, totalTx, totalItems, pendingPo }
  }, [resOrders, transactions, products, purchaseOrders])

  // Chart 1: Sales Overview (Revenue by Date)
  const salesData = useMemo(() => {
    if (!resOrders) return []
    const dailySales: Record<string, number> = {}

    const sortedOrders = [...resOrders]
      .filter((o) => o.status === 'paid' && o.created_at)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

    sortedOrders.forEach((order) => {
      const dateStr = format(parseISO(order.created_at), 'MMM dd')
      if (!dailySales[dateStr]) dailySales[dateStr] = 0
      dailySales[dateStr] += order.total_amount || 0
    })

    return Object.entries(dailySales).map(([date, sales]) => ({ date, sales }))
  }, [resOrders])

  // Chart 2: Top Items (Count by item name)
  const topItemsData = useMemo(() => {
    if (!resOrders) return []
    const itemCounts: Record<string, number> = {}

    resOrders.forEach((order) => {
      order.order_items?.forEach((item) => {
        const name = item.menu_item?.name || 'Unknown Item'
        if (!itemCounts[name]) itemCounts[name] = 0
        itemCounts[name] += item.quantity || 1
      })
    })

    return Object.entries(itemCounts)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5) // Top 5
  }, [resOrders])

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <LineChartIcon className='h-5 w-5 text-orange-500' />
          <h1 className='text-lg font-semibold'>Analytics</h1>
        </div>
        <div className='ml-auto flex items-center justify-end gap-2'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        {isLoading ? (
          <div className='flex h-[400px] items-center justify-center'>
            <p className='text-muted-foreground'>Loading analytics data...</p>
          </div>
        ) : (
          <div className='grid gap-4'>
            {/* Stats Cards */}
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Total Revenue (ResPOS)
                  </CardTitle>
                  <TrendingUp className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    ${stats.totalRevenue.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Total Transactions
                  </CardTitle>
                  <Receipt className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{stats.totalTx}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Products Catalog
                  </CardTitle>
                  <Package className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{stats.totalItems}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Pending POs
                  </CardTitle>
                  <ShoppingCart className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{stats.pendingPo}</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className='grid gap-4 md:grid-cols-2'>
              <Card className='col-span-1 border shadow-sm'>
                <CardHeader>
                  <CardTitle>Sales Overview (Revenue)</CardTitle>
                </CardHeader>
                <CardContent className='pl-2'>
                  <div className='h-[300px] w-full'>
                    {salesData.length > 0 ? (
                      <ResponsiveContainer width='100%' height='100%'>
                        <LineChart
                          data={salesData}
                          margin={{ top: 20, bottom: 20, right: 30 }}
                        >
                          <CartesianGrid
                            strokeDasharray='3 3'
                            vertical={false}
                            className='stroke-muted'
                          />
                          <XAxis
                            dataKey='date'
                            stroke='#888888'
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                          />
                          <YAxis
                            stroke='#888888'
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value}`}
                            width={60}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: '8px',
                              border: 'none',
                              boxShadow:
                                '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                            }}
                            cursor={{
                              stroke: 'rgba(249, 115, 22, 0.2)',
                              strokeWidth: 2,
                            }}
                            formatter={(value: number | undefined) => [
                              `$${(Number(value) || 0).toFixed(2)}`,
                              'Sales',
                            ]}
                          />
                          <Line
                            type='monotone'
                            dataKey='sales'
                            stroke='#f97316'
                            strokeWidth={3}
                            dot={{ fill: '#f97316', r: 4, strokeWidth: 0 }}
                            activeDot={{
                              r: 6,
                              stroke: '#ffffff',
                              strokeWidth: 2,
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className='flex h-full items-center justify-center text-muted-foreground'>
                        No sales data available.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className='col-span-1 border shadow-sm'>
                <CardHeader>
                  <CardTitle>Top Selling Items</CardTitle>
                </CardHeader>
                <CardContent className='pl-2'>
                  <div className='h-[300px] w-full'>
                    {topItemsData.length > 0 ? (
                      <ResponsiveContainer width='100%' height='100%'>
                        <BarChart
                          data={topItemsData}
                          margin={{ top: 20, bottom: 20, right: 30 }}
                        >
                          <CartesianGrid
                            strokeDasharray='3 3'
                            vertical={false}
                            className='stroke-muted'
                          />
                          <XAxis
                            dataKey='name'
                            stroke='#888888'
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                          />
                          <YAxis
                            stroke='#888888'
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            width={40}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: '8px',
                              border: 'none',
                              boxShadow:
                                '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                            }}
                            cursor={{ fill: 'rgba(249, 115, 22, 0.05)' }}
                            formatter={(value: number | undefined) => [value ?? 0, 'Qty Sold']}
                          />
                          <Bar
                            dataKey='quantity'
                            fill='#f97316'
                            radius={[4, 4, 0, 0]}
                            maxBarSize={50}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className='flex h-full items-center justify-center text-muted-foreground'>
                        No items sold yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </Main>
    </>
  )
}
