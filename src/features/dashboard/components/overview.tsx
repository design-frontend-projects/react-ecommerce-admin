import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'

interface OverviewProps {
  data: { name: string; sales: number; refunds: number }[]
}

export function Overview({ data }: OverviewProps) {
  return (
    <ResponsiveContainer width='100%' height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey='name'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          direction='ltr'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          formatter={(
            value: number | string | undefined,
            name: string | undefined
          ) => [
            `$${Number(value || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            name === 'sales' ? 'Sales' : 'Refunds',
          ]}
          cursor={{ fill: 'transparent' }}
        />
        <Legend
          formatter={(value) =>
            value === 'sales' ? 'Sales' : 'Refunds'
          }
        />
        <Bar
          dataKey='sales'
          fill='hsl(var(--primary))'
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey='refunds'
          fill='hsl(0 84% 60%)'
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
