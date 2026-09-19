import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  BarChart3,
  Building,
  Tag,
  Loader2,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDiscountAnalytics } from '../hooks/use-discount-analytics'

export function DiscountReportsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('30')

  const getDateFilter = () => {
    if (dateRange === 'all') return {}
    const days = parseInt(dateRange, 10)
    const d = new Date()
    d.setDate(d.getDate() - days)
    return { startDate: d.toISOString() }
  }

  const { data: analytics, isLoading } = useDiscountAnalytics(getDateFilter())

  const currency = analytics?.summary.currencyCode || t('common.qar', 'QAR')

  return (
    <div className="flex flex-col min-h-screen">
      <Header fixed>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/promotions' })}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">
            {t('promotions.reportsPage.headerTitle', 'Discount & Promotion Analytics')}
          </span>
        </div>
        <div className="ms-auto flex items-center space-x-4">
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className="flex-1 flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {t('promotions.reportsPage.title', 'Promotion & Discount Analytics')}
              </h1>
              <span className="text-xs bg-blue-500/10 text-blue-600 font-semibold px-2 py-0.5 rounded-full">
                {t('promotions.reportsPage.badge', 'Financial Impact')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t(
                'promotions.reportsPage.description',
                'Track promotional spend, discount breakdown by channel, coupon performance, and top margin drivers.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={dateRange}
              onValueChange={(val: string) =>
                setDateRange(val as '7' | '30' | '90' | 'all')
              }
            >
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder={t('promotions.reportsPage.dateRange', 'Date Range')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">
                  {t('promotions.reportsPage.last7Days', 'Last 7 Days')}
                </SelectItem>
                <SelectItem value="30">
                  {t('promotions.reportsPage.last30Days', 'Last 30 Days')}
                </SelectItem>
                <SelectItem value="90">
                  {t('promotions.reportsPage.last90Days', 'Last 90 Days')}
                </SelectItem>
                <SelectItem value="all">
                  {t('promotions.reportsPage.allTime', 'All Time')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">
                {t('promotions.reportsPage.totalDiscountsGiven', 'Total Discounts Given')}
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  `${Number(analytics?.summary.totalDiscountAmount ?? 0).toLocaleString()} ${currency}`
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
              {t(
                'promotions.reportsPage.totalDiscountsDesc',
                'Cumulative promotional price concessions'
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">
                {t('promotions.reportsPage.discountedOrders', 'Discounted Orders')}
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  analytics?.summary.totalTransactions ?? 0
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
              {t(
                'promotions.reportsPage.discountedOrdersDesc',
                'Total sales orders with applied discounts'
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">
                {t('promotions.reportsPage.avgDiscount', 'Avg Discount per Order')}
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  `${Number(analytics?.summary.avgDiscountPerTx ?? 0).toLocaleString()} ${currency}`
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
              {t(
                'promotions.reportsPage.avgDiscountDesc',
                'Average basket deduction per redemption'
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">
                {t('promotions.reportsPage.topPromotionShare', 'Top Promotion Share')}
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  t('promotions.reportsPage.activeCount', {
                    count: analytics?.topPromotions?.length ?? 0,
                    defaultValue: `${analytics?.topPromotions?.length ?? 0} active`,
                  })
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
              {t('promotions.reportsPage.topPromotionDesc', 'Ranked promotional campaigns')}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Discounts By Source */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                {t('promotions.reportsPage.discountsBySource', 'Discounts by Source')}
              </CardTitle>
              <CardDescription>
                {t(
                  'promotions.reportsPage.discountsBySourceDesc',
                  'Comparison between automated promotions, coupon codes, and manual cashier discounts.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics?.discountsBySource?.map((src) => {
                    const total = analytics.summary.totalDiscountAmount || 1
                    const pct = Math.min(100, Math.round((src.amount / total) * 100))
                    return (
                      <div key={src.source} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold capitalize text-foreground">
                            {src.source.replace(/_/g, ' ')}
                          </span>
                          <span className="text-muted-foreground font-medium">
                            {Number(src.amount).toLocaleString()} {currency} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              src.source === 'promotion'
                                ? 'bg-primary'
                                : src.source === 'coupon'
                                ? 'bg-purple-500'
                                : src.source === 'manual'
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discounts By Branch */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" />
                {t('promotions.reportsPage.discountsByBranch', 'Discounts by Branch')}
              </CardTitle>
              <CardDescription>
                {t(
                  'promotions.reportsPage.discountsByBranchDesc',
                  'Promotional discounts allocated per physical branch location.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : analytics?.discountsByBranch?.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t('promotions.reportsPage.noBranchData', 'No branch data available.')}
                </p>
              ) : (
                <div className="space-y-4">
                  {analytics?.discountsByBranch?.map((br) => {
                    const total = analytics.summary.totalDiscountAmount || 1
                    const pct = Math.min(100, Math.round((br.amount / total) * 100))
                    return (
                      <div key={br.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">{br.name}</span>
                          <span className="text-muted-foreground font-medium">
                            {Number(br.amount).toLocaleString()} {currency} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Promotions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              {t('promotions.reportsPage.topPromotions', 'Top Performing Promotions')}
            </CardTitle>
            <CardDescription>
              {t(
                'promotions.reportsPage.topPromotionsDesc',
                'Promotions ranked by highest total discount generated and customer order volume.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : analytics?.topPromotions?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                {t(
                  'promotions.reportsPage.noRedemptions',
                  'No promotion redemptions recorded in selected timeframe.'
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground text-left bg-muted/20">
                      <th className="py-3 px-4">
                        {t('promotions.reportsPage.promotionName', 'Promotion Name')}
                      </th>
                      <th className="py-3 px-4">
                        {t('promotions.reportsPage.type', 'Type')}
                      </th>
                      <th className="py-3 px-4">
                        {t('promotions.reportsPage.redemptions', 'Redemptions')}
                      </th>
                      <th className="py-3 px-4 text-right">
                        {t('promotions.reportsPage.totalConcession', 'Total Concession')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-border/40">
                    {analytics?.topPromotions?.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-medium text-foreground">
                          {p.name}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="capitalize">
                            {p.promoType?.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {t('promotions.reportsPage.ordersCount', {
                            count: p.count,
                            defaultValue: `${p.count} orders`,
                          })}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-foreground">
                          {Number(p.totalAmount).toLocaleString()} {currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </Main>
    </div>
  )
}
