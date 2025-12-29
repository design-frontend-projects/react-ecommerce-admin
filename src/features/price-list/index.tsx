import { Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { PriceListDialogs } from './components/price-list-dialogs'
import { PriceListPrimaryButtons } from './components/price-list-primary-buttons'
import { PriceListProvider } from './components/price-list-provider'
import { PriceListTable } from './components/price-list-table'
import { usePriceList } from './hooks/use-price-list'

export function PriceList() {
  const { data: items, isLoading, error } = usePriceList()

  return (
    <PriceListProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Price List</h2>
            <p className='text-muted-foreground'>
              Manage product pricing rules and history.
            </p>
          </div>
          <PriceListPrimaryButtons />
        </div>

        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='text-destructive'>Error loading price list</div>
        ) : (
          <PriceListTable data={items || []} />
        )}
      </Main>

      <PriceListDialogs />
    </PriceListProvider>
  )
}
