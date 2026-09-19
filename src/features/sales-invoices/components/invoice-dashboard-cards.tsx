import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { InvoiceDashboardStats } from '../types'
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from 'lucide-react'

interface InvoiceDashboardCardsProps {
  stats?: InvoiceDashboardStats
  isLoading?: boolean
  onFilterStatus?: (status: string) => void
}

export const InvoiceDashboardCards: React.FC<InvoiceDashboardCardsProps> = ({
  stats,
  isLoading,
  onFilterStatus,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse bg-muted/40 h-28" />
        ))}
      </div>
    )
  }

  const formatCurrency = (val: number = 0) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(val)
  }

  const cards = [
    {
      title: 'Total Invoiced',
      value: formatCurrency(stats?.totalInvoiced),
      subtitle: `${stats?.totalInvoicesCount || 0} commercial invoices`,
      icon: Receipt,
      iconColor: 'text-blue-500',
      bgGlow: 'from-blue-500/10 via-transparent to-transparent',
      borderColor: 'border-blue-500/20',
      badge: 'All Invoices',
      badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    },
    {
      title: 'Total Collected',
      value: formatCurrency(stats?.totalPaid),
      subtitle: `${stats?.totalInvoiced ? Math.round(((stats.totalPaid || 0) / stats.totalInvoiced) * 100) : 0}% recovery rate`,
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
      bgGlow: 'from-emerald-500/10 via-transparent to-transparent',
      borderColor: 'border-emerald-500/20',
      badge: 'Paid',
      badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    },
    {
      title: 'Outstanding Receivables',
      value: formatCurrency(stats?.totalDue),
      subtitle: 'Awaiting customer payment',
      icon: Clock,
      iconColor: 'text-amber-500',
      bgGlow: 'from-amber-500/10 via-transparent to-transparent',
      borderColor: 'border-amber-500/20',
      badge: 'Due',
      badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    },
    {
      title: 'Tax Collected',
      value: formatCurrency(stats?.totalTax),
      subtitle: `Discounts given: ${formatCurrency(stats?.totalDiscount)}`,
      icon: DollarSign,
      iconColor: 'text-purple-500',
      bgGlow: 'from-purple-500/10 via-transparent to-transparent',
      borderColor: 'border-purple-500/20',
      badge: 'Tax / VAT',
      badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, idx) => {
          const Icon = c.icon
          return (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.08 }}
            >
              <Card className={`relative overflow-hidden border ${c.borderColor} shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br ${c.bgGlow}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {c.title}
                  </span>
                  <div className={`p-2 rounded-xl bg-background/80 shadow-xs border ${c.iconColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {c.value}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/40 text-xs text-muted-foreground">
                    <span>{c.subtitle}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.badgeColor}`}>
                      {c.badge}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {stats?.statusBreakdown && stats.statusBreakdown.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
          <span className="text-xs font-medium text-muted-foreground mr-1">Quick Filters:</span>
          {stats.statusBreakdown.map((sb) => (
            <button
              key={sb.status}
              onClick={() => onFilterStatus?.(sb.status)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border border-border/80 bg-background hover:bg-muted/80 transition-colors shadow-2xs font-medium"
            >
              <span className="capitalize">{sb.status.replace('_', ' ')}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-muted text-[10px] text-muted-foreground font-semibold">
                {sb.count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
