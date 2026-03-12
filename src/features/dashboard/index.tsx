import { Link } from '@tanstack/react-router'
import { SignInButton, useAuth } from '@clerk/clerk-react'
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
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
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
        Đang tải dữ liệu tổng quan...
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
          {/* {isSignedIn && <UserButton />} */}
          {!isSignedIn && <SignInButton />}
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>Tổng quan</h1>
          <div className='flex items-center space-x-2'>
            <Button>Tải về</Button>
          </div>
        </div>
        <Tabs
          orientation='vertical'
          defaultValue='overview'
          className='space-y-4'
        >
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='overview'>Tổng quan</TabsTrigger>
              <TabsTrigger value='analytics'>Phân tích</TabsTrigger>
              <TabsTrigger value='reports' disabled>
                Báo cáo
              </TabsTrigger>
              <TabsTrigger value='notifications' disabled>
                Thông báo
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='overview' className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Tổng doanh thu
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
                      ? stats.totalRevenue.toLocaleString()
                      : '0.00'}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Tổng doanh thu từ các đơn hàng
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Khách hàng
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
                    +{stats?.activeCustomers || 0}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    <Link to='/customers' className='hover:underline'>
                      Xem tất cả khách hàng
                    </Link>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Tổng đơn hàng
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
                    +{stats?.totalOrders || 0}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Tổng số đơn hàng đã hoàn thành
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Nhà cung cấp
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
                    +{stats?.totalSuppliers || 0}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    <a href='#' className='hover:underline'>
                      Xem nhà cung cấp hoạt động
                    </a>
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <Card className='col-span-1 lg:col-span-4'>
                <CardHeader>
                  <CardTitle>Tổng quan</CardTitle>
                </CardHeader>
                <CardContent className='ps-2'>
                  <Overview data={chartData || []} />
                </CardContent>
              </Card>
              <Card className='col-span-1 lg:col-span-3'>
                <CardHeader>
                  <CardTitle>Đơn hàng gần đây</CardTitle>
                  <CardDescription>Các giao dịch bán hàng mới nhất.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentSales data={dashboardData?.recentSales || []} />
                </CardContent>
              </Card>
            </div>

            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <Card className='col-span-1 lg:col-span-4'>
                <CardHeader>
                  <CardTitle>Hoàn tiền gần đây</CardTitle>
                  <CardDescription>Các khoản hoàn tiền vừa xử lý.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentRefunds data={recentRefunds || []} />
                </CardContent>
              </Card>
              <Card className='col-span-1 lg:col-span-3'>
                <CardHeader>
                  <CardTitle>Hàng đang chờ nhập</CardTitle>
                  <CardDescription>
                    Đơn đặt hàng đang cấu hình chở nhập.
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
                Đơn đặt mua hàng
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
    title: 'Tổng quan',
    href: 'dashboard/overview',
    isActive: true,
    disabled: false,
  },
  {
    title: 'Khách hàng',
    href: 'dashboard/customers',
    isActive: false,
    disabled: true,
  },
  {
    title: 'Sản phẩm',
    href: 'dashboard/products',
    isActive: false,
    disabled: true,
  },
  {
    title: 'Cài đặt',
    href: 'dashboard/settings',
    isActive: false,
    disabled: true,
  },
]
