import { Link } from '@tanstack/react-router'
import { SignInButton, useAuth } from '@clerk/clerk-react'
import { Trans } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Analytics } from './components/analytics'
import { Overview } from './components/overview'
import { PendingPurchaseOrders } from './components/pending-purchase-orders'
import { PurchaseOrderAnalytics } from './components/purchase-order-analytics'
import { RecentRefunds } from './components/recent-refunds'
import { RecentSales } from './components/recent-sales'
import { useDashboardData } from './use-dashboard-data'

export function Dashboard() {
  const { isSignedIn } = useAuth()
  const { data: dashboardData, isLoading } = useDashboardData()

  if (isLoading) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <Trans i18nKey='dashboard.loading' />
      </div>
    )
  }

  const { stats, chartData, recentRefunds, pendingPurchaseOrders } =
    dashboardData || {}

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <TopNav links={topNav} />
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <LanguageSwitch />
          <ThemeSwitch />
          <ConfigDrawer />
          {isSignedIn && <ProfileDropdown />}
          {!isSignedIn && <SignInButton />}
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>
            <Trans i18nKey='dashboard.overview' />
          </h1>
          <div className='flex items-center space-x-2'>
            <Button>
              <Trans i18nKey='dashboard.download' />
            </Button>
          </div>
        </div>
        <Tabs
          orientation='vertical'
          defaultValue='overview'
          className='space-y-4'
        >
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='overview'>
                <Trans i18nKey='dashboard.overview' />
              </TabsTrigger>
              <TabsTrigger value='analytics'>
                <Trans i18nKey='dashboard.analytics' />
              </TabsTrigger>
              <TabsTrigger value='reports' disabled>
                <Trans i18nKey='dashboard.reports' />
              </TabsTrigger>
              <TabsTrigger value='notifications' disabled>
                <Trans i18nKey='dashboard.notifications' />
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='overview' className='space-y-4'>
            {/* ─── Row 1: Primary KPIs ─── */}
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              {/* Total Revenue */}
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    <Trans i18nKey='dashboard.totalRevenue' />
                  </CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <path d='M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    $
                    {stats?.totalRevenue
                      ? stats.totalRevenue.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : '0.00'}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Net revenue from all sale transactions
                  </p>
                </CardContent>
              </Card>

              {/* Total Sales */}
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Total Sales
                  </CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <path d='M3 3v18h18' />
                    <path d='M7 15l4-4 4 4 4-6' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {stats?.totalSales || 0}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Sale transactions (transaction_type = sale)
                  </p>
                </CardContent>
              </Card>

              {/* Total Refunds */}
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Total Refunds
                  </CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-red-500'
                  >
                    <polyline points='1 4 1 10 7 10' />
                    <path d='M3.51 15a9 9 0 1 0 2.13-9.36L1 10' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold text-red-500'>
                    ${' '}
                    {stats?.totalRefundAmount
                      ? stats.totalRefundAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : '0.00'}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    {stats?.totalRefunds || 0} refunds processed
                  </p>
                </CardContent>
              </Card>

              {/* Pending Orders */}
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Pending Orders
                  </CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-amber-500'
                  >
                    <circle cx='12' cy='12' r='10' />
                    <path d='M12 6v6l4 2' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold text-amber-600'>
                    {stats?.pendingOrdersCount || 0}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Purchase orders awaiting receipt
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* ─── Row 2: Secondary KPIs ─── */}
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              {/* Customers */}
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    <Trans i18nKey='dashboard.customers' />
                  </CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
                    <circle cx='9' cy='7' r='4' />
                    <path d='M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {stats?.activeCustomers || 0}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    <Link to='/customers' className='hover:underline'>
                      <Trans i18nKey='dashboard.viewAllCustomers' />
                    </Link>
                  </p>
                </CardContent>
              </Card>

              {/* Suppliers */}
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    <Trans i18nKey='dashboard.suppliers' />
                  </CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <path d='M22 12h-4l-3 9L9 3l-3 9H2' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {stats?.totalSuppliers || 0}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    <Trans i18nKey='dashboard.viewActiveSuppliers' />
                  </p>
                </CardContent>
              </Card>

              {/* Total Purchase Orders */}
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Purchase Orders
                  </CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <rect width='20' height='14' x='2' y='5' rx='2' />
                    <path d='M2 10h20' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {stats?.totalPurchaseOrders || 0}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Total purchase orders created
                  </p>
                </CardContent>
              </Card>

              {/* Received Items & Amount */}
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Received Items
                  </CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-green-500'
                  >
                    <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
                    <polyline points='22 4 12 14.01 9 11.01' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold text-green-600'>
                    {stats?.totalReceivedItems || 0}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Worth $
                    {stats?.totalReceivedAmount
                      ? stats.totalReceivedAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : '0.00'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* ─── Row 3: Charts & Recent Sales ─── */}
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <Card className='col-span-1 lg:col-span-4'>
                <CardHeader>
                  <CardTitle>
                    <Trans i18nKey='dashboard.overview' />
                  </CardTitle>
                  <CardDescription>
                    Monthly sales vs refunds (last 6 months)
                  </CardDescription>
                </CardHeader>
                <CardContent className='ps-2'>
                  <Overview data={chartData || []} />
                </CardContent>
              </Card>
              <Card className='col-span-1 lg:col-span-3'>
                <CardHeader>
                  <CardTitle>
                    <Trans i18nKey='dashboard.recentSales' />
                  </CardTitle>
                  <CardDescription>
                    <Trans i18nKey='dashboard.recentSalesDescription' />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentSales data={dashboardData?.recentSales || []} />
                </CardContent>
              </Card>
            </div>

            {/* ─── Row 4: Refunds & Pending POs ─── */}
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <Card className='col-span-1 lg:col-span-4'>
                <CardHeader>
                  <CardTitle>
                    <Trans i18nKey='dashboard.recentRefunds' />
                  </CardTitle>
                  <CardDescription>
                    <Trans i18nKey='dashboard.recentRefundsDescription' />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentRefunds data={recentRefunds || []} />
                </CardContent>
              </Card>
              <Card className='col-span-1 lg:col-span-3'>
                <CardHeader>
                  <CardTitle>
                    <Trans i18nKey='dashboard.pendingPurchaseOrders' />
                  </CardTitle>
                  <CardDescription>
                    <Trans i18nKey='dashboard.pendingPurchaseOrdersDescription' />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PendingPurchaseOrders data={pendingPurchaseOrders || []} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value='analytics' className='space-y-4'>
            <Analytics />
            <div className='pt-4'>
              <h2 className='mb-4 text-xl font-bold tracking-tight'>
                <Trans i18nKey='dashboard.purchaseOrders' />
              </h2>
              <PurchaseOrderAnalytics />
            </div>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}

const topNav = [
  {
    title: 'Overview',
    href: 'dashboard/overview',
    isActive: true,
    disabled: false,
  },
  {
    title: 'Client',
    href: 'dashboard/customers',
    isActive: false,
    disabled: true,
  },
  {
    title: 'Products',
    href: 'dashboard/products',
    isActive: false,
    disabled: true,
  },
  {
    title: 'Settings',
    href: 'dashboard/settings',
    isActive: false,
    disabled: true,
  },
]
