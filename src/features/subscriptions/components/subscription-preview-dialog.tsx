import { format } from 'date-fns'
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Database,
  Layers,
  Package,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Users,
  Utensils,
  Warehouse,
  XCircle,
} from 'lucide-react'
import {
  calculateEndDate,
  getSubscriptionExpirationInfo,
} from '@/lib/subscription_utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type {
  PlatformSubscriptionPlan,
  SubscriptionTenantUser,
  TenantResourceUsageSummary,
  TenantSubscriptionRecord,
} from '../types'

interface SubscriptionPreviewDialogProps {
  plan: PlatformSubscriptionPlan | null
  currentSubscription?: TenantSubscriptionRecord | null
  tenantUsers?: SubscriptionTenantUser[]
  usage?: TenantResourceUsageSummary
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectPlan?: (plan: PlatformSubscriptionPlan) => void
  isSubmitting?: boolean
}

export function formatQuotaValue(value: number | null | undefined, unit = '') {
  if (value === null || value === undefined) return '—'
  if (value === -1) return 'Unlimited'
  return unit ? `${value.toLocaleString()} ${unit}` : value.toLocaleString()
}

export function formatCurrencyAmount(amount: number, currency = 'LE') {
  const cleanCurrency = (currency || 'LE').trim().toUpperCase()
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${cleanCurrency}`
}

export function SubscriptionPreviewDialog({
  plan,
  currentSubscription,
  tenantUsers = [],
  usage,
  open,
  onOpenChange,
  onSelectPlan,
  isSubmitting = false,
}: SubscriptionPreviewDialogProps) {
  if (!plan) return null

  const isCurrentActivePlan =
    currentSubscription?.subscription_id === plan.id &&
    currentSubscription?.status !== 'canceled' &&
    currentSubscription?.status !== 'expired'

  const now = new Date()
  const projectedStartDate =
    isCurrentActivePlan && currentSubscription?.start_date
      ? new Date(currentSubscription.start_date)
      : now
  const projectedEndDate =
    isCurrentActivePlan && currentSubscription?.end_date
      ? new Date(currentSubscription.end_date)
      : calculateEndDate(now, plan.duration_months)

  const expirationInfo = getSubscriptionExpirationInfo(
    projectedStartDate,
    projectedEndDate,
    isCurrentActivePlan ? currentSubscription?.status : 'paid'
  )

  const activeUsersCount =
    usage?.users ??
    tenantUsers.filter((u) => u.is_active && !u.is_blocked).length
  const seatsFit =
    plan.max_users === -1 || activeUsersCount <= plan.max_users

  const quotas = [
    {
      label: 'Max Branches',
      value: formatQuotaValue(plan.max_branches),
      current: usage?.branches,
      override: isCurrentActivePlan
        ? currentSubscription?.custom_max_branches
        : null,
      icon: Building2,
    },
    {
      label: 'Max Tenant Users',
      value: formatQuotaValue(plan.max_users),
      current: activeUsersCount,
      override: isCurrentActivePlan
        ? currentSubscription?.custom_max_users
        : null,
      icon: Users,
    },
    {
      label: 'Max Stores',
      value: formatQuotaValue(plan.max_stores),
      current: usage?.stores,
      override: isCurrentActivePlan
        ? currentSubscription?.custom_max_stores
        : null,
      icon: Store,
    },
    {
      label: 'Max Warehouses',
      value: formatQuotaValue(plan.max_warehouses),
      current: usage?.warehouses,
      override: isCurrentActivePlan
        ? currentSubscription?.custom_max_warehouses
        : null,
      icon: Warehouse,
    },
    {
      label: 'Max Products',
      value: formatQuotaValue(plan.max_products),
      current: usage?.products,
      override: isCurrentActivePlan
        ? currentSubscription?.custom_max_products
        : null,
      icon: Package,
    },
    {
      label: 'Max Restaurant Tables',
      value: formatQuotaValue(plan.max_tables),
      current: usage?.tables,
      override: null,
      icon: Utensils,
    },
    {
      label: 'Max POS Registers',
      value: formatQuotaValue(plan.max_pos_registers),
      current: usage?.posRegisters,
      override: null,
      icon: CreditCard,
    },
    {
      label: 'Max Monthly Orders',
      value: formatQuotaValue(plan.max_monthly_orders),
      current: usage?.monthlyOrders,
      override: null,
      icon: ShoppingCart,
    },
    {
      label: 'Max Storage',
      value: formatQuotaValue(plan.max_storage_mb, 'MB'),
      current: usage?.storageMbUsed,
      override: isCurrentActivePlan
        ? currentSubscription?.custom_max_storage_mb
        : null,
      icon: Database,
    },
  ]

  const featureFlags = [
    {
      key: 'has_inventory_tracking',
      label: 'Inventory Tracking & Stock Control',
      enabled: plan.has_inventory_tracking,
    },
    {
      key: 'has_restaurant_pos',
      label: 'Restaurant POS Terminal',
      enabled: plan.has_restaurant_pos,
    },
    {
      key: 'has_kitchen_display',
      label: 'Kitchen Display System (KDS)',
      enabled: plan.has_kitchen_display,
    },
    {
      key: 'has_delivery_management',
      label: 'Delivery & Dispatch Management',
      enabled: plan.has_delivery_management,
    },
    {
      key: 'has_advanced_reports',
      label: 'Advanced Analytics & Reports',
      enabled: plan.has_advanced_reports,
    },
    {
      key: 'has_audit_logs',
      label: 'Security & Activity Audit Logs',
      enabled: plan.has_audit_logs,
    },
    {
      key: 'has_api_access',
      label: 'External REST API & Webhook Access',
      enabled: plan.has_api_access,
    },
    {
      key: 'has_priority_support',
      label: '24/7 Priority SLA Support',
      enabled: plan.has_priority_support,
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] p-0 sm:max-w-3xl'>
        <DialogHeader className='border-b bg-muted/30 px-6 py-4'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div className='flex items-center gap-2'>
              <DialogTitle className='text-xl font-bold'>
                {plan.name}
              </DialogTitle>
              <Badge variant='outline' className='uppercase'>
                {plan.tier.replace('_', ' ')}
              </Badge>
              {plan.code && (
                <Badge variant='secondary' className='font-mono text-xs'>
                  {plan.code}
                </Badge>
              )}
              {plan.is_popular && (
                <Badge className='bg-amber-600 text-white hover:bg-amber-700'>
                  <Sparkles className='mr-1 h-3 w-3' />
                  Popular
                </Badge>
              )}
              {isCurrentActivePlan && (
                <Badge className='bg-emerald-600 text-white hover:bg-emerald-700'>
                  Current Active Plan
                </Badge>
              )}
            </div>
          </div>
          <DialogDescription className='pt-1'>
            {plan.description ||
              `Comprehensive ${plan.tier} plan billed every ${plan.duration_months} month(s).`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className='max-h-[65vh] px-6 py-4'>
          <div className='space-y-6'>
            {/* Pricing & Expiration Preview Banner */}
            <div className='grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2'>
              <div className='space-y-1'>
                <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                  Plan Pricing & Billing Terms
                </p>
                <div className='flex items-baseline gap-2'>
                  <span className='text-3xl font-extrabold'>
                    {formatCurrencyAmount(plan.price, plan.currency)}
                  </span>
                  <span className='text-sm text-muted-foreground'>
                    / {plan.duration_months}{' '}
                    {plan.duration_months === 1 ? 'month' : 'months'} (
                    {plan.billing_interval})
                  </span>
                </div>
                <div className='flex flex-wrap gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground'>
                  <span>
                    Setup Fee:{' '}
                    <strong className='text-foreground'>
                      {formatCurrencyAmount(plan.setup_fee, plan.currency)}
                    </strong>
                  </span>
                  <span>
                    Discount:{' '}
                    <strong className='text-foreground'>
                      {plan.discount_percentage}%
                    </strong>
                  </span>
                  <span>
                    Trial Period:{' '}
                    <strong className='text-foreground'>
                      {plan.trial_period_days} days
                    </strong>
                  </span>
                  <span>
                    Grace Period:{' '}
                    <strong className='text-foreground'>
                      {plan.grace_period_days} days
                    </strong>
                  </span>
                </div>
              </div>

              <div className='space-y-2 rounded-md border bg-muted/40 p-3'>
                <div className='flex items-center justify-between'>
                  <span className='flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                    <Calendar className='h-3.5 w-3.5' />
                    {isCurrentActivePlan
                      ? 'Current Expiration Schedule'
                      : 'Projected Validity If Activated Today'}
                  </span>
                  <Badge
                    variant={
                      expirationInfo.isExpired ? 'destructive' : 'secondary'
                    }
                  >
                    <Clock className='mr-1 h-3 w-3' />
                    {expirationInfo.daysRemaining} days
                  </Badge>
                </div>
                <div className='grid grid-cols-2 gap-2 text-xs'>
                  <div>
                    <span className='text-muted-foreground'>Start Date:</span>
                    <p className='font-medium'>
                      {format(projectedStartDate, 'PPP')}
                    </p>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>Expires On:</span>
                    <p className='font-semibold text-emerald-600 dark:text-emerald-400'>
                      {format(projectedEndDate, 'PPP')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Allowed Modules */}
            <div className='space-y-2'>
              <h4 className='flex items-center gap-2 text-sm font-semibold'>
                <Layers className='h-4 w-4 text-primary' />
                Allowed Platform Modules
              </h4>
              <div className='flex flex-wrap gap-2'>
                {plan.allowed_modules.map((mod) => (
                  <Badge
                    key={mod}
                    variant='secondary'
                    className='px-3 py-1 text-xs capitalize'
                  >
                    <ShieldCheck className='mr-1.5 h-3.5 w-3.5 text-emerald-600' />
                    {mod} Module
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Resource Quotas & Limits */}
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <h4 className='text-sm font-semibold'>
                  Resource Quotas & Limits (`subscriptions` &amp; overrides)
                </h4>
                <span className='text-xs text-muted-foreground'>
                  -1 = Unlimited quota
                </span>
              </div>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
                {quotas.map((q) => {
                  const Icon = q.icon
                  const hasOverride =
                    q.override !== null && q.override !== undefined
                  return (
                    <div
                      key={q.label}
                      className='flex items-start gap-3 rounded-lg border p-3'
                    >
                      <div className='rounded-md bg-primary/10 p-2 text-primary'>
                        <Icon className='h-4 w-4' />
                      </div>
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-xs text-muted-foreground'>
                          {q.label}
                        </p>
                        <p className='text-sm font-bold'>
                          {hasOverride
                            ? formatQuotaValue(q.override)
                            : q.value}
                        </p>
                        {hasOverride && (
                          <p className='text-[11px] text-amber-600'>
                            Custom override (Base: {q.value})
                          </p>
                        )}
                        {q.current !== undefined && (
                          <p className='text-[11px] text-muted-foreground'>
                            Current usage: {q.current}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Capabilities & Feature Flags */}
            <div className='space-y-3'>
              <h4 className='text-sm font-semibold'>
                Included Feature Flags &amp; Capabilities
              </h4>
              <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-2'>
                {featureFlags.map((flag) => (
                  <div
                    key={flag.key}
                    className='flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm'
                  >
                    {flag.enabled ? (
                      <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-600' />
                    ) : (
                      <XCircle className='h-4 w-4 shrink-0 text-muted-foreground/50' />
                    )}
                    <span
                      className={
                        flag.enabled
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground line-through'
                      }
                    >
                      {flag.label}
                    </span>
                  </div>
                ))}
              </div>

              {plan.features.length > 0 && (
                <div className='pt-2'>
                  <p className='mb-2 text-xs font-medium text-muted-foreground'>
                    Additional Plan Highlights:
                  </p>
                  <div className='flex flex-wrap gap-2'>
                    {plan.features.map((feat, idx) => (
                      <Badge key={idx} variant='outline'>
                        {feat}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Related Tenant Users Compatibility */}
            <div className='space-y-2 rounded-lg border bg-muted/20 p-4'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='flex items-center gap-2'>
                  <Users className='h-4 w-4 text-primary' />
                  <h4 className='text-sm font-semibold'>
                    Related Tenant Users ({tenantUsers.length})
                  </h4>
                </div>
                <Badge variant={seatsFit ? 'secondary' : 'destructive'}>
                  {activeUsersCount} Active / {formatQuotaValue(plan.max_users)}{' '}
                  Allowed Seats
                </Badge>
              </div>
              <p className='text-xs text-muted-foreground'>
                {seatsFit
                  ? 'All active users in your tenant organization fit within this subscription plan.'
                  : `Warning: Your tenant currently has ${activeUsersCount} active users, which exceeds this plan's limit of ${plan.max_users}.`}
              </p>
              {tenantUsers.length > 0 && (
                <div className='flex flex-wrap gap-1.5 pt-2'>
                  {tenantUsers.slice(0, 8).map((u) => (
                    <Badge
                      key={u.id}
                      variant='outline'
                      className='font-normal text-xs'
                    >
                      {[u.first_name, u.last_name].filter(Boolean).join(' ') ||
                        u.email ||
                        'User'}{' '}
                      ({u.default_role || 'staff'})
                    </Badge>
                  ))}
                  {tenantUsers.length > 8 && (
                    <Badge variant='secondary' className='text-xs'>
                      +{tenantUsers.length - 8} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className='border-t bg-muted/30 px-6 py-4'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Close Preview
          </Button>
          {onSelectPlan && !isCurrentActivePlan && (
            <Button
              onClick={() => onSelectPlan(plan)}
              disabled={isSubmitting}
            >
              {currentSubscription
                ? `Switch to ${plan.name}`
                : `Subscribe to ${plan.name}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

