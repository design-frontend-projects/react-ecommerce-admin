import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  DollarSign,
  Boxes,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { type Inventory, type InventoryMetrics } from '../data/schema'
import { useInventoryContext, type InventoryFilterStatus } from './inventory-provider'

interface InventoryKpiCardsProps {
  data: Inventory[]
  metrics?: InventoryMetrics
  isLoading?: boolean
}

export function InventoryKpiCards({ data, metrics, isLoading: _isLoading }: InventoryKpiCardsProps) {
  const { t } = useTranslation()
  const { filterStatus, setFilterStatus } = useInventoryContext()

  const totalItems = metrics ? metrics.totalItems : data.length
  let inStockCount = metrics ? metrics.inStockCount : 0
  let lowStockCount = metrics ? metrics.lowStockCount : 0
  let outOfStockCount = metrics ? metrics.outOfStockCount : 0
  let totalValuation = metrics ? metrics.totalValuation : 0
  const withVariantsCount = metrics
    ? (metrics.withVariantsCount ?? 0)
    : data.filter((i) => !!i.product_variant_id).length

  if (!metrics) {
    for (const item of data) {
      const qty = Number(item.qty_on_hand ?? item.quantity ?? 0)
      const min = item.reorder_point ?? item.min_quantity ?? item.reorder_level ?? 0
      const cost = Number(item.avg_cost ?? 0)

      totalValuation += qty * cost

      if (qty === 0) {
        outOfStockCount++
      } else if (qty <= min) {
        lowStockCount++
      } else {
        inStockCount++
      }
    }
  }

  const kpis: {
    title: string
    value: string | number
    subtitle?: string
    icon: React.ComponentType<{ className?: string }>
    color: string
    bgColor: string
    filterValue?: InventoryFilterStatus
  }[] = [
    {
      title: t('inventory.kpis.total', 'Tracked Items'),
      value: totalItems,
      subtitle: `${withVariantsCount} ${t('inventory.kpis.withVariants', 'Variants')}`,
      icon: Boxes,
      color: 'text-blue-500 dark:text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
      filterValue: 'all',
    },

    {
      title: t('inventory.kpis.inStock', 'In Stock'),
      value: inStockCount,
      subtitle: t('inventory.kpis.healthyStock', 'Healthy levels'),
      icon: CheckCircle2,
      color: 'text-emerald-500 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
      filterValue: 'in_stock',
    },
    {
      title: t('inventory.kpis.lowStock', 'Low Stock'),
      value: lowStockCount,
      subtitle: t('inventory.kpis.atOrBelowReorder', 'Below reorder point'),
      icon: AlertTriangle,
      color: 'text-amber-500 dark:text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      filterValue: 'low_stock',
    },
    {
      title: t('inventory.kpis.outOfStock', 'Out of Stock'),
      value: outOfStockCount,
      subtitle: t('inventory.kpis.requiresRestock', 'Immediate attention'),
      icon: XCircle,
      color: 'text-rose-500 dark:text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/20',
      filterValue: 'out_of_stock',
    },
    {
      title: t('inventory.kpis.totalValuation', 'Stock Valuation'),
      value: `$${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
      subtitle: t('inventory.kpis.basedOnAvgCost', 'Based on unit avg cost'),
      icon: DollarSign,
      color: 'text-violet-500 dark:text-violet-400',
      bgColor: 'bg-violet-500/10 border-violet-500/20',
    },
  ]

  const handleCardClick = (targetFilter?: InventoryFilterStatus) => {
    if (!targetFilter) return
    if (filterStatus === targetFilter) {
      setFilterStatus(null)
    } else {
      setFilterStatus(targetFilter)
    }
  }

  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4'>
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon
        const isSelected = filterStatus === kpi.filterValue && !!kpi.filterValue
        const isClickable = !!kpi.filterValue

        return (
          <TooltipProvider key={idx}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card
                  onClick={() => handleCardClick(kpi.filterValue)}
                  className={`relative overflow-hidden transition-all duration-200 ${
                    isClickable
                      ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
                      : ''
                  } ${
                    isSelected
                      ? 'ring-2 ring-primary ring-offset-2 bg-accent/40 shadow-xs'
                      : 'bg-card'
                  }`}
                >
                  <CardContent className='p-4 sm:p-5'>
                    <div className='flex items-center justify-between gap-2'>
                      <span className='text-xs sm:text-sm font-medium text-muted-foreground truncate'>
                        {kpi.title}
                      </span>
                      <div
                        className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg border ${kpi.bgColor}`}
                      >
                        <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${kpi.color}`} />
                      </div>
                    </div>

                    <div className='mt-2 sm:mt-3'>
                      <div className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
                        {kpi.value}
                      </div>
                      {kpi.subtitle && (
                        <p className='text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5'>
                          {kpi.subtitle}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              {isClickable && (
                <TooltipContent side='bottom' className='text-xs'>
                  {isSelected
                    ? t('inventory.kpis.clearFilter', 'Click to clear filter')
                    : t('inventory.kpis.filterBy', {
                        title: kpi.title,
                        defaultValue: `Filter table by ${kpi.title}`,
                      })}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )
      })}
    </div>
  )
}
