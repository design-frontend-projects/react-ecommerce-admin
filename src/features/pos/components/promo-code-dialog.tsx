import { useState, useMemo } from 'react'
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
import { validatePosPromotion } from '../data/api'
import { usePosStore } from '../store/use-pos-store'
import { useInvPromotions } from '@/features/promotions/hooks/use-inv-promotions'

interface PromoCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PromoCodeDialog({ open, onOpenChange }: PromoCodeDialogProps) {
  const { applyPromotion, removePromotion, appliedPromotion } = usePosStore()
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const [promoSearch, setPromoSearch] = useState('')

  // Fetch all active promotions for the browse tab
  const { data: promotionsData, isLoading: isLoadingPromos } =
    useInvPromotions({ status: 'active' })

  const promotions = useMemo(() => {
    const list = promotionsData?.promotions ?? []
    if (!promoSearch) return list
    const q = promoSearch.toLowerCase()
    return list.filter(
      (p: any) =>
        p.name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.promo_type?.toLowerCase().includes(q)
    )
  }, [promotionsData, promoSearch])

  const handleApplyCode = async (promoCode?: string) => {
    const codeToUse = (promoCode || code).trim().toUpperCase()
    if (!codeToUse) return

    setLoading(true)
    try {
      const promo = await validatePosPromotion(codeToUse)
      applyPromotion(promo)
      toast.success('Promotion applied successfully!')
      onOpenChange(false)
      setCode('')
    } catch (err: any) {
      toast.error(err.message || 'Invalid promotion code')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPromo = async (promo: any) => {
    // If the promo has a code, validate via the standard flow
    const promoCode = promo.code || promo.name
    if (promoCode) {
      await handleApplyCode(promoCode)
      return
    }

    // Direct apply for promos without code (auto-apply)
    const primaryRule = promo.rules?.[0]
    const discountVal = primaryRule
      ? Number(primaryRule.discountValue ?? primaryRule.discount_value ?? 0)
      : 0
    const isFixed =
      promo.promoType === 'fixed_amount' ||
      promo.promo_type === 'fixed_amount' ||
      primaryRule?.ruleType === 'fixed_amount_discount' ||
      primaryRule?.rule_type === 'fixed_amount_discount'

    applyPromotion({
      promotion_id: promo.id,
      name: promo.name,
      code: promo.code || promo.name,
      discount_type: isFixed ? 'fixed' : 'percentage',
      discount_value: discountVal,
      is_inv_promotion: true,
    })
    toast.success(`Promotion "${promo.name}" applied!`)
    onOpenChange(false)
  }

  const handleRemove = () => {
    removePromotion()
    setCode('')
    toast.success('Promotion removed')
  }

  const formatPromoDiscount = (promo: any) => {
    const rule = promo.rules?.[0]
    const val = rule
      ? Number(rule.discountValue ?? rule.discount_value ?? 0)
      : 0
    const type =
      promo.promoType || promo.promo_type || rule?.ruleType || rule?.rule_type
    if (
      type === 'fixed_amount' ||
      type === 'fixed_amount_discount' ||
      type === 'fixed_discount'
    ) {
      return formatCurrency(val)
    }
    return `${val}%`
  }

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[85vh] overflow-hidden sm:max-w-lg'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary/10'>
              <BadgePercent className='h-4 w-4 text-primary' />
            </div>
            <div>
              <DialogTitle className='text-sm font-bold'>
                Promotions & Coupons
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Browse active promotions or enter a promo code.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Currently applied promo banner */}
        {appliedPromotion && (
          <div className='flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2.5'>
            <div className='flex items-center gap-2'>
              <Check className='h-4 w-4 text-emerald-600' />
              <div>
                <p className='text-xs font-semibold text-emerald-700 dark:text-emerald-400'>
                  Active:{' '}
                  {appliedPromotion.code || appliedPromotion.name}
                </p>
                <p className='text-[10px] text-muted-foreground'>
                  {appliedPromotion.discount_type === 'fixed'
                    ? formatCurrency(Number(appliedPromotion.discount_value))
                    : `${appliedPromotion.discount_value}%`}{' '}
                  off
                </p>
              </div>
            </div>
            <Button
              variant='ghost'
              size='sm'
              className='h-7 text-xs text-rose-500 hover:text-rose-600'
              onClick={handleRemove}
            >
              <X className='mr-1 h-3 w-3' />
              Remove
            </Button>
          </div>
        )}

        <Tabs defaultValue='browse' className='flex flex-col min-h-0'>
          <TabsList className='grid w-full grid-cols-2 h-9'>
            <TabsTrigger value='browse' className='text-xs gap-1.5'>
              <Ticket className='h-3.5 w-3.5' />
              Browse Promotions
            </TabsTrigger>
            <TabsTrigger value='enter' className='text-xs gap-1.5'>
              <Tag className='h-3.5 w-3.5' />
              Enter Code
            </TabsTrigger>
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value='browse' className='mt-3 flex flex-col min-h-0'>
            <div className='relative mb-3'>
              <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
              <Input
                placeholder='Search promotions...'
                value={promoSearch}
                onChange={(e) => setPromoSearch(e.target.value)}
                className='h-8 pl-8 text-xs'
              />
            </div>

            <ScrollArea className='h-[320px]'>
              {isLoadingPromos ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
                </div>
              ) : promotions.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center text-muted-foreground'>
                  <Ticket className='h-8 w-8 opacity-20 mb-2' />
                  <p className='text-xs font-semibold'>
                    No active promotions found
                  </p>
                  <p className='text-[10px] mt-1'>
                    Try a different search or enter a code manually.
                  </p>
                </div>
              ) : (
                <div className='space-y-2 pr-3'>
                  {promotions.map((promo: any) => {
                    const isApplied =
                      appliedPromotion?.promotion_id === promo.id
                    return (
                      <Card
                        key={promo.id}
                        className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm ${
                          isApplied
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : ''
                        }`}
                        onClick={() => !isApplied && handleSelectPromo(promo)}
                      >
                        <CardContent className='p-3 space-y-2'>
                          <div className='flex items-start justify-between'>
                            <div className='min-w-0 flex-1'>
                              <h4 className='text-xs font-bold truncate'>
                                {promo.name}
                              </h4>
                              {promo.code && (
                                <Badge
                                  variant='outline'
                                  className='mt-1 h-5 px-1.5 text-[10px] font-mono'
                                >
                                  {promo.code}
                                </Badge>
                              )}
                            </div>
                            <Badge
                              variant='secondary'
                              className='shrink-0 h-6 px-2 text-[11px] font-bold gap-1'
                            >
                              {(promo.promoType || promo.promo_type) ===
                                'fixed_amount' ||
                              (promo.promoType || promo.promo_type) ===
                                'fixed_discount' ? (
                                <DollarSign className='h-3 w-3' />
                              ) : (
                                <Percent className='h-3 w-3' />
                              )}
                              {formatPromoDiscount(promo)} OFF
                            </Badge>
                          </div>

                          <Separator className='my-1' />

                          <div className='flex items-center justify-between text-[10px] text-muted-foreground'>
                            <div className='flex items-center gap-1'>
                              <Calendar className='h-3 w-3' />
                              <span>
                                {formatDate(
                                  promo.startDate || promo.start_date
                                )}{' '}
                                -{' '}
                                {formatDate(promo.endDate || promo.end_date)}
                              </span>
                            </div>
                            {(promo.usageLimit || promo.usage_limit) && (
                              <span className='font-medium'>
                                {promo.currentUsageCount ??
                                  promo.current_usage_count ??
                                  0}
                                /{promo.usageLimit || promo.usage_limit} used
                              </span>
                            )}
                          </div>

                          {isApplied && (
                            <div className='flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400'>
                              <Check className='h-3 w-3' />
                              Currently Applied
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Enter Code Tab */}
          <TabsContent value='enter' className='mt-3 space-y-4'>
            <div className='space-y-2'>
              <Label className='text-xs font-semibold'>
                Promotion / Coupon Code
              </Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder='e.g. SUMMER2026'
                disabled={loading}
                className='h-10 text-sm font-medium font-mono uppercase tracking-wider'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleApplyCode()
                  }
                }}
                autoFocus
              />
              <p className='text-[10px] text-muted-foreground'>
                Enter the code from a coupon, promotion card, or marketing
                campaign.
              </p>
            </div>

            <div className='flex justify-end gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                size='sm'
                onClick={() => handleApplyCode()}
                disabled={loading || !code.trim()}
                className='gap-1.5'
              >
                {loading ? (
                  <>
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                    Validating...
                  </>
                ) : (
                  <>
                    <Tag className='h-3.5 w-3.5' />
                    Apply Code
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
