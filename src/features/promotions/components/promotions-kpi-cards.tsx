import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Tag, Ticket, CheckCircle2, TrendingUp, DollarSign } from 'lucide-react'

interface PromotionsKpiCardsProps {
  totalPromotions: number
  activePromotions: number
  totalCoupons: number
  activeCoupons: number
  totalRedemptions: number
  totalDiscountGiven: number
  currencyCode?: string
}

export function PromotionsKpiCards({
  totalPromotions,
  activePromotions,
  totalCoupons,
  activeCoupons,
  totalRedemptions,
  totalDiscountGiven,
  currencyCode = 'QAR',
}: PromotionsKpiCardsProps) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-border/60 shadow-xs hover:shadow-sm transition-shadow">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('promotions.kpi.activePromotions', 'Active Promotions')}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {activePromotions}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('promotions.kpi.ofTotal', { total: totalPromotions, defaultValue: `of ${totalPromotions} total` })}
              </span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Tag className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-xs hover:shadow-sm transition-shadow">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('promotions.kpi.activeCoupons', 'Active Coupons')}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {activeCoupons}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('promotions.kpi.ofTotal', { total: totalCoupons, defaultValue: `of ${totalCoupons} total` })}
              </span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Ticket className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-xs hover:shadow-sm transition-shadow">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('promotions.kpi.totalRedemptions', 'Total Redemptions')}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {totalRedemptions.toLocaleString()}
              </span>
              <span className="text-xs text-emerald-600 flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> {t('promotions.kpi.live', 'Live')}
              </span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-xs hover:shadow-sm transition-shadow">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('promotions.kpi.totalDiscountsGiven', 'Total Discounts Given')}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {totalDiscountGiven.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-xs font-medium text-muted-foreground">{currencyCode}</span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
