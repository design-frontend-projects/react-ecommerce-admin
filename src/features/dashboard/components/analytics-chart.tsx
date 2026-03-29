import { subDays, format, startOfDay } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { supabase } from '@/lib/supabase'

interface DailyData {
  name: string
  sales: number
  refunds: number
}

export function AnalyticsChart() {
  const { data: chartData } = useQuery({
    queryKey: ['analytics_chart_7days'],
    queryFn: async (): Promise<DailyData[]> => {
      const sevenDaysAgo = subDays(
        startOfDay(new Date()),
        6
      ).toISOString()

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('transaction_type, total_amount, created_at')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Initialize last 7 days
      const dailyMap: Record<string, { sales: number; refunds: number }> = {}
      for (let i = 6; i >= 0; i--) {
        const day = format(subDays(new Date(), i), 'EEE')
        dailyMap[day] = { sales: 0, refunds: 0 }
      }

      ;(transactions || []).forEach((t) => {
        if (!t.created_at) return
        const day = format(new Date(t.created_at), 'EEE')
        if (dailyMap[day]) {
          if (t.transaction_type === 'sale') {
            dailyMap[day].sales += Number(t.total_amount) || 0
          } else if (t.transaction_type === 'refund') {
            dailyMap[day].refunds += Number(t.total_amount) || 0
          }
        }
      })

      return Object.entries(dailyMap).map(([name, data]) => ({
        name,
        sales: data.sales,
        refunds: data.refunds,
      }))
    },
  })

  return (
    <ResponsiveContainer width='100%' height={300}>
      <AreaChart data={chartData || []}>
        <XAxis
          dataKey='name'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          formatter={(value: number | string | undefined, name: string | undefined) => [
            `$${Number(value || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            name === 'sales' ? 'Sales' : 'Refunds',
          ]}
        />
        <Area
          type='monotone'
          dataKey='sales'
          stroke='hsl(var(--primary))'
          fill='hsl(var(--primary))'
          fillOpacity={0.15}
        />
        <Area
          type='monotone'
          dataKey='refunds'
          stroke='hsl(0 84% 60%)'
          fill='hsl(0 84% 60%)'
          fillOpacity={0.1}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
