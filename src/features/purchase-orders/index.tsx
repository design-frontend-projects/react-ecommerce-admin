import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { PODialogs } from './components/purchase-orders-dialogs'
import { POPrimaryButtons } from './components/purchase-orders-primary-buttons'
import { POProvider } from './components/purchase-orders-provider'
import { POTable } from './components/purchase-orders-table'
import { usePurchaseOrders } from './hooks/use-purchase-orders'

export function PurchaseOrders() {
  const { data, isLoading } = usePurchaseOrders()

  return (
    <POProvider>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Purchase Orders
            </h2>
            <p className='text-muted-foreground'>
              Manage your purchase orders and track deliveries.
            </p>
          </div>
          <POPrimaryButtons />
        </div>
        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          {isLoading ? (
            <div>Loading purchase orders...</div>
          ) : (
            <POTable data={data || []} />
          )}
        </div>
      </Main>

      <PODialogs />
    </POProvider>
  )
}
