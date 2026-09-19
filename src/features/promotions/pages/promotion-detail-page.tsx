import { useState, useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Edit,
  Copy,
  Trash2,
  Play,
  Pause,
  Ticket,
  Percent,
  Layers,
  Sliders,
  FileSpreadsheet,
  Building,
  ShoppingBag,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import {
  useInvPromotion,
  useChangePromotionStatus,
  useDuplicatePromotion,
  useDeletePromotion,
} from '../hooks/use-inv-promotions'
import type {
  PromotionStatus,
  RuleActionType,
  ConditionField,
  ConditionOperator,
} from '../types'

interface DetailRuleItem {
  id: string
  action_type?: RuleActionType | null
  rule_type?: RuleActionType | null
  ruleType?: RuleActionType | null
  discount_value: number | string
  apply_to: string
  buy_quantity?: number | null
  get_quantity?: number | null
  tier_min_amount?: number | string | null
}

interface DetailConditionItem {
  id: string
  field: ConditionField
  operator: ConditionOperator
  value: string
  logical_operator: string
}

interface DetailScopeNamedItem {
  id: string
  category?: { name: string } | null
  category_id?: string
  brand?: { name: string } | null
  brand_id?: string
  product?: { name: string } | null
  product_id?: string
  branch?: { name: string } | null
  branch_id?: string
  store?: { name: string } | null
  store_id?: string
  channel?: { name: string } | null
  channel_id?: string
}

interface DetailCouponItem {
  id: string
  code: string
  current_usages?: number
  max_usages?: number | null
  status: string
}

interface DetailUsageLogItem {
  id: string
  used_at: string | Date
  discount_amount: number | string
  sales_invoices?: { invoice_no: string } | null
  sales_orders?: { order_number: string } | null
  customers?: { name: string } | null
}

export function PromotionDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { promotionId } = useParams({ strict: false }) as { promotionId: string }
  const [activeTab, setActiveTab] = useState('rules')

  const { data: promo, isLoading, error } = useInvPromotion(promotionId)

  // Real-time subscription to external DB changes on this promotion
  useEffect(() => {
    if (!promotionId) return

    const channel = supabase
      .channel(`inv_promotion_detail_${promotionId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inv_promotions',
          filter: `id=eq.${promotionId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['inv_promotion', promotionId] })
          queryClient.invalidateQueries({ queryKey: ['inv_promotions'] })
          queryClient.invalidateQueries({ queryKey: ['inv_promotion_stats'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [promotionId, queryClient])

  const changeStatusMutation = useChangePromotionStatus()
  const duplicateMutation = useDuplicatePromotion()
  const deleteMutation = useDeletePromotion()

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header fixed>
          <div className="font-semibold text-sm">
            {t('promotions.detailPage.headerTitle', 'Promotion Details')}
          </div>
        </Header>
        <Main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </Main>
      </div>
    )
  }

  if (error || !promo) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header fixed>
          <div className="font-semibold text-sm">
            {t('promotions.detailPage.headerTitle', 'Promotion Details')}
          </div>
        </Header>
        <Main className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-destructive font-semibold">
            {t('promotions.detailPage.notFound', 'Promotion not found or access denied.')}
          </p>
          <Button variant="outline" onClick={() => navigate({ to: '/promotions' })}>
            {t('promotions.detailPage.backToPromotions', 'Back to Promotions')}
          </Button>
        </Main>
      </div>
    )
  }

  const handleToggleStatus = async () => {
    const nextStatus: PromotionStatus = promo.status === 'active' ? 'paused' : 'active'
    try {
      await changeStatusMutation.mutateAsync({ id: promo.id, status: nextStatus })
      toast.success(
        t('promotions.statusSuccess', {
          status: nextStatus === 'active' ? t('promotions.activated', 'activated') : t('promotions.paused', 'paused'),
          defaultValue: `Promotion ${nextStatus === 'active' ? 'activated' : 'paused'}`,
        })
      )
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('promotions.statusFailed', 'Status change failed')
      toast.error(msg)
    }
  }

  const handleDuplicate = async () => {
    try {
      const dup = await duplicateMutation.mutateAsync(promo.id)
      toast.success(t('promotions.duplicateSuccess', 'Promotion duplicated'))
      navigate({ to: `/promotions/${dup.id}` })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('promotions.duplicateFailed', 'Duplication failed')
      toast.error(msg)
    }
  }

  const handleDelete = async () => {
    if (confirm(t('promotions.confirmArchive', 'Are you sure you want to archive this promotion?'))) {
      try {
        await deleteMutation.mutateAsync(promo.id)
        toast.success(t('promotions.archiveSuccess', 'Promotion archived'))
        navigate({ to: '/promotions' })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : t('promotions.archiveFailed', 'Archive failed')
        toast.error(msg)
      }
    }
  }

  const startDate = promo.start_date || promo.startDate
  const endDate = promo.end_date || promo.endDate

  const currencyCode =
    promo.currency_code ||
    promo.currencyCode ||
    promo.currencies?.code ||
    promo.currency?.code ||
    'QAR'

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
            {t('promotions.detailPage.headerTitle', 'Promotion Details')}
          </span>
        </div>
        <div className="ms-auto flex items-center space-x-4">
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className="flex-1 flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {/* Top Header Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-border/60 bg-card shadow-xs">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {promo.name}
              </h1>
              {promo.code && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {promo.code}
                </Badge>
              )}
              <Badge
                className={
                  promo.status === 'active'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : promo.status === 'paused'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold'
                    : 'bg-muted text-muted-foreground'
                }
              >
                {t(`promotions.common.${promo.status}`, promo.status)}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {promo.promo_type?.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {promo.description || t('promotions.detailPage.noDescription', 'No description provided.')}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              className="gap-1.5 h-9"
            >
              {promo.status === 'active' ? (
                <>
                  <Pause className="h-4 w-4 text-amber-500" />
                  {t('promotions.detailPage.pause', 'Pause')}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 text-emerald-500" />
                  {t('promotions.detailPage.activate', 'Activate')}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDuplicate}
              className="gap-1.5 h-9"
            >
              <Copy className="h-4 w-4 text-blue-500" />
              {t('promotions.detailPage.duplicate', 'Duplicate')}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigate({
                  to: '/promotions/$promotionId/edit',
                  params: { promotionId: promo.id },
                }).catch(() => {
                  navigate({
                    to: '/promotions/new',
                  })
                })
              }}
              className="gap-1.5 h-9"
            >
              <Edit className="h-4 w-4" />
              {t('promotions.detailPage.edit', 'Edit')}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="gap-1.5 h-9 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* KPI Mini Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">
                {t('promotions.detailPage.redemptionsUsed', 'Redemptions Used')}
              </CardDescription>
              <CardTitle className="text-2xl font-bold">
                {promo.current_usage_count ?? 0}
                {promo.usage_limit && (
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    / {promo.usage_limit}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
              {promo.usage_per_customer
                ? t('promotions.detailPage.maxPerCustomer', {
                    count: promo.usage_per_customer,
                    defaultValue: `Max ${promo.usage_per_customer} per customer`,
                  })
                : t('promotions.detailPage.unlimitedPerCustomer', 'Unlimited per customer')}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">
                {t('promotions.detailPage.discountDistributed', 'Discount Distributed')}
              </CardDescription>
              <CardTitle className="text-2xl font-bold">
                {Number(promo.current_discount_amount ?? 0).toLocaleString()} {currencyCode}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
              {promo.max_discount_amount
                ? t('promotions.detailPage.cap', {
                    amount: `${Number(promo.max_discount_amount).toLocaleString()} ${currencyCode}`,
                    defaultValue: `Cap: ${Number(promo.max_discount_amount).toLocaleString()} ${currencyCode}`,
                  })
                : t('promotions.detailPage.noCap', 'No maximum cap')}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">
                {t('promotions.detailPage.couponsAttached', 'Coupons Attached')}
              </CardDescription>
              <CardTitle className="text-2xl font-bold">
                {promo.coupons?.length ?? 0}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
              {promo.requires_coupon
                ? t('promotions.detailPage.couponRequired', 'Coupon required to trigger')
                : t('promotions.detailPage.autoOrCoupon', 'Auto-applied or coupon')}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">
                {t('promotions.detailPage.activeDates', 'Active Dates')}
              </CardDescription>
              <CardTitle className="text-sm font-semibold">
                {startDate ? new Date(startDate).toLocaleDateString() : '—'} -{' '}
                {endDate
                  ? new Date(endDate).toLocaleDateString()
                  : t('promotions.detailPage.continuous', 'Continuous')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
              {t('promotions.detailPage.timezone', {
                zone: promo.timezone || 'Asia/Qatar',
                defaultValue: `Timezone: ${promo.timezone || 'Asia/Qatar'}`,
              })}
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Configuration & Analytics */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="rules" className="gap-1.5 text-xs">
              <Percent className="h-3.5 w-3.5" />
              {t('promotions.detailPage.rulesTab', {
                count: promo.rules?.length || 0,
                defaultValue: `Discount Rules (${promo.rules?.length || 0})`,
              })}
            </TabsTrigger>
            <TabsTrigger value="scopes" className="gap-1.5 text-xs">
              <Layers className="h-3.5 w-3.5" />
              {t('promotions.detailPage.scopesTab', 'Target Scopes')}
            </TabsTrigger>
            <TabsTrigger value="conditions" className="gap-1.5 text-xs">
              <Sliders className="h-3.5 w-3.5" />
              {t('promotions.detailPage.conditionsTab', {
                count: promo.conditions?.length || 0,
                defaultValue: `Conditions (${promo.conditions?.length || 0})`,
              })}
            </TabsTrigger>
            <TabsTrigger value="coupons" className="gap-1.5 text-xs">
              <Ticket className="h-3.5 w-3.5" />
              {t('promotions.detailPage.couponsTab', {
                count: promo.coupons?.length || 0,
                defaultValue: `Coupons (${promo.coupons?.length || 0})`,
              })}
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5 text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {t('promotions.detailPage.logsTab', {
                count: promo.usage_logs?.length || 0,
                defaultValue: `Redemption Logs (${promo.usage_logs?.length || 0})`,
              })}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Rules */}
          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t('promotions.detailPage.rulesTitle', 'Configured Discount Rules')}
                </CardTitle>
                <CardDescription>
                  {t(
                    'promotions.detailPage.rulesDesc',
                    'Actions and pricing adjustments performed when this promotion fires.'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(promo.rules?.length ?? 0) === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t('promotions.detailPage.noRules', 'No rules configured.')}
                  </p>
                ) : (
                  (promo.rules as unknown as DetailRuleItem[])?.map((rule: DetailRuleItem, i: number) => {
                    const ruleAction = rule.action_type || rule.rule_type || rule.ruleType
                    return (
                      <div
                        key={rule.id || i}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20 gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-mono">
                              #{i + 1}
                            </Badge>
                            <span className="font-semibold text-sm capitalize">
                              {ruleAction?.replace(/_/g, ' ')}
                            </span>
                            <Badge variant="secondary">
                                {ruleAction === 'percentage_discount'
                                  ? `${rule.discount_value}% ${t('promotions.common.off', 'OFF')}`
                                  : (ruleAction as string) === 'fixed_discount' || (ruleAction as string) === 'fixed_amount'
                                  ? `${Number(rule.discount_value)} ${currencyCode} ${t('promotions.common.off', 'OFF')}`
                                  : `Buy ${rule.buy_quantity} Get ${rule.get_quantity}`}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('promotions.detailPage.scopeAppliesTo', {
                              target: rule.apply_to,
                              defaultValue: `Scope: Applies to ${rule.apply_to}`,
                            })}
                          </p>
                        </div>

                      {rule.tier_min_amount && (
                        <div className="text-xs text-muted-foreground">
                          {t('promotions.detailPage.minAmount', {
                            amount: `${Number(rule.tier_min_amount)} ${currencyCode}`,
                            defaultValue: `Min Amount: ${Number(rule.tier_min_amount)} ${currencyCode}`,
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Scopes */}
          <TabsContent value="scopes" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Products & Categories */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                    {t('promotions.detailPage.catalogEntities', 'Catalog Entities')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div>
                    <span className="font-semibold block text-muted-foreground">
                      {t('promotions.detailPage.categories', 'Categories')}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(promo.categories?.length ?? 0) > 0 ? (
                        (promo.categories as DetailScopeNamedItem[]).map((c) => (
                          <Badge key={c.id} variant="secondary">
                            {c.category?.name || c.category_id}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">
                          {t('promotions.detailPage.allCategories', 'All Categories')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold block text-muted-foreground">
                      {t('promotions.detailPage.brands', 'Brands')}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(promo.brands?.length ?? 0) > 0 ? (
                        (promo.brands as DetailScopeNamedItem[]).map((b) => (
                          <Badge key={b.id} variant="secondary">
                            {b.brand?.name || b.brand_id}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">
                          {t('promotions.detailPage.allBrands', 'All Brands')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold block text-muted-foreground">
                      {t('promotions.detailPage.products', 'Products')}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(promo.products?.length ?? 0) > 0 ? (
                        (promo.products as DetailScopeNamedItem[]).map((p) => (
                          <Badge key={p.id} variant="secondary">
                            {p.product?.name || p.product_id}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">
                          {t('promotions.detailPage.allProducts', 'All Products')}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Locations & Channels */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary" />
                    {t('promotions.detailPage.locationsChannels', 'Locations & Channels')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div>
                    <span className="font-semibold block text-muted-foreground">
                      {t('promotions.detailPage.branches', 'Branches')}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(promo.branches?.length ?? 0) > 0 ? (
                        (promo.branches as DetailScopeNamedItem[]).map((b) => (
                          <Badge key={b.id} variant="secondary">
                            {b.branch?.name || b.branch_id}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">
                          {t('promotions.detailPage.allBranches', 'All Branches')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold block text-muted-foreground">
                      {t('promotions.detailPage.stores', 'Stores')}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(promo.stores?.length ?? 0) > 0 ? (
                        (promo.stores as DetailScopeNamedItem[]).map((s) => (
                          <Badge key={s.id} variant="secondary">
                            {s.store?.name || s.store_id}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">
                          {t('promotions.detailPage.allStores', 'All Stores')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold block text-muted-foreground">
                      {t('promotions.detailPage.channels', 'Channels')}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(promo.channels?.length ?? 0) > 0 ? (
                        (promo.channels as DetailScopeNamedItem[]).map((c) => (
                          <Badge key={c.id} variant="secondary">
                            {c.channel?.name || c.channel_id}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">
                          {t('promotions.detailPage.allChannels', 'All Channels (POS, Web, Marketplace)')}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 3: Conditions */}
          <TabsContent value="conditions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t('promotions.detailPage.conditionsTitle', 'Condition Check Rules')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(promo.conditions?.length ?? 0) === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'promotions.detailPage.conditionsEmpty',
                      'No custom conditions configured. The promotion triggers whenever eligible items are in cart.'
                    )}
                  </p>
                ) : (
                  (promo.conditions as DetailConditionItem[])?.map((cond) => (
                    <div
                      key={cond.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/60 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{cond.field}</Badge>
                        <span className="font-mono text-muted-foreground">{cond.operator}</span>
                        <span className="font-semibold text-foreground">{cond.value}</span>
                      </div>
                      <Badge variant="secondary">{cond.logical_operator}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Coupons */}
          <TabsContent value="coupons" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {t('promotions.detailPage.couponsTitle', 'Coupons for this Promotion')}
                  </CardTitle>
                  <CardDescription>
                    {t(
                      'promotions.detailPage.couponsDesc',
                      'Codes distributed to customers for redemption.'
                    )}
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate({ to: '/promotions/coupons' })}
                  className="gap-1.5"
                >
                  <Ticket className="h-4 w-4" />
                  {t('promotions.detailPage.manageCoupons', 'Manage Coupons')}
                </Button>
              </CardHeader>
              <CardContent>
                {(promo.coupons?.length ?? 0) === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t('promotions.detailPage.noCoupons', 'No coupons generated yet.')}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(promo.coupons as DetailCouponItem[])?.map((cpn) => (
                      <div
                        key={cpn.id}
                        className="p-3 rounded-xl border border-border/70 bg-card/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-sm tracking-wider block text-primary">
                            {cpn.code}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {t('promotions.detailPage.usagesCount', {
                              current: cpn.current_usages ?? 0,
                              max: cpn.max_usages || '∞',
                              defaultValue: `Usages: ${cpn.current_usages ?? 0} / ${cpn.max_usages || '∞'}`,
                            })}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            cpn.status === 'active'
                              ? 'text-emerald-600 border-emerald-500/30'
                              : 'text-muted-foreground'
                          }
                        >
                          {t(`promotions.common.${cpn.status}`, cpn.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: Usage Logs */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t('promotions.detailPage.logsTitle', 'Recent Redemptions Audit Log')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(promo.usage_logs?.length ?? 0) === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'promotions.detailPage.noLogs',
                      'No orders have redeemed this promotion yet.'
                    )}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/60 text-muted-foreground text-left">
                          <th className="py-2 px-3">
                            {t('promotions.detailPage.date', 'Date')}
                          </th>
                          <th className="py-2 px-3">
                            {t('promotions.detailPage.orderInvoice', 'Order / Invoice')}
                          </th>
                          <th className="py-2 px-3">
                            {t('promotions.detailPage.customer', 'Customer')}
                          </th>
                          <th className="py-2 px-3 text-right">
                            {t('promotions.detailPage.discountGiven', 'Discount Given')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y border-border/40">
                        {((promo.usage_logs as unknown) as DetailUsageLogItem[])?.map((log) => (
                          <tr key={log.id} className="hover:bg-muted/30">
                            <td className="py-2.5 px-3">
                              {new Date(log.used_at).toLocaleDateString()}
                            </td>
                            <td className="py-2.5 px-3 font-mono">
                              {log.sales_invoices?.invoice_no || log.sales_orders?.order_number || log.id.slice(0, 8)}
                            </td>
                            <td className="py-2.5 px-3">
                              {log.customers?.name || t('promotions.detailPage.walkInCustomer', 'Walk-in Customer')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">
                              -{Number(log.discount_amount).toLocaleString()} {currencyCode}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>
    </div>
  )
}
