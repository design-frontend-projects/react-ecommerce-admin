import { useTranslation } from 'react-i18next'
import {
  Warehouse,
  CheckCircle2,
  Boxes,
  Star,
  Filter,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { WarehouseListItem } from '../data/schema'
import { useWarehousesContext, type WarehouseFilterStatus } from './provider'

interface WarehouseKpiCardsProps {
  data: WarehouseListItem[]
}

export function WarehouseKpiCards({ data }: WarehouseKpiCardsProps) {
  const { t } = useTranslation()
  const { filterStatus, setFilterStatus } = useWarehousesContext()

  const totalWarehouses = data.length
  const activeWarehouses = data.filter((w) => w.is_active).length
  const defaultWarehouses = data.filter((w) => w.is_default).length
  const totalLocations = data.reduce(
    (acc, w) => acc + (w._count?.warehouse_locations ?? 0),
    0
  )
  const connectedStores = new Set(
    data.map((w) => w.store_id).filter(Boolean)
  ).size

  const kpis: {
    title: string
    value: number
    subtitle?: string
    icon: React.ComponentType<{ className?: string }>
    color: string
    bgColor: string
    filterValue?: WarehouseFilterStatus
  }[] = [
    {
      title: t('warehouses.kpis.total', 'Total Facilities'),
      value: totalWarehouses,
      subtitle: `${connectedStores} ${t('warehouses.kpis.connectedStores', 'Connected Stores')}`,
      icon: Warehouse,
      color: 'text-blue-500 dark:text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
      filterValue: 'all',
    },
    {
      title: t('warehouses.kpis.active', 'Active Facilities'),
      value: activeWarehouses,
      subtitle: `${totalWarehouses - activeWarehouses} ${t('warehouses.columns.inactive', 'Inactive')}`,
      icon: CheckCircle2,
      color: 'text-emerald-500 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
      filterValue: 'active',
    },
    {
      title: t('warehouses.kpis.default', 'Default Facilities'),
      value: defaultWarehouses,
      subtitle: t('warehouses.kpis.primaryStoreDesc', 'Primary fulfillment'),
      icon: Star,
      color: 'text-amber-500 dark:text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      filterValue: 'default',
    },
    {
      title: t('warehouses.kpis.locations', 'Storage Locations'),
      value: totalLocations,
      subtitle: t('warehouses.kpis.acrossAllFacilities', 'Across all facilities'),
      icon: Boxes,
      color: 'text-violet-500 dark:text-violet-400',
      bgColor: 'bg-violet-500/10 border-violet-500/20',
    },
  ]

  const handleCardClick = (targetFilter?: WarehouseFilterStatus) => {
    if (!targetFilter) return
    if (filterStatus === targetFilter) {
      setFilterStatus(null)
    } else {
      setFilterStatus(targetFilter)
    }
  }

  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4'>
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon
        const isClickable = !!kpi.filterValue
        const isSelected =
          filterStatus === kpi.filterValue ||
          (kpi.filterValue === 'all' && filterStatus === null)

        const cardElement = (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.04 }}
            whileHover={isClickable ? { y: -2 } : undefined}
            whileTap={isClickable ? { scale: 0.98 } : undefined}
          >
            <Card
              onClick={() => isClickable && handleCardClick(kpi.filterValue)}
              className={`relative overflow-hidden border transition-all duration-200 shadow-xs ${
                isClickable ? 'cursor-pointer' : ''
              } ${
                isSelected && filterStatus !== null
                  ? 'ring-2 ring-primary border-primary bg-primary/5 shadow-sm'
                  : 'hover:border-primary/40 hover:shadow-sm'
              }`}
            >
              <CardContent className='flex items-center justify-between p-4 sm:p-5'>
                <div className='space-y-1 overflow-hidden'>
                  <div className='flex items-center gap-1.5'>
                    <p className='text-xs font-medium text-muted-foreground truncate'>
                      {kpi.title}
                    </p>
                    {isClickable && filterStatus === kpi.filterValue && (
                      <Filter className='h-3 w-3 text-primary shrink-0' />
                    )}
                  </div>
                  <p className='text-2xl font-bold tracking-tight'>
                    {kpi.value}
                  </p>
                  {kpi.subtitle && (
                    <p className='text-[10px] text-muted-foreground/80 truncate'>
                      {kpi.subtitle}
                    </p>
                  )}
                </div>
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${kpi.bgColor}`}
                >
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )

        if (!isClickable) return cardElement

        return (
          <TooltipProvider key={kpi.title}>
            <Tooltip>
              <TooltipTrigger asChild>{cardElement}</TooltipTrigger>
              <TooltipContent side='bottom'>
                <p>
                  {filterStatus === kpi.filterValue
                    ? t('warehouses.kpis.clearFilter', 'Click to clear filter')
                    : t('warehouses.kpis.filterBy', 'Click to filter table')}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      })}
    </div>
  )
}

