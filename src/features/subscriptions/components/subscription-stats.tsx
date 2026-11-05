import { format } from 'date-fns'
import { CalendarClock, CreditCard, Layers, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getSubscriptionExpirationInfo } from '@/lib/subscription_utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TenantSubscriptionOverview } from '../types'
import {
  formatCurrencyAmount,
  formatQuotaValue,
} from './subscription-preview-dialog'

interface SubscriptionStatsProps {
  overview?: TenantSubscriptionOverview
  isLoading?: boolean
}

export function SubscriptionStats({
  overview,
  isLoading = false,
}: SubscriptionStatsProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className='h-32 animate-pulse' />
        ))}
      </div>
    )
  }

  const currentSub = overview?.currentSubscription ?? null
  const plan = currentSub?.subscriptions ?? null
  const expirationInfo = getSubscriptionExpirationInfo(
    currentSub?.start_date,
    currentSub?.end_date,
    currentSub?.status
  )

  const activeUsers =
    overview?.usage.users ??
    (overview?.tenantUsers ?? []).filter((u) => u.is_active && !u.is_blocked)
      .length
  const maxUsers = currentSub?.custom_max_users ?? plan?.max_users ?? 3

  const enabledFlagsCount = plan
    ? [
        plan.has_inventory_tracking,
        plan.has_restaurant_pos,
        plan.has_kitchen_display,
        plan.has_delivery_management,
        plan.has_advanced_reports,
        plan.has_audit_logs,
        plan.has_api_access,
        plan.has_priority_support,
      ].filter(Boolean).length
    : 0

  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            {t('subscriptions.stats.activePlan', {
              defaultValue: 'Current Active Plan',
            })}
          </CardTitle>
          <CreditCard className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='truncate text-2xl font-bold'>
            {plan?.name ||
              t('subscriptions.stats.noActivePlan', {
                defaultValue: 'No Active Plan',
              })}
          </div>
          <p className='text-xs text-muted-foreground'>
            {plan
              ? `${formatCurrencyAmount(currentSub?.price_at_purchase || plan.price, currentSub?.currency || plan.currency)} / ${plan.duration_months} mo (${plan.tier.replace('_', ' ')})`
              : t('subscriptions.stats.selectPlanHint', {
                  defaultValue: 'Select a plan in Available Plans tab',
                })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            {t('subscriptions.stats.expiration', {
              defaultValue: 'Expiration Countdown',
            })}
          </CardTitle>
          <CalendarClock
            className={`h-4 w-4 ${
              expirationInfo.isExpired || expirationInfo.isExpiringSoon
                ? 'text-destructive'
                : 'text-muted-foreground'
            }`}
          />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>
            {!currentSub?.end_date
              ? '—'
              : expirationInfo.isExpired
                ? t('subscriptions.stats.expired', { defaultValue: 'Expired' })
                : t('subscriptions.stats.daysLeft', {
                    count: expirationInfo.daysRemaining,
                    defaultValue: `${expirationInfo.daysRemaining} Days`,
                  })}
          </div>
          <p className='text-xs text-muted-foreground'>
            {currentSub?.end_date
              ? `${t('subscriptions.stats.expiresOn', { defaultValue: 'Expires' })} ${format(new Date(currentSub.end_date), 'PPP')}`
              : t('subscriptions.stats.noExpiration', {
                  defaultValue: 'No expiration date set',
                })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            {t('subscriptions.stats.userSeats', {
              defaultValue: 'Tenant User Seats',
            })}
          </CardTitle>
          <Users className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>
            {activeUsers} / {formatQuotaValue(maxUsers)}
          </div>
          <p className='text-xs text-muted-foreground'>
            {t('subscriptions.stats.totalUsersCount', {
              count: overview?.tenantUsers.length ?? 0,
              defaultValue: `${overview?.tenantUsers.length ?? 0} total tenant user records`,
            })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>
            {t('subscriptions.stats.modulesFeatures', {
              defaultValue: 'Modules & Features',
            })}
          </CardTitle>
          <Layers className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>
            {t('subscriptions.stats.featuresCount', {
              current: enabledFlagsCount,
              total: 8,
              defaultValue: `${enabledFlagsCount} / 8 Features`,
            })}
          </div>
          <p className='truncate text-xs capitalize text-muted-foreground'>
            {t('subscriptions.stats.modulesList', {
              modules: (plan?.allowed_modules ?? ['inventory']).join(', '),
              defaultValue: `Modules: ${(plan?.allowed_modules ?? ['inventory']).join(', ')}`,
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
