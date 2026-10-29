import { useState } from 'react'
import { format } from 'date-fns'
import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Eye,
  Loader2,
  Package,
  Search,
  ShieldAlert,
  Sparkles,
  Store,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { calculateEndDate } from '@/lib/subscription_utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useSubscribeToPlan } from '../queries'
import type {
  PlatformSubscriptionPlan,
  TenantSubscriptionRecord,
} from '../types'
import {
  formatCurrencyAmount,
  formatQuotaValue,
} from './subscription-preview-dialog'

interface AvailablePlansTabProps {
  availablePlans: PlatformSubscriptionPlan[]
  currentSubscription: TenantSubscriptionRecord | null
  onPreviewPlan: (plan: PlatformSubscriptionPlan) => void
  onSubscribedSuccess?: () => void
}

export function AvailablePlansTab({
  availablePlans,
  currentSubscription,
  onPreviewPlan,
  onSubscribedSuccess,
}: AvailablePlansTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [intervalFilter, setIntervalFilter] = useState<string>('all')
  const [confirmPlan, setConfirmPlan] =
    useState<PlatformSubscriptionPlan | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>('card')
  const [transferRef, setTransferRef] = useState<string>('')
  const [autoRenew, setAutoRenew] = useState<boolean>(true)

  const subscribeMutation = useSubscribeToPlan()

  const filteredPlans = availablePlans.filter((plan) => {
    const matchesSearch =
      !searchQuery.trim() ||
      plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plan.code ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plan.description ?? '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      plan.tier.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesInterval =
      intervalFilter === 'all' || plan.billing_interval === intervalFilter

    return matchesSearch && matchesInterval
  })

  const handleConfirmSubscribe = async () => {
    if (!confirmPlan) return
    try {
      const res = await subscribeMutation.mutateAsync({
        subscription_id: confirmPlan.id,
        payment_method: paymentMethod,
        transfer_ref: transferRef.trim() || null,
        auto_renew: autoRenew,
      })

      if (res.supersededCount > 0) {
        toast.success(
          `Switched to ${confirmPlan.name}! Previous active subscription was superseded.`
        )
      } else {
        toast.success(`Subscribed to ${confirmPlan.name} successfully!`)
      }

      setConfirmPlan(null)
      setTransferRef('')
      onSubscribedSuccess?.()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to activate subscription plan.'
      )
    }
  }

  const now = new Date()

  return (
    <div className='space-y-6'>
      {/* Search & Filter Toolbar */}
      <div className='flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='relative flex-1 sm:max-w-sm'>
          <Search className='absolute top-2.5 left-3 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search platform plans by name, tier, or code...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-9'
          />
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <Select value={intervalFilter} onValueChange={setIntervalFilter}>
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='Billing Interval' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Billing Intervals</SelectItem>
              <SelectItem value='month'>Monthly</SelectItem>
              <SelectItem value='quarter'>Quarterly</SelectItem>
              <SelectItem value='half_year'>Half-Yearly</SelectItem>
              <SelectItem value='year'>Yearly</SelectItem>
              <SelectItem value='lifetime'>Lifetime</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant='secondary' className='h-9 px-3'>
            {filteredPlans.length}{' '}
            {filteredPlans.length === 1 ? 'Plan' : 'Plans'} Available
          </Badge>
        </div>
      </div>

      {/* Platform Subscriptions Grid */}
      {filteredPlans.length === 0 ? (
        <Card className='border-dashed'>
          <CardContent className='flex flex-col items-center justify-center py-12 text-center'>
            <p className='text-base font-medium'>
              No platform subscription plans match your filter.
            </p>
            <p className='mt-1 text-xs text-muted-foreground'>
              Try clearing the search query or selecting a different billing
              interval.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
          {filteredPlans.map((plan) => {
            const isCurrentActive =
              currentSubscription?.subscription_id === plan.id &&
              currentSubscription?.status !== 'canceled' &&
              currentSubscription?.status !== 'expired'

            const projectedEndDate =
              isCurrentActive && currentSubscription?.end_date
                ? new Date(currentSubscription.end_date)
                : calculateEndDate(now, plan.duration_months)

            const activeCapabilities = [
              plan.has_inventory_tracking && 'Inventory Tracking',
              plan.has_restaurant_pos && 'Restaurant POS',
              plan.has_kitchen_display && 'Kitchen Display (KDS)',
              plan.has_delivery_management && 'Delivery Management',
              plan.has_advanced_reports && 'Advanced Reports',
              plan.has_audit_logs && 'Audit Logs',
              plan.has_api_access && 'API Access',
              plan.has_priority_support && '24/7 Priority Support',
            ].filter(Boolean) as string[]

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col justify-between transition-all ${
                  isCurrentActive
                    ? 'border-emerald-600 shadow-md ring-1 ring-emerald-600/40'
                    : plan.is_popular
                      ? 'border-amber-500/60 shadow-sm'
                      : 'hover:border-foreground/30'
                }`}
              >
                <div>
                  <CardHeader className='pb-3'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <Badge variant='outline' className='uppercase'>
                        {plan.tier.replace('_', ' ')}
                      </Badge>
                      <div className='flex items-center gap-1.5'>
                        {plan.is_popular && (
                          <Badge className='bg-amber-600 text-white hover:bg-amber-700'>
                            <Sparkles className='mr-1 h-3 w-3' />
                            Popular
                          </Badge>
                        )}
                        {isCurrentActive && (
                          <Badge className='bg-emerald-600 text-white hover:bg-emerald-700'>
                            <CheckCircle2 className='mr-1 h-3 w-3' />
                            Current Active
                          </Badge>
                        )}
                      </div>
                    </div>

                    <CardTitle className='mt-2 flex items-center gap-2 text-xl'>
                      <span>{plan.name}</span>
                      {plan.code && (
                        <span className='font-mono text-xs font-normal text-muted-foreground'>
                          ({plan.code})
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className='line-clamp-2 min-h-[36px]'>
                      {plan.description ||
                        `Full-featured ${plan.tier} subscription for ${plan.duration_months} month(s).`}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className='space-y-4'>
                    {/* Price & Projected Expiration */}
                    <div className='rounded-lg border bg-muted/30 p-3.5'>
                      <div className='flex items-baseline gap-1.5'>
                        <span className='text-3xl font-extrabold'>
                          {formatCurrencyAmount(plan.price, plan.currency)}
                        </span>
                        <span className='text-xs text-muted-foreground'>
                          / {plan.duration_months}{' '}
                          {plan.duration_months === 1 ? 'month' : 'months'}
                        </span>
                      </div>

                      <div className='mt-2 flex items-center gap-1.5 text-xs text-muted-foreground'>
                        <Calendar className='h-3.5 w-3.5 shrink-0 text-emerald-600' />
                        <span>
                          {isCurrentActive
                            ? 'Expires on: '
                            : 'Projected expiry: '}
                          <strong className='text-foreground'>
                            {format(projectedEndDate, 'PPP')}
                          </strong>
                        </span>
                      </div>

                      {(plan.discount_percentage > 0 ||
                        plan.trial_period_days > 0) && (
                        <div className='mt-2 flex flex-wrap gap-1.5'>
                          {plan.discount_percentage > 0 && (
                            <Badge
                              variant='secondary'
                              className='text-[10px] text-emerald-600'
                            >
                              Save {plan.discount_percentage}%
                            </Badge>
                          )}
                          {plan.trial_period_days > 0 && (
                            <Badge variant='outline' className='text-[10px]'>
                              {plan.trial_period_days}-day trial
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Key Quotas Mini-Grid */}
                    <div className='grid grid-cols-2 gap-2 text-xs'>
                      <div className='flex items-center gap-2 rounded border px-2.5 py-1.5'>
                        <Building2 className='h-3.5 w-3.5 text-primary' />
                        <span>
                          <strong>{formatQuotaValue(plan.max_branches)}</strong>{' '}
                          Branches
                        </span>
                      </div>
                      <div className='flex items-center gap-2 rounded border px-2.5 py-1.5'>
                        <Users className='h-3.5 w-3.5 text-primary' />
                        <span>
                          <strong>{formatQuotaValue(plan.max_users)}</strong>{' '}
                          Users
                        </span>
                      </div>
                      <div className='flex items-center gap-2 rounded border px-2.5 py-1.5'>
                        <Store className='h-3.5 w-3.5 text-primary' />
                        <span>
                          <strong>{formatQuotaValue(plan.max_stores)}</strong>{' '}
                          Stores
                        </span>
                      </div>
                      <div className='flex items-center gap-2 rounded border px-2.5 py-1.5'>
                        <Package className='h-3.5 w-3.5 text-primary' />
                        <span>
                          <strong>{formatQuotaValue(plan.max_products)}</strong>{' '}
                          Products
                        </span>
                      </div>
                    </div>

                    {/* Allowed Modules */}
                    <div className='flex flex-wrap items-center gap-1.5'>
                      <span className='text-xs text-muted-foreground'>
                        Modules:
                      </span>
                      {plan.allowed_modules.map((mod) => (
                        <Badge
                          key={mod}
                          variant='secondary'
                          className='text-[11px] capitalize'
                        >
                          {mod}
                        </Badge>
                      ))}
                    </div>

                    {/* Feature Checklist */}
                    <ul className='space-y-1.5 text-xs'>
                      {activeCapabilities.slice(0, 5).map((cap) => (
                        <li key={cap} className='flex items-center gap-2'>
                          <Check className='h-3.5 w-3.5 shrink-0 text-emerald-600' />
                          <span>{cap}</span>
                        </li>
                      ))}
                      {activeCapabilities.length > 5 && (
                        <li className='pl-5 text-muted-foreground'>
                          +{activeCapabilities.length - 5} more capabilities
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </div>

                <CardFooter className='flex flex-col gap-2 border-t pt-4 sm:flex-row'>
                  <Button
                    variant='outline'
                    className='w-full sm:flex-1'
                    onClick={() => onPreviewPlan(plan)}
                  >
                    <Eye className='mr-1.5 h-4 w-4' />
                    Preview Details
                  </Button>

                  <Button
                    className='w-full sm:flex-1'
                    variant={isCurrentActive ? 'secondary' : 'default'}
                    disabled={isCurrentActive}
                    onClick={() => setConfirmPlan(plan)}
                  >
                    {isCurrentActive
                      ? 'Current Active Plan'
                      : currentSubscription
                        ? 'Switch to Plan'
                        : 'Subscribe Now'}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Plan Switch / Activation Confirmation Dialog */}
      <Dialog
        open={!!confirmPlan}
        onOpenChange={(open) => !open && setConfirmPlan(null)}
      >
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>
              {currentSubscription
                ? `Switch Subscription to ${confirmPlan?.name}`
                : `Activate ${confirmPlan?.name}`}
            </DialogTitle>
            <DialogDescription>
              Review your new subscription schedule and confirm activation.
            </DialogDescription>
          </DialogHeader>

          {confirmPlan && (
            <div className='space-y-4 py-2'>
              {currentSubscription &&
                currentSubscription.status !== 'canceled' && (
                  <div className='flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300'>
                    <ShieldAlert className='mt-0.5 h-4 w-4 shrink-0 text-amber-600' />
                    <div>
                      <p className='font-semibold'>
                        Single Active Subscription Policy
                      </p>
                      <p className='mt-0.5'>
                        Your current active plan (
                        <strong>
                          {currentSubscription.subscriptions?.name ||
                            'Active Plan'}
                        </strong>
                        ) will be automatically marked as{' '}
                        <strong>canceled</strong> and superseded by{' '}
                        <strong>{confirmPlan.name}</strong>.
                      </p>
                    </div>
                  </div>
                )}

              <div className='rounded-lg border bg-muted/30 p-4 text-sm'>
                <div className='flex items-center justify-between pb-2'>
                  <span className='font-semibold'>{confirmPlan.name}</span>
                  <span className='text-lg font-bold'>
                    {formatCurrencyAmount(
                      confirmPlan.price,
                      confirmPlan.currency
                    )}
                  </span>
                </div>
                <div className='grid grid-cols-2 gap-2 border-t pt-2 text-xs'>
                  <div>
                    <span className='text-muted-foreground'>Start Date:</span>
                    <p className='font-medium'>{format(now, 'PPP')}</p>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>
                      New Expiration Date:
                    </span>
                    <p className='font-semibold text-emerald-600'>
                      {format(
                        calculateEndDate(now, confirmPlan.duration_months),
                        'PPP'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className='grid gap-3 sm:grid-cols-2'>
                <div className='space-y-1.5'>
                  <Label htmlFor='sub-payment-method'>Payment Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                  >
                    <SelectTrigger id='sub-payment-method'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='card'>Credit / Debit Card</SelectItem>
                      <SelectItem value='bank_transfer'>
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value='wallet'>Digital Wallet</SelectItem>
                      <SelectItem value='cash'>Cash / Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='sub-transfer-ref'>
                    Reference / Receipt # (Optional)
                  </Label>
                  <Input
                    id='sub-transfer-ref'
                    placeholder='e.g. TRX-90412'
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                  />
                </div>
              </div>

              <div className='flex items-center justify-between rounded-lg border p-3'>
                <div className='space-y-0.5'>
                  <Label htmlFor='sub-auto-renew' className='text-sm'>
                    Auto-Renew Subscription
                  </Label>
                  <p className='text-xs text-muted-foreground'>
                    Automatically renew at the end of the{' '}
                    {confirmPlan.duration_months}-month cycle.
                  </p>
                </div>
                <Switch
                  id='sub-auto-renew'
                  checked={autoRenew}
                  onCheckedChange={setAutoRenew}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setConfirmPlan(null)}
              disabled={subscribeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSubscribe}
              disabled={subscribeMutation.isPending}
            >
              {subscribeMutation.isPending && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              {currentSubscription
                ? 'Confirm & Switch Plan'
                : 'Confirm & Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

