import { useState } from 'react'
import { CreditCard, Sparkles, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfigDrawer } from '@/components/config-drawer'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AvailablePlansTab } from './components/available-plans-tab'
import { CurrentSubscriptionTab } from './components/current-subscription-tab'
import { SubscriptionPreviewDialog } from './components/subscription-preview-dialog'
import { SubscriptionStats } from './components/subscription-stats'
import { SubscriptionTenantUsersTab } from './components/subscription-tenant-users-tab'
import { useSubscribeToPlan, useTenantSubscriptionOverview } from './queries'
import type { PlatformSubscriptionPlan } from './types'

export function SubscriptionsFeature() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'current' | 'plans' | 'users'>(
    'current'
  )
  const [previewPlan, setPreviewPlan] =
    useState<PlatformSubscriptionPlan | null>(null)

  const { data: overview, isLoading } = useTenantSubscriptionOverview()
  const subscribeMutation = useSubscribeToPlan()

  const handleSwitchFromPreview = async (plan: PlatformSubscriptionPlan) => {
    try {
      const res = await subscribeMutation.mutateAsync({
        subscription_id: plan.id,
        payment_method: 'card',
        auto_renew: true,
      })
      if (res.supersededCount > 0) {
        toast.success(
          `Switched to ${plan.name}! Previous active subscription was superseded.`
        )
      } else {
        toast.success(`Subscribed to ${plan.name} successfully!`)
      }
      setPreviewPlan(null)
      setActiveTab('current')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to activate subscription plan.'
      )
    }
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center gap-3 sm:gap-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <div className='flex flex-wrap items-center gap-2'>
              <h2 className='text-2xl font-bold tracking-tight'>
                {t('subscriptions.header.title', {
                  defaultValue: 'Tenant Subscription & Plans',
                })}
              </h2>
              {overview?.tenant?.name && (
                <Badge variant='outline' className='text-xs'>
                  {overview.tenant.name}
                  {overview.tenant.tenant_code
                    ? ` (${overview.tenant.tenant_code})`
                    : ''}
                </Badge>
              )}
            </div>
            <p className='text-sm text-muted-foreground mt-0.5'>
              {t('subscriptions.header.subtitle', {
                defaultValue:
                  'Inspect your active subscription options, expiration timeline, platform plans, and related tenant users.',
              })}
            </p>
          </div>
        </div>

        <SubscriptionStats overview={overview} isLoading={isLoading} />

        <Tabs
          value={activeTab}
          onValueChange={(val) =>
            setActiveTab(val as 'current' | 'plans' | 'users')
          }
          className='space-y-4'
        >
          <TabsList className='grid w-full grid-cols-3 lg:w-[540px]'>
            <TabsTrigger value='current' className='flex items-center gap-2'>
              <CreditCard className='h-4 w-4' />
              <span>
                {t('subscriptions.tabs.current', {
                  defaultValue: 'Current Subscription',
                })}
              </span>
            </TabsTrigger>

            <TabsTrigger value='plans' className='flex items-center gap-2'>
              <Sparkles className='h-4 w-4' />
              <span>
                {t('subscriptions.tabs.plans', {
                  defaultValue: 'Available Plans',
                })}
              </span>
              {overview?.availablePlans && (
                <Badge
                  variant='secondary'
                  className='ms-1 h-5 px-1.5 text-[10px]'
                >
                  {overview.availablePlans.length}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value='users' className='flex items-center gap-2'>
              <Users className='h-4 w-4' />
              <span>
                {t('subscriptions.tabs.users', {
                  defaultValue: 'Tenant Users',
                })}
              </span>
              {overview?.tenantUsers && (
                <Badge
                  variant='secondary'
                  className='ms-1 h-5 px-1.5 text-[10px]'
                >
                  {overview.tenantUsers.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value='current' className='space-y-4'>
            <CurrentSubscriptionTab
              currentSubscription={overview?.currentSubscription ?? null}
              subscriptionHistory={overview?.subscriptionHistory ?? []}
              usage={
                overview?.usage ?? {
                  branches: 0,
                  users: 0,
                  stores: 0,
                  warehouses: 0,
                  products: 0,
                  tables: 0,
                  posRegisters: 0,
                  monthlyOrders: 0,
                  storageMbUsed: 0,
                }
              }
              onSwitchToPlansTab={() => setActiveTab('plans')}
              onSwitchToUsersTab={() => setActiveTab('users')}
              onPreviewPlan={(plan) => setPreviewPlan(plan)}
            />
          </TabsContent>

          <TabsContent value='plans' className='space-y-4'>
            <AvailablePlansTab
              availablePlans={overview?.availablePlans ?? []}
              currentSubscription={overview?.currentSubscription ?? null}
              onPreviewPlan={(plan) => setPreviewPlan(plan)}
              onSubscribedSuccess={() => setActiveTab('current')}
            />
          </TabsContent>

          <TabsContent value='users' className='space-y-4'>
            <SubscriptionTenantUsersTab
              tenantUsers={overview?.tenantUsers ?? []}
              currentSubscription={overview?.currentSubscription ?? null}
            />
          </TabsContent>
        </Tabs>

        <SubscriptionPreviewDialog
          plan={previewPlan}
          currentSubscription={overview?.currentSubscription ?? null}
          tenantUsers={overview?.tenantUsers ?? []}
          usage={overview?.usage}
          open={!!previewPlan}
          onOpenChange={(open) => !open && setPreviewPlan(null)}
          onSelectPlan={handleSwitchFromPreview}
          isSubmitting={subscribeMutation.isPending}
        />
      </Main>
    </>
  )
}
