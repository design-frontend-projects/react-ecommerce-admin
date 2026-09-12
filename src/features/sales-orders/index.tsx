import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Loader2,
  Receipt,
  Clock,
  Truck,
  CheckCircle2,
  DollarSign,
} from 'lucide-react'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { OrdersDialogs } from './components/dialogs'
import { OrdersPrimaryButtons } from './components/primary-buttons'
import { OrdersProvider } from './components/provider'
import { OrdersTable } from './components/table'
import { useOrders } from './hooks/use-sales-orders'

export function SalesOrders() {
  const { t } = useTranslation()
  const { data: orders = [], isLoading, error } = useOrders()

  const stats = useMemo(() => {
    const totalOrders = orders.length
    const pendingDraft = orders.filter((o) =>
      ['draft', 'confirmed'].includes(o.status)
    ).length
    const inFulfillment = orders.filter((o) =>
      ['picking', 'packed', 'delivered'].includes(o.status)
    ).length
    const completed = orders.filter((o) =>
      ['completed', 'invoiced'].includes(o.status)
    ).length
    const totalRevenue = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0)

    return {
      totalOrders,
      pendingDraft,
      inFulfillment,
      completed,
      totalRevenue,
    }
  }, [orders])

  return (
    <OrdersProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        {/* Title and Action Buttons */}
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='bg-linear-to-r from-primary to-primary/60 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent'>
              {t('salesOrders.title', 'Sales Orders')}
            </h2>
            <p className='text-muted-foreground text-sm'>
              {t(
                'salesOrders.description',
                'Order-to-fulfillment pipeline: draft, reserve inventory, pick & pack, dispatch, invoice, and print.'
              )}
            </p>
          </div>
          <OrdersPrimaryButtons />
        </div>

        {/* Executive Overview KPI Strip */}
        {!isLoading && !error && (
          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5'>
            {/* Total Orders */}
            <div className='rounded-xl border bg-card/60 p-4 shadow-xs space-y-1.5'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-semibold text-muted-foreground'>
                  {t('salesOrders.kpis.totalOrders', 'Total Orders')}
                </span>
                <div className='p-1.5 rounded-md bg-primary/10 text-primary'>
                  <Receipt className='h-4 w-4' />
                </div>
              </div>
              <p className='text-2xl font-bold tracking-tight text-foreground'>
                {stats.totalOrders}
              </p>
              <p className='text-[11px] text-muted-foreground'>
                {t('salesOrders.kpis.totalOrdersDesc', 'Recorded sales orders')}
              </p>
            </div>

            {/* Pending / Draft */}
            <div className='rounded-xl border bg-card/60 p-4 shadow-xs space-y-1.5'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-semibold text-muted-foreground'>
                  {t('salesOrders.kpis.pendingDraft', 'Pending / Draft')}
                </span>
                <div className='p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400'>
                  <Clock className='h-4 w-4' />
                </div>
              </div>
              <p className='text-2xl font-bold tracking-tight text-foreground'>
                {stats.pendingDraft}
              </p>
              <p className='text-[11px] text-muted-foreground'>
                {t('salesOrders.kpis.pendingDraftDesc', 'Awaiting fulfillment')}
              </p>
            </div>

            {/* In Fulfillment */}
            <div className='rounded-xl border bg-card/60 p-4 shadow-xs space-y-1.5'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-semibold text-muted-foreground'>
                  {t('salesOrders.kpis.inFulfillment', 'In Fulfillment')}
                </span>
                <div className='p-1.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400'>
                  <Truck className='h-4 w-4' />
                </div>
              </div>
              <p className='text-2xl font-bold tracking-tight text-foreground'>
                {stats.inFulfillment}
              </p>
              <p className='text-[11px] text-muted-foreground'>
                {t('salesOrders.kpis.inFulfillmentDesc', 'Picking, packed & transit')}
              </p>
            </div>

            {/* Completed */}
            <div className='rounded-xl border bg-card/60 p-4 shadow-xs space-y-1.5'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-semibold text-muted-foreground'>
                  {t('salesOrders.kpis.completed', 'Completed')}
                </span>
                <div className='p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
                  <CheckCircle2 className='h-4 w-4' />
                </div>
              </div>
              <p className='text-2xl font-bold tracking-tight text-foreground'>
                {stats.completed}
              </p>
              <p className='text-[11px] text-muted-foreground'>
                {t('salesOrders.kpis.completedDesc', 'Delivered & invoiced')}
              </p>
            </div>

            {/* Total Value */}
            <div className='rounded-xl border bg-card/60 p-4 shadow-xs space-y-1.5 col-span-2 sm:col-span-1'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-semibold text-muted-foreground'>
                  {t('salesOrders.kpis.totalPipeline', 'Total Pipeline')}
                </span>
                <div className='p-1.5 rounded-md bg-primary/10 text-primary'>
                  <DollarSign className='h-4 w-4' />
                </div>
              </div>
              <p className='text-2xl font-mono font-bold tracking-tight text-primary'>
                ${stats.totalRevenue.toFixed(2)}
              </p>
              <p className='text-[11px] text-muted-foreground'>
                {t('salesOrders.kpis.totalPipelineDesc', 'Active order value')}
              </p>
            </div>
          </div>
        )}

        {/* Data Table Content */}
        {isLoading ? (
          <div className='flex min-h-[400px] flex-1 items-center justify-center'>
            <Loader2 className='h-10 w-10 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='flex flex-1 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-8 text-rose-500'>
            <p className='font-medium'>
              {t('salesOrders.errorLoading', 'Error loading sales orders.')}
            </p>
          </div>
        ) : (
          <OrdersTable data={orders} />
        )}
      </Main>

      <OrdersDialogs />
    </OrdersProvider>
  )
}
