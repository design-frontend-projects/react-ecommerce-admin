import { useTranslation } from 'react-i18next'
import { useState, useMemo } from 'react'
import { Loader2, Warehouse, Store, AlertTriangle, Layers } from 'lucide-react'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StockBalancesDialogs } from './components/stock-balances-dialogs'
import { StockBalancesPrimaryButtons } from './components/stock-balances-primary-buttons'
import { StockBalancesProvider } from './components/stock-balances-provider'
import { StockBalancesTable } from './components/stock-balances-table'
import { StockBalancesMetrics } from './components/stock-balances-metrics'
import { useStockBalances } from './hooks/use-stock-balances'
import type { StockBalanceFilters } from './data/schema'

export function StockBalances() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'all' | 'alerts' | 'warehouses' | 'stores'>('all')

  const filters: StockBalanceFilters = useMemo(() => {
    if (activeTab === 'alerts') {
      return { stockStatus: 'low_stock' }
    }
    return {}
  }, [activeTab])

  const { stockBalances, metrics, isLoading, error } = useStockBalances(filters)

  // Filter client-side based on facility tab if selected
  const displayBalances = useMemo(() => {
    if (activeTab === 'warehouses') {
      return stockBalances.filter((b) => Boolean(b.warehouse_id))
    }
    if (activeTab === 'stores') {
      return stockBalances.filter((b) => Boolean(b.store_id))
    }
    if (activeTab === 'alerts') {
      return stockBalances.filter((b) => {
        const onHand = Number(b.qty_on_hand || 0)
        const reorderLevel = 10
        return onHand <= reorderLevel
      })
    }
    return stockBalances
  }, [stockBalances, activeTab])

  return (
    <StockBalancesProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        {/* Title & Action Bar */}
        <div className='flex flex-wrap items-end justify-between gap-4'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight sm:text-3xl'>
              {t('stockBalances.title', 'Stock Balances')}
            </h2>
            <p className='text-sm text-muted-foreground'>
              {t(
                'stockBalances.description',
                'Multi-facility real-time inventory ledger tracking stock on hand, reserved quantities, valuation, and audit movements.'
              )}
            </p>
          </div>
          <StockBalancesPrimaryButtons />
        </div>

        {/* Executive Metric Cards */}
        <StockBalancesMetrics metrics={metrics} isLoading={isLoading} />

        {/* Facility & View Tabs */}
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as typeof activeTab)}
            className='w-full sm:w-auto'
          >
            <TabsList className='grid w-full grid-cols-4 sm:w-auto'>
              <TabsTrigger
                value='all'
                className='flex items-center gap-1.5 text-xs'
              >
                <Layers className='h-3.5 w-3.5' />
                {t('stockBalances.tabs.all', 'All')} ({metrics?.totalVariants ?? 0})
              </TabsTrigger>
              <TabsTrigger
                value='alerts'
                className='flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400'
              >
                <AlertTriangle className='h-3.5 w-3.5' />
                {t('stockBalances.tabs.alerts', 'Alerts')} (
                {(metrics?.lowStockCount ?? 0) +
                  (metrics?.outOfStockCount ?? 0)}
                )
              </TabsTrigger>
              <TabsTrigger
                value='warehouses'
                className='flex items-center gap-1.5 text-xs'
              >
                <Warehouse className='h-3.5 w-3.5' />
                {t('stockBalances.tabs.warehouses', 'Warehouses')}
              </TabsTrigger>
              <TabsTrigger
                value='stores'
                className='flex items-center gap-1.5 text-xs'
              >
                <Store className='h-3.5 w-3.5' />
                {t('stockBalances.tabs.stores', 'Stores')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content Table or Loading / Error */}
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center py-20'>
            <div className='flex flex-col items-center gap-2'>
              <Loader2 className='h-8 w-8 animate-spin text-primary' />
              <span className='text-sm text-muted-foreground'>
                {t(
                  'stockBalances.loading',
                  'Loading real-time stock balances...'
                )}
              </span>
            </div>
          </div>
        ) : error ? (
          <div className='rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive'>
            <p className='font-semibold text-sm'>
              {t(
                'stockBalances.errorLoading',
                'Error loading stock balances'
              )}
            </p>
            <p className='text-xs'>{(error as Error).message}</p>
          </div>
        ) : (
          <StockBalancesTable data={displayBalances} />
        )}
      </Main>

      <StockBalancesDialogs />
    </StockBalancesProvider>
  )
}
