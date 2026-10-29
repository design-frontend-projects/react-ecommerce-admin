import { format } from 'date-fns'
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Database,
  Eye,
  History,
  Layers,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
  Utensils,
  Warehouse,
  XCircle,
} from 'lucide-react'
import { getSubscriptionExpirationInfo } from '@/lib/subscription_utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  PlatformSubscriptionPlan,
  TenantResourceUsageSummary,
  TenantSubscriptionRecord,
} from '../types'
import {
  formatCurrencyAmount,
  formatQuotaValue,
} from './subscription-preview-dialog'

interface CurrentSubscriptionTabProps {
  currentSubscription: TenantSubscriptionRecord | null
  subscriptionHistory: TenantSubscriptionRecord[]
  usage: TenantResourceUsageSummary
  onSwitchToPlansTab: () => void
  onSwitchToUsersTab: () => void
  onPreviewPlan: (plan: PlatformSubscriptionPlan) => void
}

export function CurrentSubscriptionTab({
  currentSubscription,
  subscriptionHistory,
  usage,
  onSwitchToPlansTab,
  onSwitchToUsersTab,
  onPreviewPlan,
}: CurrentSubscriptionTabProps) {
  const plan = currentSubscription?.subscriptions ?? null

  if (!currentSubscription || !plan) {
    return (
      <Card className='border-dashed'>
        <CardContent className='flex flex-col items-center justify-center py-14 text-center'>
          <div className='mb-4 rounded-full bg-amber-500/10 p-4 text-amber-600'>
            <AlertTriangle className='h-8 w-8' />
          </div>
          <h3 className='text-xl font-bold'>No Active Subscription Found</h3>
          <p className='mt-1 max-w-md text-sm text-muted-foreground'>
            Your tenant account does not currently have an active subscription
            plan. Browse the platform plans to activate your subscription.
          </p>
          <Button className='mt-6' onClick={onSwitchToPlansTab}>
            Browse Available Plans
            <ArrowUpRight className='ml-2 h-4 w-4' />
          </Button>
        </CardContent>
      </Card>
    )
  }

  const expirationInfo = getSubscriptionExpirationInfo(
    currentSubscription.start_date,
    currentSubscription.end_date,
    currentSubscription.status
  )

  const quotaItems = [
    {
      key: 'branches',
      label: 'Branches',
      current: usage.branches,
      effectiveMax:
        currentSubscription.custom_max_branches ?? plan.max_branches,
      baseMax: plan.max_branches,
      hasCustomOverride: currentSubscription.custom_max_branches !== null,
      icon: Building2,
    },
    {
      key: 'users',
      label: 'Tenant Users (Seats)',
      current: usage.users,
      effectiveMax: currentSubscription.custom_max_users ?? plan.max_users,
      baseMax: plan.max_users,
      hasCustomOverride: currentSubscription.custom_max_users !== null,
      icon: Users,
      onAction: onSwitchToUsersTab,
    },
    {
      key: 'stores',
      label: 'Stores / Outlets',
      current: usage.stores,
      effectiveMax: currentSubscription.custom_max_stores ?? plan.max_stores,
      baseMax: plan.max_stores,
      hasCustomOverride: currentSubscription.custom_max_stores !== null,
      icon: Store,
    },
    {
      key: 'warehouses',
      label: 'Warehouses',
      current: usage.warehouses,
      effectiveMax:
        currentSubscription.custom_max_warehouses ?? plan.max_warehouses,
      baseMax: plan.max_warehouses,
      hasCustomOverride: currentSubscription.custom_max_warehouses !== null,
      icon: Warehouse,
    },
    {
      key: 'products',
      label: 'Products Catalog',
      current: usage.products,
      effectiveMax:
        currentSubscription.custom_max_products ?? plan.max_products,
      baseMax: plan.max_products,
      hasCustomOverride: currentSubscription.custom_max_products !== null,
      icon: Package,
    },
    {
      key: 'tables',
      label: 'Restaurant Tables',
      current: usage.tables,
      effectiveMax: plan.max_tables,
      baseMax: plan.max_tables,
      hasCustomOverride: false,
      icon: Utensils,
    },
    {
      key: 'pos_registers',
      label: 'POS Registers',
      current: usage.posRegisters,
      effectiveMax: plan.max_pos_registers,
      baseMax: plan.max_pos_registers,
      hasCustomOverride: false,
      icon: CreditCard,
    },
    {
      key: 'monthly_orders',
      label: 'Monthly Orders',
      current: usage.monthlyOrders,
      effectiveMax: plan.max_monthly_orders,
      baseMax: plan.max_monthly_orders,
      hasCustomOverride: false,
      icon: ShoppingCart,
    },
    {
      key: 'storage',
      label: 'Storage Capacity (MB)',
      current: usage.storageMbUsed,
      effectiveMax:
        currentSubscription.custom_max_storage_mb ?? plan.max_storage_mb,
      baseMax: plan.max_storage_mb,
      hasCustomOverride: currentSubscription.custom_max_storage_mb !== null,
      icon: Database,
    },
  ]

  const featureFlags = [
    {
      label: 'Inventory Tracking',
      enabled: plan.has_inventory_tracking,
      description: 'Multi-warehouse stock ledger, batches & serials',
    },
    {
      label: 'Restaurant POS',
      enabled: plan.has_restaurant_pos,
      description: 'Dine-in tables, floor management & split billing',
    },
    {
      label: 'Kitchen Display (KDS)',
      enabled: plan.has_kitchen_display,
      description: 'Real-time order routing to kitchen stations',
    },
    {
      label: 'Delivery Management',
      enabled: plan.has_delivery_management,
      description: 'Driver assignment & order delivery tracking',
    },
    {
      label: 'Advanced Reports',
      enabled: plan.has_advanced_reports,
      description: 'Financial analytics, margins & forecasting',
    },
    {
      label: 'Audit Logs',
      enabled: plan.has_audit_logs,
      description: 'Complete security trail of user & system actions',
    },
    {
      label: 'API Access',
      enabled: plan.has_api_access,
      description: 'REST API keys & webhook integrations',
    },
    {
      label: 'Priority Support',
      enabled: plan.has_priority_support,
      description: 'Dedicated account & SLA technical assistance',
    },
  ]

  return (
    <div className='space-y-6'>
      {/* Top Active Plan Overview & Expiration Card */}
      <div className='grid gap-6 lg:grid-cols-3'>
        <Card className='lg:col-span-2'>
          <CardHeader className='pb-3'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
              <div className='space-y-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <CardTitle className='text-2xl font-bold'>
                    {plan.name}
                  </CardTitle>
                  <Badge variant='outline' className='uppercase'>
                    {plan.tier.replace('_', ' ')}
                  </Badge>
                  {plan.code && (
                    <Badge variant='secondary' className='font-mono text-xs'>
                      {plan.code}
                    </Badge>
                  )}
                  <Badge
                    className={
                      expirationInfo.isActive
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-destructive text-destructive-foreground'
                    }
                  >
                    {currentSubscription.status.toUpperCase()}
                  </Badge>
                </div>
                <CardDescription>
                  {plan.description ||
                    'Your current active tenant subscription plan and billing configuration.'}
                </CardDescription>
              </div>

              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => onPreviewPlan(plan)}
                >
                  <Eye className='mr-1.5 h-4 w-4' />
                  Full Plan Specs
                </Button>
                <Button size='sm' onClick={onSwitchToPlansTab}>
                  Change / Switch Plan
                  <ArrowUpRight className='ml-1.5 h-4 w-4' />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className='space-y-4'>
            <div className='grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-4'>
              <div>
                <p className='text-xs text-muted-foreground'>
                  Price at Purchase
                </p>
                <p className='text-lg font-bold'>
                  {formatCurrencyAmount(
                    currentSubscription.price_at_purchase || plan.price,
                    currentSubscription.currency || plan.currency
                  )}
                </p>
                <p className='text-xs text-muted-foreground'>
                  Every {plan.duration_months}{' '}
                  {plan.duration_months === 1 ? 'month' : 'months'} (
                  {plan.billing_interval})
                </p>
              </div>

              <div>
                <p className='text-xs text-muted-foreground'>Payment Method</p>
                <p className='text-sm font-semibold capitalize'>
                  {currentSubscription.payment_method || 'Standard'}
                </p>
                {currentSubscription.transfer_ref && (
                  <p className='truncate font-mono text-xs text-muted-foreground'>
                    Ref: {currentSubscription.transfer_ref}
                  </p>
                )}
              </div>

              <div>
                <p className='text-xs text-muted-foreground'>Auto-Renewal</p>
                <div className='mt-0.5 flex items-center gap-1.5'>
                  <RefreshCw className='h-3.5 w-3.5 text-emerald-600' />
                  <span className='text-sm font-semibold'>
                    {currentSubscription.auto_renew ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className='text-xs text-muted-foreground'>
                  Grace: {plan.grace_period_days} days
                </p>
              </div>

              <div>
                <p className='text-xs text-muted-foreground'>Allowed Modules</p>
                <div className='mt-1 flex flex-wrap gap-1'>
                  {plan.allowed_modules.map((m) => (
                    <Badge
                      key={m}
                      variant='secondary'
                      className='text-xs capitalize'
                    >
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className='flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-xs'>
              <span className='flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400'>
                <ShieldCheck className='h-4 w-4 shrink-0' />
                Single Active Subscription Policy Enforced: Switching to another
                plan automatically supersedes and cancels this subscription.
              </span>
              <span className='font-mono text-muted-foreground'>
                ID: {currentSubscription.id.slice(0, 8)}...
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Expiration & Validity Countdown Card */}
        <Card>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between'>
              <CardTitle className='flex items-center gap-2 text-base font-semibold'>
                <Calendar className='h-4 w-4 text-primary' />
                Expiration &amp; Cycle
              </CardTitle>
              <Badge
                variant={
                  expirationInfo.isExpired
                    ? 'destructive'
                    : expirationInfo.isExpiringSoon
                      ? 'outline'
                      : 'secondary'
                }
              >
                <Clock className='mr-1 h-3 w-3' />
                {expirationInfo.isExpired
                  ? 'Expired'
                  : `${expirationInfo.daysRemaining} days left`}
              </Badge>
            </div>
            <CardDescription>
              When your current subscription expires
            </CardDescription>
          </CardHeader>

          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <div className='flex justify-between text-xs'>
                <span className='text-muted-foreground'>
                  Cycle Elapsed ({expirationInfo.elapsedDays} /{' '}
                  {expirationInfo.totalCycleDays} days)
                </span>
                <span className='font-semibold'>
                  {expirationInfo.progressPercentage}%
                </span>
              </div>
              <Progress
                value={expirationInfo.progressPercentage}
                className='h-2'
              />
            </div>

            <div className='grid grid-cols-2 gap-3 rounded-lg border p-3 text-xs'>
              <div>
                <p className='text-muted-foreground'>Start Date</p>
                <p className='mt-0.5 font-semibold'>
                  {currentSubscription.start_date
                    ? format(new Date(currentSubscription.start_date), 'PPP')
                    : '—'}
                </p>
              </div>
              <div>
                <p className='text-muted-foreground'>Expiration Date</p>
                <p className='mt-0.5 font-semibold text-amber-600 dark:text-amber-400'>
                  {currentSubscription.end_date
                    ? format(new Date(currentSubscription.end_date), 'PPP')
                    : '—'}
                </p>
              </div>
              {currentSubscription.trial_ends_at && (
                <div>
                  <p className='text-muted-foreground'>Trial Ends</p>
                  <p className='mt-0.5 font-medium'>
                    {format(new Date(currentSubscription.trial_ends_at), 'PP')}
                  </p>
                </div>
              )}
              {currentSubscription.grace_ends_at && (
                <div>
                  <p className='text-muted-foreground'>Grace Period Ends</p>
                  <p className='mt-0.5 font-medium'>
                    {format(new Date(currentSubscription.grace_ends_at), 'PP')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Quotas & Live Usage Grid */}
      <Card>
        <CardHeader>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div>
              <CardTitle className='text-lg'>
                Subscription Quotas &amp; Resource Limits
              </CardTitle>
              <CardDescription>
                Effective limits from `subscriptions` and `tenant_subscriptions`
                custom overrides compared with your current tenant usage.
              </CardDescription>
            </div>
            <Badge variant='outline'>9 Resource Quotas</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {quotaItems.map((item) => {
              const Icon = item.icon
              const isUnlimited = item.effectiveMax === -1
              const percent = isUnlimited
                ? 15
                : item.effectiveMax > 0
                  ? Math.min(
                      100,
                      Math.round((item.current / item.effectiveMax) * 100)
                    )
                  : 0
              const isNearLimit = !isUnlimited && percent >= 85

              return (
                <div
                  key={item.key}
                  className='flex flex-col justify-between rounded-lg border p-4 transition-colors hover:bg-muted/20'
                >
                  <div className='flex items-start justify-between gap-2'>
                    <div className='flex items-center gap-2.5'>
                      <div className='rounded-md bg-primary/10 p-2 text-primary'>
                        <Icon className='h-4 w-4' />
                      </div>
                      <div>
                        <p className='text-sm font-semibold'>{item.label}</p>
                        {item.hasCustomOverride ? (
                          <Badge
                            variant='outline'
                            className='mt-0.5 border-amber-500/40 text-[10px] text-amber-600'
                          >
                            Custom Tenant Override (Base:{' '}
                            {formatQuotaValue(item.baseMax)})
                          </Badge>
                        ) : (
                          <p className='text-xs text-muted-foreground'>
                            Plan standard limit
                          </p>
                        )}
                      </div>
                    </div>

                    <div className='text-right'>
                      <span className='text-sm font-bold'>
                        {item.current.toLocaleString()} /{' '}
                        {formatQuotaValue(item.effectiveMax)}
                      </span>
                    </div>
                  </div>

                  <div className='mt-4 space-y-1.5'>
                    <Progress
                      value={percent}
                      className={
                        isNearLimit ? 'h-1.5 bg-destructive/20' : 'h-1.5'
                      }
                    />
                    <div className='flex items-center justify-between text-[11px] text-muted-foreground'>
                      <span>
                        {isUnlimited
                          ? 'Unlimited capacity'
                          : `${percent}% utilized`}
                      </span>
                      {item.onAction && (
                        <button
                          type='button'
                          onClick={item.onAction}
                          className='font-medium text-primary hover:underline'
                        >
                          View Users →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags & Capabilities */}
      <Card>
        <CardHeader>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div>
              <CardTitle className='flex items-center gap-2 text-lg'>
                <Layers className='h-5 w-5 text-primary' />
                Subscription Feature Options &amp; Capabilities
              </CardTitle>
              <CardDescription>
                Feature flags enabled on your current subscription plan.
              </CardDescription>
            </div>
            <Badge variant='secondary'>
              {featureFlags.filter((f) => f.enabled).length} /{' '}
              {featureFlags.length} Features Enabled
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            {featureFlags.map((feat) => (
              <div
                key={feat.label}
                className={`flex items-start gap-3 rounded-lg border p-3.5 ${
                  feat.enabled
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'opacity-60'
                }`}
              >
                {feat.enabled ? (
                  <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-emerald-600' />
                ) : (
                  <XCircle className='mt-0.5 h-4 w-4 shrink-0 text-muted-foreground' />
                )}
                <div className='space-y-0.5'>
                  <p className='text-sm font-semibold'>{feat.label}</p>
                  <p className='text-xs text-muted-foreground'>
                    {feat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tenant Subscription History Table */}
      <Card>
        <CardHeader>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div>
              <CardTitle className='flex items-center gap-2 text-lg'>
                <History className='h-5 w-5 text-primary' />
                Tenant Subscription History
              </CardTitle>
              <CardDescription>
                Your active subscription and any previously superseded or
                canceled plans.
              </CardDescription>
            </div>
            <Badge variant='outline'>
              {subscriptionHistory.length}{' '}
              {subscriptionHistory.length === 1 ? 'Record' : 'Records'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className='overflow-hidden rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Expiration Date</TableHead>
                  <TableHead>Cancelled / Superseded At</TableHead>
                  <TableHead className='text-right'>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptionHistory.map((sub) => {
                  const isCurrent = sub.id === currentSubscription.id
                  return (
                    <TableRow key={sub.id}>
                      <TableCell className='font-medium'>
                        <div className='flex items-center gap-2'>
                          <span>
                            {sub.subscriptions?.name || 'Subscription Plan'}
                          </span>
                          {isCurrent && (
                            <Badge className='bg-emerald-600 text-[10px] text-white hover:bg-emerald-700'>
                              Current Active
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            sub.status === 'paid' || sub.status === 'active'
                              ? 'default'
                              : sub.status === 'canceled'
                                ? 'secondary'
                                : 'outline'
                          }
                          className='capitalize'
                        >
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatCurrencyAmount(
                          sub.price_at_purchase,
                          sub.currency
                        )}
                      </TableCell>
                      <TableCell>
                        {sub.start_date
                          ? format(new Date(sub.start_date), 'PPP')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {sub.end_date
                          ? format(new Date(sub.end_date), 'PPP')
                          : '—'}
                      </TableCell>
                      <TableCell className='text-xs text-muted-foreground'>
                        {sub.cancelled_at
                          ? format(new Date(sub.cancelled_at), 'PPP')
                          : '—'}
                      </TableCell>
                      <TableCell className='text-right'>
                        {sub.subscriptions && (
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => onPreviewPlan(sub.subscriptions!)}
                          >
                            <Eye className='mr-1 h-3.5 w-3.5' />
                            Preview
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

