import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  Plus,
  Copy,
  Sparkles,
  Ticket,
  Search,
  Play,
  Pause,
  Trash2,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useInvCoupons,
  useCreateCoupon,
  useChangeCouponStatus,
  useDeleteCoupon,
  useGenerateBulkCoupons,
} from '../hooks/use-inv-coupons'
import { useInvPromotions } from '../hooks/use-inv-promotions'
import {
  couponFormSchema,
  bulkCouponGenerateSchema,
  type CouponFormValues,
  type BulkCouponGenerateValues,
} from '../schemas/coupon-form.schema'
import type { CouponStatus } from '../types'

interface CouponItem {
  id: string
  code: string
  description?: string | null
  promotion_id: string
  status: CouponStatus
  current_usages?: number
  max_usages?: number | null
  start_date?: string | Date | null
  end_date?: string | Date | null
  promotion?: {
    name: string
    promo_type: string
  } | null
}

interface PromoSelectItem {
  id: string
  name: string
  promo_type: string
}

export function CouponsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CouponStatus | 'all'>('all')
  const [selectedPromoId, setSelectedPromoId] = useState<string>('all')

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isBulkOpen, setIsBulkOpen] = useState(false)

  // Queries
  const { data: couponsData, isLoading } = useInvCoupons({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    promotionId: selectedPromoId !== 'all' ? selectedPromoId : undefined,
  })

  const { data: promosData } = useInvPromotions({ pageSize: 100 })

  // Mutations
  const createMutation = useCreateCoupon()
  const statusMutation = useChangeCouponStatus()
  const deleteMutation = useDeleteCoupon()
  const bulkMutation = useGenerateBulkCoupons()

  // Single Coupon Form
  const singleForm = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      promotionId: '',
      code: '',
      description: '',
      status: 'active',
      maxUsages: 100,
      maxUsagesPerCustomer: 1,
      minOrderAmount: undefined,
      startDate: '',
      endDate: '',
      isSingleUse: false,
    },
  })

  // Bulk Coupon Form
  const bulkForm = useForm<BulkCouponGenerateValues>({
    resolver: zodResolver(bulkCouponGenerateSchema),
    defaultValues: {
      promotionId: '',
      prefix: 'EID',
      count: 20,
      maxUsages: 1,
      maxUsagesPerCustomer: 1,
      isSingleUse: true,
    },
  })

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success(t('promotions.couponsPage.copied', { code, defaultValue: `Copied code "${code}" to clipboard!` }))
  }

  const handleCreateSingle = async (values: CouponFormValues) => {
    try {
      await createMutation.mutateAsync(values)
      toast.success(t('promotions.couponsPage.createdSuccess', 'Coupon created successfully'))
      setIsCreateOpen(false)
      singleForm.reset()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create coupon'
      toast.error(msg)
    }
  }

  const handleCreateBulk = async (values: BulkCouponGenerateValues) => {
    try {
      const result = await bulkMutation.mutateAsync(values)
      toast.success(t('promotions.couponsPage.bulkSuccess', { count: result.createdCount, defaultValue: `Successfully generated ${result.createdCount} coupons!` }))
      setIsBulkOpen(false)
      bulkForm.reset()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Bulk generation failed'
      toast.error(msg)
    }
  }

  const handleToggleStatus = async (id: string, current: CouponStatus) => {
    const next: CouponStatus = current === 'active' ? 'disabled' : 'active'
    try {
      await statusMutation.mutateAsync({ id, status: next })
      toast.success(t('promotions.couponsPage.statusUpdated', { status: next, defaultValue: `Coupon status updated to ${next}` }))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Status change failed'
      toast.error(msg)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm(t('promotions.couponsPage.deleteConfirm', 'Delete this coupon?'))) {
      try {
        await deleteMutation.mutateAsync(id)
        toast.success(t('promotions.couponsPage.deleted', 'Coupon deleted'))
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Delete failed'
        toast.error(msg)
      }
    }
  }

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let res = 'PROMO-'
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    singleForm.setValue('code', res)
  }

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
            {t('promotions.couponsPage.headerTitle', 'Coupon Management')}
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
                {t('promotions.couponsPage.title', 'Coupons & Voucher Codes')}
              </h1>
              <span className="text-xs bg-purple-500/10 text-purple-600 font-semibold px-2 py-0.5 rounded-full">
                {t('promotions.couponsPage.badge', 'POS & Online')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('promotions.couponsPage.description', 'Issue promotional coupons, track redemption counts, and batch-generate unique customer codes.')}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkOpen(true)}
              className="gap-1.5 h-9"
            >
              <Sparkles className="h-4 w-4 text-purple-500" />
              {t('promotions.couponsPage.bulkGenerate', 'Bulk Generate')}
            </Button>

            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="gap-1.5 h-9 bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
            >
              <Plus className="h-4 w-4" />
              {t('promotions.couponsPage.createCoupon', 'Create Coupon')}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-card shadow-2xs">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('promotions.couponsPage.searchPlaceholder', 'Search coupon code or description...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select
              value={selectedPromoId}
              onValueChange={setSelectedPromoId}
            >
              <SelectTrigger className="h-9 w-full sm:w-52">
                <SelectValue placeholder={t('promotions.couponsPage.allPromotions', 'All Promotions')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('promotions.couponsPage.allPromotions', 'All Promotions')}</SelectItem>
                {(promosData?.data as PromoSelectItem[])?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(val: string) => setStatusFilter(val as CouponStatus | 'all')}
            >
              <SelectTrigger className="h-9 w-32">
                <SelectValue placeholder={t('promotions.common.status', 'Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('promotions.couponsPage.allStatuses', 'All Statuses')}</SelectItem>
                <SelectItem value="active">{t('promotions.common.active', 'Active')}</SelectItem>
                <SelectItem value="disabled">{t('promotions.common.disabled', 'Disabled')}</SelectItem>
                <SelectItem value="expired">{t('promotions.common.expired', 'Expired')}</SelectItem>
                <SelectItem value="exhausted">{t('promotions.common.exhausted', 'Exhausted')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Coupons Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : couponsData?.data?.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-3">
                <Ticket className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="text-sm font-medium">{t('promotions.couponsPage.noCoupons', 'No coupons found matching your criteria.')}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  {t('promotions.couponsPage.createFirst', 'Create First Coupon')}
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground text-left bg-muted/20">
                      <th className="py-3 px-4">{t('promotions.couponsPage.code', 'Coupon Code')}</th>
                      <th className="py-3 px-4">{t('promotions.couponsPage.promotion', 'Promotion')}</th>
                      <th className="py-3 px-4">{t('promotions.couponsPage.usagesMax', 'Usages / Max')}</th>
                      <th className="py-3 px-4">{t('promotions.couponsPage.validPeriod', 'Valid Period')}</th>
                      <th className="py-3 px-4">{t('promotions.common.status', 'Status')}</th>
                      <th className="py-3 px-4 text-right">{t('promotions.common.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {(couponsData?.data as CouponItem[])?.map((cpn) => {
                      const usages = cpn.current_usages ?? 0
                      const max = cpn.max_usages
                      const pct = max ? Math.min(100, Math.round((usages / max) * 100)) : 0

                      return (
                        <tr key={cpn.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm tracking-wider text-purple-600 dark:text-purple-400">
                                {cpn.code}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCopyCode(cpn.code)}
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            {cpn.description && (
                              <span className="text-[11px] text-muted-foreground block line-clamp-1">
                                {cpn.description}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-medium text-foreground">
                              {cpn.promotion?.name || 'Linked Promotion'}
                            </span>
                            <span className="text-[11px] text-muted-foreground block capitalize">
                              {cpn.promotion?.promo_type?.replace(/_/g, ' ')}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span>{usages} {t('promotions.couponsPage.used', 'used')}</span>
                                <span className="text-muted-foreground">{max ? `${t('promotions.couponsPage.of', 'of')} ${max}` : '∞'}</span>
                              </div>
                              {max && (
                                <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-purple-500 rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-muted-foreground">
                            {cpn.start_date
                              ? new Date(cpn.start_date).toLocaleDateString()
                              : t('promotions.couponsPage.immediate', 'Immediate')}{' '}
                            -{' '}
                            {cpn.end_date
                              ? new Date(cpn.end_date).toLocaleDateString()
                              : t('promotions.couponsPage.noExpiry', 'No expiry')}
                          </td>

                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={
                                cpn.status === 'active'
                                  ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                                  : cpn.status === 'exhausted'
                                  ? 'border-amber-500/30 text-amber-600 bg-amber-500/10'
                                  : 'text-muted-foreground'
                              }
                            >
                              {cpn.status}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleStatus(cpn.id, cpn.status)}
                                className="h-7 text-xs gap-1"
                              >
                                {cpn.status === 'active' ? (
                                  <>
                                    <Pause className="h-3 w-3 text-amber-500" />
                                    {t('promotions.couponsPage.disable', 'Disable')}
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-3 w-3 text-emerald-500" />
                                    {t('promotions.couponsPage.enable', 'Enable')}
                                  </>
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(cpn.id)}
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* DIALOG: Create Single Coupon */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-purple-600" />
                {t('promotions.couponsPage.createCouponVoucher', 'Create Coupon Voucher')}
              </DialogTitle>
              <DialogDescription>
                {t('promotions.couponsPage.createCouponDesc', 'Assign a custom code to an existing promotional discount rule.')}
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={singleForm.handleSubmit(handleCreateSingle)}
              className="space-y-4 pt-2"
            >
              <div className="space-y-2">
                <Label>{t('promotions.couponsPage.linkedPromotion', 'Linked Promotion *')}</Label>
                <Select
                  value={singleForm.watch('promotionId')}
                  onValueChange={(val) => singleForm.setValue('promotionId', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('promotions.couponsPage.choosePromotion', 'Choose promotion')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(promosData?.data as PromoSelectItem[])?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.promo_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {singleForm.formState.errors.promotionId && (
                  <p className="text-xs text-destructive">
                    {singleForm.formState.errors.promotionId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('promotions.couponsPage.couponCode', 'Coupon Code *')}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generateRandomCode}
                    className="h-6 text-[11px] gap-1 text-purple-600"
                  >
                    <Sparkles className="h-3 w-3" />
                    {t('promotions.couponsPage.autoGenerate', 'Auto-Generate')}
                  </Button>
                </div>
                <Input
                  placeholder="e.g. VIP2026"
                  className="font-mono uppercase"
                  {...singleForm.register('code')}
                />
                {singleForm.formState.errors.code && (
                  <p className="text-xs text-destructive">
                    {singleForm.formState.errors.code.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('promotions.couponsPage.maxUsages', 'Max Usages')}</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 100"
                    {...singleForm.register('maxUsages')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('promotions.couponsPage.perCustomerLimit', 'Per Customer Limit')}</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 1"
                    {...singleForm.register('maxUsagesPerCustomer')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('promotions.couponsPage.startDate', 'Start Date')}</Label>
                  <Input type="date" {...singleForm.register('startDate')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('promotions.couponsPage.expiryDate', 'Expiry Date')}</Label>
                  <Input type="date" {...singleForm.register('endDate')} />
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  {t('promotions.common.cancel', 'Cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('promotions.couponsPage.createCoupon', 'Create Coupon')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DIALOG: Bulk Generate Coupons */}
        <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                {t('promotions.couponsPage.bulkTitle', 'Bulk Generate Unique Coupons')}
              </DialogTitle>
              <DialogDescription>
                {t('promotions.couponsPage.bulkDesc', 'Generate batches of unique randomized codes for SMS, marketing campaigns, or VIP lists.')}
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={bulkForm.handleSubmit(handleCreateBulk)}
              className="space-y-4 pt-2"
            >
              <div className="space-y-2">
                <Label>{t('promotions.couponsPage.linkedPromotion', 'Linked Promotion *')}</Label>
                <Select
                  value={bulkForm.watch('promotionId')}
                  onValueChange={(val) => bulkForm.setValue('promotionId', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('promotions.couponsPage.choosePromotion', 'Choose promotion')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(promosData?.data as PromoSelectItem[])?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.promo_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('promotions.couponsPage.codePrefix', 'Code Prefix')}</Label>
                  <Input
                    placeholder="e.g. VIP"
                    className="uppercase"
                    {...bulkForm.register('prefix')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('promotions.couponsPage.quantity', 'Quantity (Max 500)')}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="500"
                    {...bulkForm.register('count')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('promotions.couponsPage.usesPerCoupon', 'Uses Per Coupon')}</Label>
                  <Input
                    type="number"
                    min="1"
                    {...bulkForm.register('maxUsages')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('promotions.couponsPage.expiryDate', 'Expiry Date')}</Label>
                  <Input type="date" {...bulkForm.register('endDate')} />
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBulkOpen(false)}
                >
                  {t('promotions.common.cancel', 'Cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={bulkMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                >
                  {bulkMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('promotions.couponsPage.generateCoupons', 'Generate Coupons')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Main>
    </div>
  )
}
