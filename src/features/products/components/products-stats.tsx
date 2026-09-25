import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { type Product } from '../data/schema'
import { computeTotalStock } from './products-columns'
import { useProductsContext, type ProductQuickFilter } from './products-provider'

interface ProductsStatsProps {
  data?: Product[]
  totalCount?: number
  stats?: {
    total?: number
    active?: number
    inactive?: number
    inStock?: number
    lowStock?: number
    outOfStock?: number
  }
  activeQuickFilter?: ProductQuickFilter | null
  onQuickFilterSelect?: (filter: ProductQuickFilter | null) => void
}

export function ProductsStats({
  data = [],
  totalCount,
  stats,
  activeQuickFilter: controlledFilter,
  onQuickFilterSelect: controlledOnSelect,
}: ProductsStatsProps) {
  const { t } = useTranslation()
  const context = useProductsContext()

  const activeQuickFilter =
    controlledFilter !== undefined ? controlledFilter : context.quickFilter
  const onQuickFilterSelect =
    controlledOnSelect !== undefined ? controlledOnSelect : context.setQuickFilter

  let inStockCount = stats?.inStock ?? 0
  let lowStockCount = stats?.lowStock ?? 0
  let outOfStockCount = stats?.outOfStock ?? 0

  if (data.length > 0 && (!stats || (stats.inStock === undefined && stats.outOfStock === undefined))) {
    inStockCount = 0
    lowStockCount = 0
    outOfStockCount = 0
    for (const product of data) {
      const stock = computeTotalStock(product)

      if (stock <= 0) {
        outOfStockCount++
      } else {
        inStockCount++
        if (stock <= 5) {
          lowStockCount++
        }
      }
    }
  }

  const totalProducts = stats?.total ?? totalCount ?? data.length

  const kpis: {
    key: ProductQuickFilter
    title: string
    value: number
    subtitle: string
    icon: React.ComponentType<{ className?: string }>
    color: string
    bgColor: string
    borderColor: string
    activeRing: string
  }[] = [
    {
      key: 'all',
      title: t('products.stats.total', { defaultValue: 'Total Products' }),
      value: totalProducts,
      subtitle: t('products.stats.allCatalog', { defaultValue: 'Catalog items' }),
      icon: Boxes,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      activeRing: 'ring-blue-500 border-blue-500 bg-blue-500/5',
    },
    {
      key: 'in_stock',
      title: t('products.stats.inStock', { defaultValue: 'In Stock' }),
      value: inStockCount,
      subtitle: t('products.stats.readyToShip', { defaultValue: 'Available for order' }),
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      activeRing: 'ring-emerald-500 border-emerald-500 bg-emerald-500/5',
    },
    {
      key: 'low_stock',
      title: t('products.stats.lowStock', { defaultValue: 'Low Stock Alert' }),
      value: lowStockCount,
      subtitle: t('products.stats.belowReorder', { defaultValue: 'Below reorder level' }),
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      activeRing: 'ring-amber-500 border-amber-500 bg-amber-500/5',
    },
    {
      key: 'out_of_stock',
      title: t('products.stats.outOfStock', { defaultValue: 'Out of Stock' }),
      value: outOfStockCount,
      subtitle: t('products.stats.needsReplenishment', { defaultValue: 'Zero inventory' }),
      icon: XCircle,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      activeRing: 'ring-rose-500 border-rose-500 bg-rose-500/5',
    },
  ]

  const handleCardClick = (target: ProductQuickFilter) => {
    if (activeQuickFilter === target) {
      onQuickFilterSelect(null)
    } else {
      onQuickFilterSelect(target)
    }
  }

  return (
    <div className='grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4'>
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon
        const isSelected =
          activeQuickFilter === kpi.key ||
          (kpi.key === 'all' && activeQuickFilter === null)

        return (
          <motion.div
            key={kpi.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.04 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              onClick={() => handleCardClick(kpi.key)}
              className={`relative overflow-hidden cursor-pointer border transition-all duration-200 shadow-xs ${
                isSelected && activeQuickFilter !== null
                  ? `ring-2 ${kpi.activeRing} shadow-sm`
                  : 'hover:border-primary/40 hover:shadow-sm'
              }`}
            >
              <CardContent className='flex items-center justify-between p-3 sm:p-4.5'>
                <div className='space-y-0.5 sm:space-y-1 overflow-hidden pr-1'>
                  <p className='text-[11px] sm:text-xs font-medium text-muted-foreground truncate'>
                    {kpi.title}
                  </p>
                  <div className='flex items-baseline gap-2'>
                    <span className='text-lg sm:text-2xl font-bold tracking-tight'>
                      {kpi.value.toLocaleString()}
                    </span>
                  </div>
                  <p className='text-[10px] sm:text-[11px] text-muted-foreground truncate'>
                    {kpi.subtitle}
                  </p>
                </div>

                <div
                  className={`flex h-8 w-8 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl border ${kpi.bgColor} ${kpi.borderColor}`}
                >
                  <Icon className={`h-4 w-4 sm:h-5.5 sm:w-5.5 ${kpi.color}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
