import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  MoreHorizontal,
  Eye,
  Copy,
  Pause,
  Play,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { PromotionStatus } from '@/features/promotions/types'

interface PromotionTableRow {
  id: string
  name: string
  code?: string | null
  description?: string | null
  status: PromotionStatus
  promo_type: string
  startDate: string
  endDate?: string | null
  priority: number
  currency_code?: string | null
  minOrderAmount: number
  maxDiscountAmount?: number | null
  usage_limit?: number | null
  current_usage_count: number
  allow_stacking: boolean
  requires_coupon: boolean
  couponCount?: number
  redemptionCount?: number
}

interface PromotionsTableProps {
  promotions: PromotionTableRow[]
  isLoading?: boolean
  onStatusChange: (id: string, status: PromotionStatus) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

export function PromotionsTable({
  promotions,
  isLoading = false,
  onStatusChange,
  onDuplicate,
  onDelete,
}: PromotionsTableProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const typeConfig: Record<string, { label: string; className: string }> = {
    percentage: {
      label: t('promotions.common.percentage', 'Percentage Off'),
      className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    },
    fixed_amount: {
      label: t('promotions.common.fixedAmount', 'Fixed Amount'),
      className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
    buy_x_get_y: {
      label: t('promotions.common.buyXGetY', 'Buy X Get Y'),
      className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    },
    free_item: {
      label: t('promotions.common.freeItem', 'Free Item / Gift'),
      className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    },
    order_discount: {
      label: t('promotions.common.orderDiscount', 'Order Total'),
      className: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    },
    tiered: {
      label: t('promotions.common.tiered', 'Tiered Scale'),
      className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    },
  }

  const statusConfig: Record<
    PromotionStatus,
    { label: string; dot: string; className: string }
  > = {
    active: {
      label: t('promotions.common.active', 'Active'),
      dot: 'bg-emerald-500',
      className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    },
    draft: {
      label: t('promotions.common.draft', 'Draft'),
      dot: 'bg-zinc-400',
      className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
    },
    paused: {
      label: t('promotions.common.paused', 'Paused'),
      dot: 'bg-amber-500',
      className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    },
    scheduled: {
      label: t('promotions.common.scheduled', 'Scheduled'),
      dot: 'bg-sky-500',
      className: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
    },
    expired: {
      label: t('promotions.common.expired', 'Expired'),
      dot: 'bg-red-500',
      className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
    },
    archived: {
      label: t('promotions.common.archived', 'Archived'),
      dot: 'bg-slate-500',
      className: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30',
    },
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center border rounded-xl bg-card">
        <p className="text-sm text-muted-foreground animate-pulse">
          {t('promotions.table.loading', 'Loading promotions...')}
        </p>
      </div>
    )
  }

  if (promotions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-muted/10">
        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          {t('promotions.table.noPromotions', 'No promotions found')}
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
          {t('promotions.table.noPromotionsDesc', 'Create dynamic promotions, bulk coupons, percentage discounts, and Buy X Get Y deals for your ERP.')}
        </p>
        <Button size="sm" onClick={() => navigate({ to: '/promotions/new' })}>
          {t('promotions.create', 'Create Promotion')}
        </Button>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="font-semibold text-xs">{t('promotions.table.promotion', 'Promotion')}</TableHead>
            <TableHead className="font-semibold text-xs">{t('promotions.table.type', 'Type')}</TableHead>
            <TableHead className="font-semibold text-xs">{t('promotions.table.status', 'Status')}</TableHead>
            <TableHead className="font-semibold text-xs">{t('promotions.table.validityPeriod', 'Validity Period')}</TableHead>
            <TableHead className="font-semibold text-xs">{t('promotions.table.usageLimit', 'Usage / Limit')}</TableHead>
            <TableHead className="font-semibold text-xs">{t('promotions.table.stacking', 'Stacking')}</TableHead>
            <TableHead className="font-semibold text-xs text-end">{t('promotions.table.minOrder', 'Min Order')}</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {promotions.map((p) => {
            const typeConf = typeConfig[p.promo_type] || {
              label: p.promo_type,
              className: 'bg-secondary text-secondary-foreground',
            }
            const statusConf = statusConfig[p.status] || {
              label: p.status,
              dot: 'bg-zinc-400',
              className: 'bg-secondary text-secondary-foreground',
            }

            const startDate = new Date(p.startDate).toLocaleDateString()
            const endDate = p.endDate ? new Date(p.endDate).toLocaleDateString() : t('promotions.table.ongoing', 'Ongoing')
            const currency = p.currency_code ?? 'QAR'

            return (
              <TableRow
                key={p.id}
                className="hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => navigate({ to: '/promotions/$promotionId', params: { promotionId: p.id } })}
              >
                <TableCell className="py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                      {p.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {p.code && (
                        <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                          {p.code}
                        </span>
                      )}
                      {p.requires_coupon && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-purple-500/30 text-purple-600">
                          {t('promotions.common.couponRequired', 'Coupon Required')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className={`text-xs font-medium px-2 py-0.5 ${typeConf.className}`}>
                    {typeConf.label}
                  </Badge>
                </TableCell>

                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${statusConf.className}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${statusConf.dot}`} />
                    {statusConf.label}
                  </span>
                </TableCell>

                <TableCell className="text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{startDate}</span>
                    <span className="text-muted-foreground/60">→</span>
                    <span>{endDate}</span>
                  </div>
                </TableCell>

                <TableCell className="text-xs font-mono">
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">
                      {p.current_usage_count} {p.usage_limit ? `/ ${p.usage_limit}` : t('promotions.table.uses', 'uses')}
                    </span>
                    {p.redemptionCount !== undefined && p.redemptionCount > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {t('promotions.table.transactions', { count: p.redemptionCount, defaultValue: `${p.redemptionCount} transactions` })}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  {p.allow_stacking ? (
                    <Badge variant="outline" className="text-[11px] font-normal border-blue-500/30 text-blue-600 gap-1">
                      <Layers className="h-3 w-3" /> {t('promotions.common.stackable', 'Stackable')}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t('promotions.common.exclusive', 'Exclusive')}</span>
                  )}
                </TableCell>

                <TableCell className="text-end font-mono text-xs font-semibold">
                  {p.minOrderAmount > 0 ? `${p.minOrderAmount.toFixed(2)} ${currency}` : t('promotions.common.none', 'None')}
                </TableCell>

                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => navigate({ to: '/promotions/$promotionId', params: { promotionId: p.id } })}
                        className="gap-2 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" /> {t('promotions.common.details', 'View Details')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDuplicate(p.id)}
                        className="gap-2 text-xs"
                      >
                        <Copy className="h-3.5 w-3.5" /> {t('promotions.common.duplicate', 'Duplicate')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {p.status === 'active' ? (
                        <DropdownMenuItem
                          onClick={() => onStatusChange(p.id, 'paused')}
                          className="gap-2 text-xs text-amber-600"
                        >
                          <Pause className="h-3.5 w-3.5" /> {t('promotions.table.pausePromotion', 'Pause Promotion')}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => onStatusChange(p.id, 'active')}
                          className="gap-2 text-xs text-emerald-600"
                        >
                          <Play className="h-3.5 w-3.5" /> {t('promotions.common.activate', 'Activate')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(p.id)}
                        className="gap-2 text-xs text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> {t('promotions.common.archive', 'Archive')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
