import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { LanguageSwitch } from '@/components/language-switch'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useProducts } from '../products/hooks/use-products'
import { PODialogs } from './components/po-dialogs'
import { POPrimaryButtons } from './components/po-primary-buttons'
import { POProvider } from './components/po-provider'
import { POReorderAlerts } from './components/po-reorder-alerts'
import { POAnalytics } from './components/po-analytics'
import { POTable } from './components/po-table'
import { usePurchaseOrders } from './hooks/use-purchase-orders'

export function PurchaseOrders() {
  return (
    <POProvider>
      <PurchaseOrdersContent />
    </POProvider>
  )
}

function PurchaseOrdersSkeleton() {
  return (
    <div className='flex flex-1 flex-col gap-4 sm:gap-6'>
      {/* KPI Cards Skeleton */}
      <div className='grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4'>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className='rounded-xl border p-4 bg-card/60 shadow-2xs space-y-2.5'
          >
            <div className='flex justify-between items-center'>
              <Skeleton className='h-3 w-20' />
              <Skeleton className='h-6 w-6 rounded-lg' />
            </div>
            <Skeleton className='h-7 w-16' />
            <Skeleton className='h-3 w-32' />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className='space-y-3.5'>
        <div className='flex items-center justify-between gap-3'>
          <Skeleton className='h-9 w-64' />
          <Skeleton className='h-9 w-32' />
        </div>
        <div className='rounded-xl border bg-card p-4 space-y-3'>
          <Skeleton className='h-10 w-full' />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className='h-12 w-full' />
          ))}
        </div>
      </div>
    </div>
  )
}

function PurchaseOrdersContent() {
  const { t } = useTranslation()
  const {
    data: purchaseOrders = [],
    isLoading,
    error,
    refetch,
  } = usePurchaseOrders()
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  // Warm products + variants query cache before opening PO dialogs.
  useProducts()

  return (
    <>
      {/* ─── Top Navbar (Header Fixed) ───────────────────── */}
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
        </div>
      </Header>

      {/* ─── Main Content Canvas ─────────────────────────── */}
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        {/* Page Header */}
        <div className='flex flex-col sm:flex-row sm:items-end justify-between gap-3'>
          <div>
            <h2 className='bg-linear-to-r from-primary to-primary/60 bg-clip-text text-2xl sm:text-3xl font-extrabold tracking-tight text-transparent'>
              {t('purchaseOrders.title', 'Purchase Orders')}
            </h2>
            <p className='text-xs sm:text-sm text-muted-foreground mt-0.5'>
              {t(
                'purchaseOrders.description',
                'Manage supplier orders, destination warehouses, shipments, and inventory check-in.'
              )}
            </p>
          </div>
          <div className='self-start sm:self-auto'>
            <POPrimaryButtons />
          </div>
        </div>

        {/* Low Stock Reorder Alerts */}
        <POReorderAlerts />

        {/* Executive Analytics & KPI Banner */}
        <POAnalytics
          orders={purchaseOrders}
          activeStatusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {/* Loading State */}
        {isLoading && <PurchaseOrdersSkeleton />}

        {/* Error State */}
        {error && !isLoading && (
          <div className='rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center space-y-3'>
            <div className='flex items-center justify-center gap-2 text-destructive font-semibold text-sm'>
              <AlertCircle className='h-5 w-5' />
              <span>
                {t('purchaseOrders.error', 'Failed to load purchase orders:')}{' '}
                {(error as Error).message}
              </span>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetch()}
              className='text-xs'
            >
              <RotateCcw className='mr-1.5 h-3.5 w-3.5' />
              {t('common.retry', 'Retry')}
            </Button>
          </div>
        )}

        {/* Table & Cards */}
        {!isLoading && !error && (
          <POTable
            data={purchaseOrders}
            externalStatusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        )}

        {/* All Modals and Dialogs */}
        <PODialogs />
      </Main>
    </>
  )
}
