import { useTranslation } from 'react-i18next'
import { Warehouse, CheckCircle2, Boxes, Store } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import type { WarehouseListItem } from '../data/schema'

interface WarehouseKpiCardsProps {
  data: WarehouseListItem[]
}

export function WarehouseKpiCards({ data }: WarehouseKpiCardsProps) {
  const { t } = useTranslation()

  const totalWarehouses = data.length
  const activeWarehouses = data.filter((w) => w.is_active).length
  const totalLocations = data.reduce(
    (acc, w) => acc + (w._count?.warehouse_locations ?? 0),
    0
  )
  const connectedStores = new Set(
    data.map((w) => w.store_id).filter(Boolean)
  ).size

  const kpis = [
    {
      title: t('warehouses.kpis.total', 'Total Facilities'),
      value: totalWarehouses,
      icon: Warehouse,
      color: 'text-blue-500 dark:text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      title: t('warehouses.kpis.active', 'Active Facilities'),
      value: activeWarehouses,
      icon: CheckCircle2,
      color: 'text-emerald-500 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: t('warehouses.kpis.locations', 'Storage Locations'),
      value: totalLocations,
      icon: Boxes,
      color: 'text-violet-500 dark:text-violet-400',
      bgColor: 'bg-violet-500/10 border-violet-500/20',
    },
    {
      title: t('warehouses.kpis.connectedStores', 'Connected Stores'),
      value: connectedStores,
      icon: Store,
      color: 'text-amber-500 dark:text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
    },
  ]

  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4'>
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon
        return (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
          >
            <Card className='relative overflow-hidden border shadow-xs transition-shadow hover:shadow-sm'>
              <CardContent className='flex items-center justify-between p-4 sm:p-5'>
                <div className='space-y-1'>
                  <p className='text-xs font-medium text-muted-foreground'>
                    {kpi.title}
                  </p>
                  <p className='text-2xl font-bold tracking-tight'>
                    {kpi.value}
                  </p>
                </div>
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border ${kpi.bgColor}`}
                >
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
