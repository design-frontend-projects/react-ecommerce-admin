import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { TrendingUp, ReceiptText, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { SalesTrendPoint, DashboardCurrency } from '../types'

interface SalesTrendChartProps {
  data7Days: SalesTrendPoint[]
  data30Days: SalesTrendPoint[]
  currency: DashboardCurrency
}

export function SalesTrendChart({
  data7Days,
  data30Days,
  currency,
}: SalesTrendChartProps) {
  const [activeRange, setActiveRange] = useState<'7d' | '30d'>('30d')

  const chartData = activeRange === '7d' ? data7Days : data30Days

  // Aggregated summary metrics for the selected period
  const { totalRevenue, totalInvoices, avgDailyRevenue } = useMemo(() => {
    const rev = chartData.reduce((acc, curr) => acc + curr.revenue, 0)
    const inv = chartData.reduce((acc, curr) => acc + curr.invoicesCount, 0)
    const avg = chartData.length > 0 ? rev / chartData.length : 0
    return {
      totalRevenue: rev,
      totalInvoices: inv,
      avgDailyRevenue: avg,
    }
  }, [chartData])

  const formatMoney = (val: number) => {
    return `${currency.symbol}${val.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`
  }

  return (
    <Card className='border border-border/60 bg-card/60 backdrop-blur-md shadow-xs'>
      <CardHeader className='p-5 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2'>
            <BarChart3 className='w-4 h-4 text-primary' />
            <CardTitle className='text-base font-semibold text-foreground'>
              Sales & Revenue Performance
            </CardTitle>
          </div>
          <CardDescription className='text-xs text-muted-foreground'>
            Real-time daily revenue and invoice generation trajectory
          </CardDescription>
        </div>

        {/* Range Tab Switcher */}
        <div className='flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/40 self-start sm:self-auto'>
          <button
            type='button'
            onClick={() => setActiveRange('7d')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
              activeRange === '7d'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Last 7 Days
          </button>
          <button
            type='button'
            onClick={() => setActiveRange('30d')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
              activeRange === '30d'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </CardHeader>

      <CardContent className='p-5 pt-2'>
        {/* Metric summary banner */}
        <div className='grid grid-cols-3 gap-2 py-3 px-4 mb-4 rounded-xl bg-muted/30 border border-border/40 text-xs'>
          <div>
            <span className='text-muted-foreground block text-[11px]'>Period Revenue</span>
            <span className='font-bold text-sm text-foreground'>{formatMoney(totalRevenue)}</span>
          </div>
          <div>
            <span className='text-muted-foreground block text-[11px]'>Avg Daily Sales</span>
            <span className='font-bold text-sm text-foreground'>{formatMoney(avgDailyRevenue)}</span>
          </div>
          <div>
            <span className='text-muted-foreground block text-[11px]'>Total Invoices</span>
            <span className='font-bold text-sm text-foreground'>{totalInvoices.toLocaleString()}</span>
          </div>
        </div>

        {/* Chart area */}
        {chartData.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-[280px] text-muted-foreground text-xs'>
            <ReceiptText className='w-8 h-8 mb-2 opacity-40' />
            <span>No posted sales recorded in this timeframe</span>
          </div>
        ) : (
          <div className='h-[280px] w-full'>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id='salesGradient' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='var(--primary, #3b82f6)' stopOpacity={0.4} />
                    <stop offset='95%' stopColor='var(--primary, #3b82f6)' stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray='3 3'
                  vertical={false}
                  stroke='currentColor'
                  className='text-border/40'
                />
                <XAxis
                  dataKey='date'
                  stroke='currentColor'
                  className='text-muted-foreground text-[11px]'
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />
                <YAxis
                  stroke='currentColor'
                  className='text-muted-foreground text-[11px]'
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) =>
                    val >= 1000
                      ? `${currency.symbol}${(val / 1000).toFixed(0)}k`
                      : `${currency.symbol}${val}`
                  }
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as SalesTrendPoint
                      return (
                        <div className='rounded-lg border border-border bg-popover/95 p-3 shadow-lg backdrop-blur-md text-xs space-y-1.5 min-w-[140px]'>
                          <p className='font-semibold text-foreground'>{data.fullDate || data.date}</p>
                          <div className='flex items-center justify-between text-primary font-medium'>
                            <span className='flex items-center gap-1'>
                              <TrendingUp className='w-3 h-3' /> Revenue:
                            </span>
                            <span>{formatMoney(data.revenue)}</span>
                          </div>
                          <div className='flex items-center justify-between text-muted-foreground text-[11px]'>
                            <span>Invoices:</span>
                            <span className='font-semibold text-foreground'>{data.invoicesCount}</span>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type='monotone'
                  dataKey='revenue'
                  stroke='var(--primary, #3b82f6)'
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill='url(#salesGradient)'
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
