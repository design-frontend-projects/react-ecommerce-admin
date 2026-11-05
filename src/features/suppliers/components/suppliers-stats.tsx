import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { CheckCircle2, Layers, Star, Truck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { type Supplier } from '../hooks/use-suppliers'

export interface SuppliersStatsProps {
  data?: Supplier[]
  isLoading?: boolean
  className?: string
}

export function SuppliersStats({
  data = [],
  isLoading = false,
  className = '',
}: SuppliersStatsProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div
        className={`grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 ${className}`}
      >
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className='p-4 space-y-3 border shadow-xs'>
            <div className='flex items-center justify-between'>
              <Skeleton className='h-4 w-28' />
              <Skeleton className='h-9 w-9 rounded-lg' />
            </div>
            <Skeleton className='h-8 w-20' />
            <Skeleton className='h-3 w-36' />
          </Card>
        ))}
      </div>
    )
  }

  const total = data.length
  const active = data.filter((s) => s.is_active !== false).length
  const activeRate = total > 0 ? Math.round((active / total) * 100) : 0
  const preferred = data.filter((s) => !!s.is_preferred).length
  const preferredRate = total > 0 ? Math.round((preferred / total) * 100) : 0

  const linkedOrders = data.reduce(
    (acc, s) => acc + (s._count?.purchase_orders || 0),
    0
  )
  const linkedProducts = data.reduce(
    (acc, s) => acc + (s._count?.products || 0),
    0
  )

  const cards = [
    {
      id: 'total',
      title: t('suppliers.stats.total', { defaultValue: 'Total Suppliers' }),
      value: total.toLocaleString(),
      badge: null,
      subtitle: t('suppliers.stats.totalDesc', {
        defaultValue: 'Registered procurement vendors',
      }),
      icon: Truck,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      isDual: false,
    },
    {
      id: 'active',
      title: t('suppliers.stats.active', { defaultValue: 'Active Suppliers' }),
      value: active.toLocaleString(),
      badge: total > 0 ? `${activeRate}%` : null,
      subtitle: `${activeRate}% active rate • ${t('suppliers.stats.activeDesc', {
        defaultValue: 'Available for purchasing',
      })}`,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      isDual: false,
    },
    {
      id: 'preferred',
      title: t('suppliers.stats.preferred', {
        defaultValue: 'Preferred Suppliers',
      }),
      value: preferred.toLocaleString(),
      badge: total > 0 ? `${preferredRate}%` : null,
      subtitle: t('suppliers.stats.preferredDesc', {
        defaultValue: 'Prioritized for reordering',
      }),
      icon: Star,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      isDual: false,
    },
    {
      id: 'linked',
      title: t('suppliers.stats.linkedProducts', {
        defaultValue: 'Linked Products',
      }),
      value: null,
      badge: null,
      ordersVal: linkedOrders.toLocaleString(),
      ordersLabel: t('suppliers.columns.ordersCount', { defaultValue: 'Orders' }),
      productsVal: linkedProducts.toLocaleString(),
      productsLabel: t('suppliers.columns.productsCount', {
        defaultValue: 'Products',
      }),
      subtitle: t('suppliers.stats.linkedOrdersDesc', {
        defaultValue: 'Associated procurement & catalog items',
      }),
      icon: Layers,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      isDual: true,
    },
  ]

  return (
    <div
      className={`grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 ${className}`}
    >
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.04 }}
            whileHover={{ y: -2 }}
          >
            <Card className='relative overflow-hidden border shadow-xs transition-all duration-200 hover:shadow-sm hover:border-primary/30 h-full flex flex-col justify-between'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-5'>
                <CardTitle className='text-xs sm:text-sm font-medium text-muted-foreground truncate pe-2 text-start'>
                  {card.title}
                </CardTitle>
                <div
                  className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg border ${card.bgColor} ${card.borderColor}`}
                >
                  <Icon className={`h-4 w-4 sm:h-4.5 sm:w-4.5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent className='p-4 pt-0 sm:p-5 sm:pt-0'>
                {card.isDual ? (
                  <div className='flex items-center gap-3 pt-0.5'>
                    <div>
                      <div className='text-xl sm:text-2xl font-bold tracking-tight'>
                        {card.ordersVal}
                      </div>
                      <p className='text-[10px] sm:text-xs text-muted-foreground'>
                        {card.ordersLabel}
                      </p>
                    </div>
                    <div className='h-8 w-px bg-border' />
                    <div>
                      <div className='text-xl sm:text-2xl font-bold tracking-tight'>
                        {card.productsVal}
                      </div>
                      <p className='text-[10px] sm:text-xs text-muted-foreground'>
                        {card.productsLabel}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className='flex items-baseline gap-2'>
                    <span className='text-2xl sm:text-3xl font-bold tracking-tight'>
                      {card.value}
                    </span>
                    {card.badge && (
                      <Badge
                        variant='outline'
                        className={`text-[10px] px-1.5 py-0 font-semibold ${card.bgColor} ${card.color} ${card.borderColor}`}
                      >
                        {card.badge}
                      </Badge>
                    )}
                  </div>
                )}
                <p className='text-[11px] sm:text-xs text-muted-foreground mt-1.5 truncate text-start'>
                  {card.subtitle}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
