import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Tag,
  Search,
  Loader2,
  Ticket,
  Calendar,
  Percent,
  DollarSign,
  Check,
  X,
  BadgePercent,
  ArrowRight,
  Sparkles,
  ShoppingBag,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import { validatePosPromotion } from '../data/api'
import { usePosStore } from '../store/use-pos-store'
import { useInvPromotions } from '@/features/promotions/hooks/use-inv-promotions'

interface PromoCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PromoCodeDialog({ open, onOpenChange }: PromoCodeDialogProps) {
  const { t } = useTranslation()
  const { applyPromotion, removePromotion, appliedPromotion, getSubtotal } =
    usePosStore()
  const subtotal = getSubtotal()

  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const [promoSearch, setPromoSearch] = useState('')
  const [filterType, setFilterType] = useState<
    'all' | 'qualifies' | 'percentage' | 'fixed'
  >('all')

  // Fetch active promotions from ERP promotions service
  const {
    data: promotionsData,
    isLoading: isLoadingPromos,
  } = useInvPromotions({ status: 'active', pageSize: 100 })

  // Direct Supabase fallback in case ERP API query returns empty or is unauthorized
  const [fallbackPromos, setFallbackPromos] = useState<any[]>([])
  const [isLoadingFallback, setIsLoadingFallback] = useState(false)

  useEffect(() => {
    const listFromApi =
      (promotionsData?.data || promotionsData?.promotions || []) as any[]

    if (listFromApi.length === 0 && !isLoadingPromos && open) {
      let isMounted = true
      setIsLoadingFallback(true)

      supabase
        .from('inv_promotions')
        .select(`
          id,
          name,
          code,
          description,
          status,
          promo_type,
          start_date,
          end_date,
          min_order_amount,
          max_discount_amount,
          usage_limit,
          current_usage_count,
          rules:inv_promotion_rules (*)
        `)
        .eq('status', 'active')
        .then(({ data, error }) => {
          if (!isMounted) return
          setIsLoadingFallback(false)
          if (!error && data) {
            setFallbackPromos(data)
          }
        })
        .catch(() => {
          if (isMounted) setIsLoadingFallback(false)
        })

      return () => {
        isMounted = false
      }
    }
  }, [promotionsData, isLoadingPromos, open])

  // Combine results
  const allPromos = useMemo(() => {
    const listFromApi =
      (promotionsData?.data || promotionsData?.promotions || []) as any[]
    if (listFromApi.length > 0) return listFromApi
    return fallbackPromos
  }, [promotionsData, fallbackPromos])

  // Filter only those truly available based on dates and usage limits
  const activeAvailablePromos = useMemo(() => {
    const now = new Date()
    return allPromos.filter((p: any) => {
      if (p.status !== 'active') return false

      // Start date: if set, must not be in future
      const start = p.startDate || p.start_date
      if (start && new Date(start) > now) return false

      // End date: if set, must not be in past
      const end = p.endDate || p.end_date
      if (end && new Date(end) < now) return false

      // Usage limit: if set, must not be exceeded
      const limit = p.usageLimit ?? p.usage_limit
      const currentUsage = p.currentUsageCount ?? p.current_usage_count ?? 0
      if (limit && currentUsage >= limit) return false

      return true
    })
  }, [allPromos])

  // Filter based on search and quick chips
  const filteredPromotions = useMemo(() => {
    let list = activeAvailablePromos

    if (filterType === 'qualifies') {
      list = list.filter((p: any) => {
        const minOrder = Number(p.minOrderAmount ?? p.min_order_amount ?? 0)
        return subtotal >= minOrder
      })
    } else if (filterType === 'percentage') {
      list = list.filter((p: any) => {
        const type =
          p.promoType ||
          p.promo_type ||
          p.rules?.[0]?.rule_type ||
          p.rules?.[0]?.ruleType
        return type === 'percentage' || type === 'percentage_discount'
      })
    } else if (filterType === 'fixed') {
      list = list.filter((p: any) => {
        const type =
          p.promoType ||
          p.promo_type ||
          p.rules?.[0]?.rule_type ||
          p.rules?.[0]?.ruleType
        return (
          type === 'fixed_amount' ||
          type === 'fixed_amount_discount' ||
          type === 'fixed_discount'
        )
      })
    }

    if (!promoSearch.trim()) return list
    const q = promoSearch.toLowerCase()
    return list.filter(
      (p: any) =>
        p.name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.promo_type?.toLowerCase().includes(q) ||
        p.promoType?.toLowerCase().includes(q)
    )
  }, [activeAvailablePromos, filterType, promoSearch, subtotal])

  const handleApplyCode = async (promoCode?: string) => {
    const codeToUse = (promoCode || code).trim().toUpperCase()
    if (!codeToUse) return

    setLoading(true)
    try {
      const promo = await validatePosPromotion(codeToUse)
      applyPromotion(promo)

      const minOrder = Number(promo.min_order_amount ?? 0)
      if (minOrder > 0 && subtotal < minOrder) {
        toast.info(
          t(
            'pos.promotions.appliedMinSpendNotice',
            'Promotion applied! It will activate when cart reaches {{amount}} (Current subtotal: {{current}}).',
            {
              amount: formatCurrency(minOrder),
              current: formatCurrency(subtotal),
            }
          )
        )
      } else {
        toast.success(
          t('pos.promotions.successToast', 'Promotion applied successfully!')
        )
      }
      onOpenChange(false)
      setCode('')
    } catch (err: any) {
      toast.error(
        err.message || t('pos.promotions.invalidToast', 'Invalid promotion code')
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPromo = (promo: any) => {
    const primaryRule = promo.rules?.[0]
    const discountVal = primaryRule
      ? Number(primaryRule.discountValue ?? primaryRule.discount_value ?? 0)
      : Number(promo.discountValue ?? promo.discount_value ?? 0)

    const promoType =
      promo.promoType ||
      promo.promo_type ||
      primaryRule?.ruleType ||
      primaryRule?.rule_type ||
      'percentage'

    const isFixed =
      promoType === 'fixed_amount' ||
      promoType === 'fixed_amount_discount' ||
      promoType === 'fixed_discount'

    const minOrder = Number(promo.minOrderAmount ?? promo.min_order_amount ?? 0)
    const maxDiscount =
      promo.maxDiscountAmount !== undefined && promo.maxDiscountAmount !== null
        ? Number(promo.maxDiscountAmount)
        : promo.max_discount_amount !== undefined &&
            promo.max_discount_amount !== null
          ? Number(promo.max_discount_amount)
          : null

    applyPromotion({
      promotion_id: promo.id,
      name: promo.name,
      code: promo.code || promo.name,
      discount_type: isFixed ? 'fixed' : 'percentage',
      discount_value: discountVal,
      min_order_amount: minOrder,
      max_discount_amount: maxDiscount,
      is_inv_promotion: true,
    })

    if (minOrder > 0 && subtotal < minOrder) {
      toast.info(
        t(
          'pos.promotions.appliedMinSpendNotice',
          'Promotion "{{name}}" selected! It will activate when cart reaches {{amount}} (Current subtotal: {{current}}).',
          {
            name: promo.name,
            amount: formatCurrency(minOrder),
            current: formatCurrency(subtotal),
          }
        )
      )
    } else {
      toast.success(
        t('pos.promotions.appliedToast', 'Promotion "{{name}}" applied!', {
          name: promo.name,
        })
      )
    }
    onOpenChange(false)
  }

  const handleRemove = () => {
    removePromotion()
    setCode('')
    toast.success(t('pos.promotions.removedToast', 'Promotion removed'))
  }

  const formatPromoDiscount = (promo: any) => {
    const rule = promo.rules?.[0]
    const val = rule
      ? Number(rule.discountValue ?? rule.discount_value ?? 0)
      : Number(promo.discountValue ?? promo.discount_value ?? 0)
    const type =
      promo.promoType ||
      promo.promo_type ||
      rule?.ruleType ||
      rule?.rule_type ||
      'percentage'

    if (
      type === 'fixed_amount' ||
      type === 'fixed_amount_discount' ||
      type === 'fixed_discount'
    ) {
      return formatCurrency(val)
    }
    if (type === 'buy_x_get_y') {
      return 'BOGO'
    }
    if (type === 'free_item') {
      return t('pos.promotions.freeItem', 'Free Item')
    }
    return `${val}%`
  }

  const formatDate = (d: string | null | undefined) => {
    if (!d) return null
    return new Date(d).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const isLoading = isLoadingPromos || isLoadingFallback

  // Check current applied promotion savings
  const appliedDiscount = appliedPromotion
    ? usePosStore.getState().getCartDiscountAmount()
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[88vh] overflow-hidden sm:max-w-xl p-0 gap-0 border-border/80 shadow-2xl'>
        {/* Header */}
        <div className='p-4 border-b bg-muted/20'>
          <DialogHeader className='space-y-1.5'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2.5'>
                <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                  <BadgePercent className='h-5 w-5' />
                </div>
                <div>
                  <DialogTitle className='text-base font-bold text-foreground'>
                    {t('pos.promotions.title', 'Promotions & Discounts')}
                  </DialogTitle>
                  <DialogDescription className='text-xs text-muted-foreground'>
                    {t(
                      'pos.promotions.desc',
                      'Apply a promo code or select from currently available store promotions.'
                    )}
                  </DialogDescription>
                </div>
              </div>

              {/* Cart Subtotal Pill */}
              <div className='hidden sm:flex items-center gap-1.5 rounded-full border bg-background/80 px-2.5 py-1 text-xs shadow-xs'>
                <ShoppingBag className='h-3.5 w-3.5 text-muted-foreground' />
                <span className='text-muted-foreground'>
                  {t('pos.cartSection.subtotal', 'Cart Subtotal')}:
                </span>
                <span className='font-bold text-foreground'>
                  {formatCurrency(subtotal)}
                </span>
              </div>
            </div>
          </DialogHeader>

          {/* Currently applied promo banner */}
          {appliedPromotion && (
            <div className='mt-3 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 shadow-xs'>
              <div className='flex items-center gap-2.5 min-w-0 flex-1'>
                <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'>
                  <Check className='h-4 w-4 stroke-[2.5]' />
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate'>
                      {appliedPromotion.name || appliedPromotion.code}
                    </span>
                    {appliedPromotion.code && (
                      <Badge
                        variant='outline'
                        className='h-4 border-emerald-500/40 bg-emerald-500/5 px-1 font-mono text-[9px] text-emerald-700 dark:text-emerald-300'
                      >
                        {appliedPromotion.code}
                      </Badge>
                    )}
                  </div>
                  <div className='flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5'>
                    <span>
                      {appliedPromotion.discount_type === 'fixed'
                        ? formatCurrency(Number(appliedPromotion.discount_value))
                        : `${appliedPromotion.discount_value}%`}{' '}
                      {t('pos.promotions.off', 'off')}
                    </span>
                    {appliedDiscount > 0 ? (
                      <>
                        <span>•</span>
                        <span className='font-semibold'>
                          {t('pos.promotions.savingAmount', 'Saving {{amount}}', {
                            amount: formatCurrency(appliedDiscount),
                          })}
                        </span>
                      </>
                    ) : appliedPromotion.min_order_amount &&
                      subtotal < appliedPromotion.min_order_amount ? (
                      <>
                        <span>•</span>
                        <span className='text-amber-600 dark:text-amber-400 font-medium'>
                          {t(
                            'pos.promotions.needsMoreSpend',
                            'Add {{amount}} to activate',
                            {
                              amount: formatCurrency(
                                appliedPromotion.min_order_amount - subtotal
                              ),
                            }
                          )}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
              <Button
                variant='ghost'
                size='sm'
                className='h-7 shrink-0 text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-600'
                onClick={handleRemove}
              >
                <X className='mr-1 h-3.5 w-3.5' />
                {t('pos.promotions.remove', 'Remove')}
              </Button>
            </div>
          )}
        </div>

        {/* Content Body with Tabs */}
        <Tabs defaultValue='browse' className='flex flex-col flex-1 min-h-0'>
          <div className='px-4 pt-3 pb-1 border-b bg-muted/10'>
            <TabsList className='grid w-full grid-cols-2 h-9'>
              <TabsTrigger value='browse' className='text-xs gap-1.5 font-semibold'>
                <Ticket className='h-3.5 w-3.5 text-primary' />
                <span>
                  {t('pos.promotions.browsePromosTab', 'Active Promotions')}
                </span>
                {activeAvailablePromos.length > 0 && (
                  <Badge
                    variant='secondary'
                    className='ml-1 h-4 px-1.5 text-[10px] font-bold'
                  >
                    {activeAvailablePromos.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value='enter' className='text-xs gap-1.5 font-semibold'>
                <Tag className='h-3.5 w-3.5' />
                <span>{t('pos.promotions.enterCodeTab', 'Enter Promo Code')}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Browse Active Promotions Tab */}
          <TabsContent value='browse' className='m-0 p-4 flex flex-col flex-1 min-h-0 overflow-hidden'>
            {/* Search Bar & Quick Filters */}
            <div className='space-y-2 mb-3 shrink-0'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
                <Input
                  placeholder={t(
                    'pos.promotions.searchPromosPlaceholder',
                    'Search active promotions by name, code or type...'
                  )}
                  value={promoSearch}
                  onChange={(e) => setPromoSearch(e.target.value)}
                  className='h-9 pl-9 text-xs'
                />
                {promoSearch && (
                  <Button
                    variant='ghost'
                    size='sm'
                    className='absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs'
                    onClick={() => setPromoSearch('')}
                  >
                    {t('pos.main.clear', 'Clear')}
                  </Button>
                )}
              </div>

              {/* Quick Filter Pills */}
              <div className='flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5'>
                <Button
                  type='button'
                  size='sm'
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  className='h-6 rounded-full px-2.5 text-[11px] font-medium'
                  onClick={() => setFilterType('all')}
                >
                  {t('pos.promotions.allActive', 'All Active')} (
                  {activeAvailablePromos.length})
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant={filterType === 'qualifies' ? 'default' : 'outline'}
                  className='h-6 rounded-full px-2.5 text-[11px] font-medium'
                  onClick={() => setFilterType('qualifies')}
                >
                  <Sparkles className='mr-1 h-3 w-3 text-emerald-500' />
                  {t('pos.promotions.cartQualifies', 'Cart Qualifies')}
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant={filterType === 'percentage' ? 'default' : 'outline'}
                  className='h-6 rounded-full px-2.5 text-[11px] font-medium'
                  onClick={() => setFilterType('percentage')}
                >
                  <Percent className='mr-1 h-3 w-3' />
                  {t('pos.promotions.percentage', 'Percentage')}
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant={filterType === 'fixed' ? 'default' : 'outline'}
                  className='h-6 rounded-full px-2.5 text-[11px] font-medium'
                  onClick={() => setFilterType('fixed')}
                >
                  <DollarSign className='mr-1 h-3 w-3' />
                  {t('pos.promotions.fixedAmount', 'Fixed Amount')}
                </Button>
              </div>
            </div>

            {/* Promotions List */}
            <ScrollArea className='h-[350px] pr-2'>
              {isLoading ? (
                <div className='flex flex-col items-center justify-center py-16 text-muted-foreground'>
                  <Loader2 className='h-7 w-7 animate-spin text-primary mb-2' />
                  <p className='text-xs font-medium'>
                    {t('pos.promotions.loadingPromos', 'Loading active promotions...')}
                  </p>
                </div>
              ) : filteredPromotions.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-14 text-center text-muted-foreground'>
                  <div className='h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-3'>
                    <Ticket className='h-6 w-6 opacity-40' />
                  </div>
                  <h4 className='text-sm font-semibold text-foreground'>
                    {promoSearch || filterType !== 'all'
                      ? t(
                          'pos.promotions.noMatchingPromotions',
                          'No promotions match your filter'
                        )
                      : t(
                          'pos.promotions.noPromotionsFound',
                          'No active promotions found'
                        )}
                  </h4>
                  <p className='text-xs mt-1 max-w-xs text-muted-foreground'>
                    {promoSearch || filterType !== 'all'
                      ? t(
                          'pos.promotions.clearSearchHint',
                          'Try clearing filters or search to view all promotions.'
                        )
                      : t(
                          'pos.promotions.noPromosDesc',
                          'There are currently no active promotions. You can still apply a coupon code manually.'
                        )}
                  </p>
                  {(promoSearch || filterType !== 'all') && (
                    <Button
                      variant='outline'
                      size='sm'
                      className='mt-3 text-xs h-7'
                      onClick={() => {
                        setPromoSearch('')
                        setFilterType('all')
                      }}
                    >
                      {t('pos.promotions.resetFilters', 'Reset Filters')}
                    </Button>
                  )}
                </div>
              ) : (
                <div className='space-y-2.5 pb-2'>
                  {filteredPromotions.map((promo: any) => {
                    const isApplied =
                      appliedPromotion?.promotion_id === promo.id ||
                      (appliedPromotion?.code &&
                        promo.code &&
                        appliedPromotion.code.toUpperCase() ===
                          promo.code.toUpperCase())

                    const minOrder = Number(
                      promo.minOrderAmount ?? promo.min_order_amount ?? 0
                    )
                    const qualifies = subtotal >= minOrder
                    const discountText = formatPromoDiscount(promo)
                    const promoType =
                      promo.promoType ||
                      promo.promo_type ||
                      promo.rules?.[0]?.rule_type ||
                      ''
                    const isFixed =
                      promoType === 'fixed_amount' ||
                      promoType === 'fixed_amount_discount' ||
                      promoType === 'fixed_discount'

                    const endDateStr = formatDate(promo.endDate || promo.end_date)
                    const maxDiscount =
                      promo.maxDiscountAmount ?? promo.max_discount_amount
                    const usageLimit = promo.usageLimit ?? promo.usage_limit
                    const currentUsage =
                      promo.currentUsageCount ?? promo.current_usage_count ?? 0

                    return (
                      <Card
                        key={promo.id}
                        className={`group relative overflow-hidden transition-all border ${
                          isApplied
                            ? 'border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20 shadow-xs'
                            : 'hover:border-primary/40 hover:shadow-xs'
                        }`}
                      >
                        <CardContent className='p-3.5 space-y-2.5'>
                          {/* Card Top Row: Name, Code & Discount Badge */}
                          <div className='flex items-start justify-between gap-3'>
                            <div className='min-w-0 flex-1 space-y-1'>
                              <div className='flex items-center gap-2 flex-wrap'>
                                <h4 className='text-xs sm:text-sm font-bold text-foreground leading-tight'>
                                  {promo.name}
                                </h4>
                                {promo.code ? (
                                  <Badge
                                    variant='outline'
                                    className='h-5 px-1.5 font-mono text-[10px] font-semibold tracking-wide bg-background'
                                  >
                                    {promo.code}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant='secondary'
                                    className='h-5 px-1.5 text-[9px] font-semibold text-primary/80 bg-primary/5'
                                  >
                                    {t(
                                      'pos.promotions.storePromo',
                                      'Store Promo'
                                    )}
                                  </Badge>
                                )}
                              </div>

                              {promo.description && (
                                <p className='text-[11px] text-muted-foreground line-clamp-1'>
                                  {promo.description}
                                </p>
                              )}
                            </div>

                            {/* Discount Value Badge */}
                            <Badge
                              className={`shrink-0 h-7 px-2.5 text-xs font-bold gap-1 shadow-xs ${
                                isApplied
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                                  : 'bg-primary text-primary-foreground'
                              }`}
                            >
                              {isFixed ? (
                                <DollarSign className='h-3.5 w-3.5' />
                              ) : (
                                <Percent className='h-3.5 w-3.5' />
                              )}
                              <span>
                                {discountText} {t('pos.promotions.offCaps', 'OFF')}
                              </span>
                            </Badge>
                          </div>

                          {/* Requirements & Qualification Badges */}
                          <div className='flex items-center gap-2 flex-wrap text-[11px]'>
                            {minOrder > 0 ? (
                              qualifies ? (
                                <Badge
                                  variant='outline'
                                  className='h-5 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-medium'
                                >
                                  ✓{' '}
                                  {t(
                                    'pos.promotions.qualifiesWithMin',
                                    'Cart qualifies (Min. {{amount}})',
                                    { amount: formatCurrency(minOrder) }
                                  )}
                                </Badge>
                              ) : (
                                <Badge
                                  variant='outline'
                                  className='h-5 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-medium'
                                >
                                  {t(
                                    'pos.promotions.minSpendNotice',
                                    'Min. {{min}} (Need {{diff}} more)',
                                    {
                                      min: formatCurrency(minOrder),
                                      diff: formatCurrency(minOrder - subtotal),
                                    }
                                  )}
                                </Badge>
                              )
                            ) : (
                              <Badge
                                variant='outline'
                                className='h-5 text-[10px] text-muted-foreground'
                              >
                                {t(
                                  'pos.promotions.noMinSpend',
                                  'No minimum spend'
                                )}
                              </Badge>
                            )}

                            {maxDiscount && (
                              <span className='text-[10px] text-muted-foreground'>
                                {t('pos.promotions.maxDiscount', 'Max: {{amount}}', {
                                  amount: formatCurrency(Number(maxDiscount)),
                                })}
                              </span>
                            )}
                          </div>

                          <Separator className='my-1' />

                          {/* Footer Row: Validity, Redemptions & Action Button */}
                          <div className='flex items-center justify-between gap-2 pt-0.5'>
                            <div className='flex items-center gap-3 text-[10px] text-muted-foreground'>
                              {endDateStr && (
                                <div className='flex items-center gap-1'>
                                  <Calendar className='h-3 w-3' />
                                  <span>
                                    {t(
                                      'pos.promotions.validUntil',
                                      'Valid until {{date}}',
                                      { date: endDateStr }
                                    )}
                                  </span>
                                </div>
                              )}
                              {usageLimit && (
                                <span className='font-medium'>
                                  {currentUsage} / {usageLimit}{' '}
                                  {t('pos.promotions.used', 'used')}
                                </span>
                              )}
                            </div>

                            {/* Action Button */}
                            {isApplied ? (
                              <Button
                                size='sm'
                                variant='outline'
                                className='h-7 text-xs border-emerald-500/40 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20'
                                disabled
                              >
                                <Check className='mr-1.5 h-3.5 w-3.5 stroke-[2.5]' />
                                {t('pos.promotions.applied', 'Applied')}
                              </Button>
                            ) : (
                              <Button
                                size='sm'
                                className='h-7 px-3 text-xs gap-1 font-semibold'
                                onClick={() => handleSelectPromo(promo)}
                              >
                                <span>
                                  {t('pos.promotions.applyPromo', 'Apply')}
                                </span>
                                <ArrowRight className='h-3 w-3' />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Enter Promo Code Tab */}
          <TabsContent value='enter' className='m-0 p-4 space-y-4'>
            <div className='rounded-lg border bg-card p-4 space-y-3 shadow-xs'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-bold text-foreground'>
                  {t('pos.promotions.codeLabel', 'Promotion or Voucher Code')}
                </Label>
                <p className='text-xs text-muted-foreground'>
                  {t(
                    'pos.promotions.codeHelp',
                    'Enter a customer discount code, marketing coupon, or special voucher.'
                  )}
                </p>
              </div>

              <div className='flex gap-2'>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t(
                    'pos.promotions.codePlaceholder',
                    'SUMMER20, VIP10, BOGO...'
                  )}
                  disabled={loading}
                  className='h-10 text-sm font-semibold font-mono uppercase tracking-wider'
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleApplyCode()
                    }
                  }}
                  autoFocus
                />
                <Button
                  size='sm'
                  onClick={() => handleApplyCode()}
                  disabled={loading || !code.trim()}
                  className='h-10 px-4 gap-1.5 font-bold shrink-0'
                >
                  {loading ? (
                    <>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      <span>{t('pos.promotions.validating', 'Checking...')}</span>
                    </>
                  ) : (
                    <>
                      <Tag className='h-4 w-4' />
                      <span>{t('pos.promotions.applyCodeBtn', 'Apply Code')}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className='flex justify-end gap-2 pt-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {t('pos.cartSection.cancel', 'Close')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
