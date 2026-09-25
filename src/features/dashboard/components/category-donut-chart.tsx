import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import { PieChart as PieIcon, Layers } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { CategoryBreakdown, DashboardCurrency } from '../types'

interface CategoryDonutChartProps {
  categories: CategoryBreakdown[]
  currency: DashboardCurrency
}

export function CategoryDonutChart({ categories, currency }: CategoryDonutChartProps) {
  const { t } = useTranslation()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const totalValue = categories.reduce((sum, item) => sum + item.value, 0)

  const formatMoney = (val: number) => {
    return `${currency.symbol}${val.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`
  }

  return (
    <Card className='border border-border/60 bg-card/60 backdrop-blur-md shadow-xs flex flex-col'>
      <CardHeader className='p-5 pb-2'>
        <div className='flex items-center gap-2'>
          <PieIcon className='w-4 h-4 text-violet-500' />
          <CardTitle className='text-base font-semibold text-foreground'>
            {t('dashboard.categoryDistribution.title', 'Category Distribution')}
          </CardTitle>
        </div>
        <CardDescription className='text-xs text-muted-foreground'>
          {t(
            'dashboard.categoryDistribution.description',
            'Inventory asset value split by product category'
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className='p-5 pt-0 flex-1 flex flex-col justify-between'>
        {categories.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-[260px] text-muted-foreground text-xs'>
            <Layers className='w-8 h-8 mb-2 opacity-40' />
            <span>
              {t(
                'dashboard.categoryDistribution.noValues',
                'No category stock values recorded'
              )}
            </span>
          </div>
        ) : (
          <>
            {/* Donut Chart with Center Stats */}
            <div className='relative h-[210px] w-full mt-2'>
              <ResponsiveContainer width='100%' height='100%' minWidth={1} minHeight={1}>
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as CategoryBreakdown
                        return (
                          <div className='rounded-lg border border-border bg-popover/95 p-2.5 shadow-lg backdrop-blur-md text-xs space-y-1 min-w-[130px]'>
                            <p className='font-semibold text-foreground flex items-center gap-1.5'>
                              <span
                                className='w-2.5 h-2.5 rounded-full inline-block'
                                style={{ backgroundColor: data.color }}
                              />
                              {data.name}
                            </p>
                            <div className='flex items-center justify-between text-muted-foreground text-[11px]'>
                              <span>{t('dashboard.categoryDistribution.value', 'Value:')}</span>
                              <span className='font-bold text-foreground'>{formatMoney(data.value)}</span>
                            </div>
                            <div className='flex items-center justify-between text-muted-foreground text-[11px]'>
                              <span>{t('dashboard.categoryDistribution.share', 'Share:')}</span>
                              <span className='font-bold text-primary'>{data.percentage}%</span>
                            </div>
                            <div className='flex items-center justify-between text-muted-foreground text-[11px]'>
                              <span>{t('dashboard.categoryDistribution.skus', 'SKUs:')}</span>
                              <span className='text-foreground'>{data.itemCount}</span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Pie
                    data={categories}
                    cx='50%'
                    cy='50%'
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={3}
                    dataKey='value'
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {categories.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.id}-${index}`}
                        fill={entry.color}
                        stroke='none'
                        opacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                        className='transition-all duration-200 cursor-pointer'
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center text overlay */}
              <div className='absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center'>
                <span className='text-[10px] uppercase font-semibold text-muted-foreground tracking-wider'>
                  {t('dashboard.categoryDistribution.totalStock', 'Total Stock')}
                </span>
                <span className='text-sm sm:text-base font-bold text-foreground'>
                  {formatMoney(totalValue)}
                </span>
                <span className='text-[10px] text-muted-foreground'>
                  {t(
                    'dashboard.categoryDistribution.categoriesCount',
                    '{{count}} Categories',
                    { count: categories.length }
                  )}
                </span>
              </div>
            </div>

            {/* Category breakdown item list */}
            <div className='grid grid-cols-2 gap-x-3 gap-y-2 pt-3 border-t border-border/40'>
              {categories.slice(0, 6).map((cat) => (
                <div key={cat.id} className='flex items-center justify-between text-xs py-0.5'>
                  <div className='flex items-center gap-1.5 truncate pr-1'>
                    <span
                      className='w-2 h-2 rounded-full shrink-0'
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className='truncate text-foreground text-[11px] font-medium' title={cat.name}>
                      {cat.name}
                    </span>
                  </div>
                  <span className='font-semibold text-[11px] text-muted-foreground shrink-0'>
                    {cat.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
