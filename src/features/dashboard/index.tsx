import { useState, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

import { useDashboardAnalytics } from './hooks/use-dashboard-analytics'
import { DashboardSkeleton } from './components/dashboard-skeleton'
import { EmptyDashboard } from './components/empty-dashboard'
import { CommandCenterHeader } from './components/command-center-header'
import { CriticalAlertsBar } from './components/critical-alerts-bar'
import { KpiGrid } from './components/kpi-grid'
import { SalesTrendChart } from './components/sales-trend-chart'
import { CategoryDonutChart } from './components/category-donut-chart'
import { StockAlertsTable } from './components/stock-alerts-table'
import { OverduePoTable } from './components/overdue-po-table'
import { TopMoversList } from './components/top-movers-list'

export function Dashboard() {
  const { t } = useTranslation()
  const { isSignedIn } = useAuth()

  // Filter state
  const [warehouseId, setWarehouseId] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [activeTableFilter, setActiveTableFilter] = useState<string>('all')
  const [sideTab, setSideTab] = useState<'overdue' | 'movers'>('overdue')

  // Ref to scroll to tables when alert clicked
  const tablesRef = useRef<HTMLDivElement>(null)

  const {
    data: dashboardData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useDashboardAnalytics({ warehouseId, timeRange })

  const topNav = [
    {
      title: t('dashboard.overview', 'Overview'),
      href: '/',
      isActive: true,
      disabled: false,
    },
    {
      title: t('sidebar.products', 'Products'),
      href: '/dashboard/products',
      isActive: false,
      disabled: false,
    },
    {
      title: 'Valuation',
      href: '/inventory/valuation',
      isActive: false,
      disabled: false,
    },
    {
      title: 'Movements',
      href: '/inventory-movements',
      isActive: false,
      disabled: false,
    },
    {
      title: 'Purchase Orders',
      href: '/purchase-orders',
      isActive: false,
      disabled: false,
    },
  ]

  const handleCriticalAlertClick = (
    type: 'all' | 'out_of_stock' | 'low_stock' | 'expired' | 'overdue'
  ) => {
    if (type === 'overdue') {
      setSideTab('overdue')
    } else {
      setActiveTableFilter(type === 'expired' ? 'expiry' : type)
    }
    tablesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      {/* Top Application Header */}
      <Header>
        <TopNav links={topNav} />
        <div className='ms-auto flex items-center space-x-3'>
          <Search />
          <LanguageSwitch />
          <ThemeSwitch />
          <ConfigDrawer />
          {isSignedIn && <ProfileDropdown />}
          {!isSignedIn && (
            <Button asChild size='sm'>
              <Link to='/sign-in'>Sign In</Link>
            </Button>
          )}
        </div>
      </Header>

      {/* Main Content Area */}
      <Main className='pb-12'>
        {isLoading ? (
          <DashboardSkeleton />
        ) : isError ? (
          <div className='flex flex-col items-center justify-center min-h-[50vh] p-6 text-center animate-in fade-in-50 duration-300'>
            <div className='w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4'>
              <AlertCircle className='w-7 h-7' />
            </div>
            <h3 className='text-lg font-bold text-foreground mb-1'>
              Failed to load inventory analytics
            </h3>
            <p className='text-sm text-muted-foreground max-w-md mb-6'>
              {error?.message ||
                'An unexpected error occurred while communicating with the database.'}
            </p>
            <Button
              onClick={() => refetch()}
              disabled={isRefetching}
              className='gap-2 text-xs font-medium'
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`}
              />
              <span>{isRefetching ? 'Re-connecting...' : 'Try Again'}</span>
            </Button>
          </div>
        ) : !dashboardData ||
          (dashboardData.kpis.totalInventoryValue === 0 &&
            dashboardData.kpis.activeSkus === 0 &&
            dashboardData.kpis.totalSkus === 0) ? (
          <EmptyDashboard
            onRefresh={() => refetch()}
            isRefetching={isRefetching}
          />
        ) : (
          <div className='flex flex-col gap-6 animate-in fade-in-50 duration-500'>
            {/* 1. Command Center Header & Telemetry Filter Bar */}
            <CommandCenterHeader
              warehouses={dashboardData.warehouses}
              selectedWarehouseId={warehouseId}
              onWarehouseChange={setWarehouseId}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              onRefresh={() => refetch()}
              isRefetching={isRefetching}
              lastUpdated={dashboardData.lastUpdated}
            />

            {/* 2. Critical Action Alerts Banner */}
            <CriticalAlertsBar
              alerts={dashboardData.criticalAlerts}
              onSelectFilter={handleCriticalAlertClick}
            />

            {/* 3. High-Impact KPI Grid (6 Metric Cards) */}
            <KpiGrid
              kpis={dashboardData.kpis}
              currency={dashboardData.currency}
              onCardClick={(key) => {
                if (key === 'pending_pos') setSideTab('overdue')
                if (key === 'stock_health') setActiveTableFilter('low_stock')
                if (key === 'expiry_alerts') setActiveTableFilter('expiry')
                tablesRef.current?.scrollIntoView({ behavior: 'smooth' })
              }}
            />

            {/* 4. Analytics Visualizations Row */}
            <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
              <div className='lg:col-span-8'>
                <SalesTrendChart
                  data7Days={dashboardData.salesTrend7Days}
                  data30Days={dashboardData.salesTrend30Days}
                  currency={dashboardData.currency}
                />
              </div>
              <div className='lg:col-span-4'>
                <CategoryDonutChart
                  categories={dashboardData.categoryBreakdown}
                  currency={dashboardData.currency}
                />
              </div>
            </div>

            {/* 5. Actionable Operations & Supply Chain Tables Row */}
            <div ref={tablesRef} className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
              {/* Left Column: Stock & Replenishment Alerts */}
              <div className='lg:col-span-7 xl:col-span-8'>
                <StockAlertsTable
                  alerts={dashboardData.stockAlerts}
                  currency={dashboardData.currency}
                  initialFilter={activeTableFilter}
                />
              </div>

              {/* Right Column: Delayed POs & Velocity Movers */}
              <div className='lg:col-span-5 xl:col-span-4 space-y-6'>
                <Tabs
                  value={sideTab}
                  onValueChange={(val) => setSideTab(val as 'overdue' | 'movers')}
                  className='w-full'
                >
                  <TabsList className='grid grid-cols-2 w-full mb-3 bg-muted/60 p-1'>
                    <TabsTrigger
                      value='overdue'
                      className='text-xs font-medium data-[state=active]:bg-background'
                    >
                      Delayed POs ({dashboardData.overduePurchaseOrders.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value='movers'
                      className='text-xs font-medium data-[state=active]:bg-background'
                    >
                      Top Movers ({dashboardData.topMovers.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value='overdue' className='m-0'>
                    <OverduePoTable
                      orders={dashboardData.overduePurchaseOrders}
                      currency={dashboardData.currency}
                    />
                  </TabsContent>

                  <TabsContent value='movers' className='m-0'>
                    <TopMoversList movers={dashboardData.topMovers} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}
      </Main>
    </>
  )
}
