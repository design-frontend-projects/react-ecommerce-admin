import { Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { CustomersDialogs } from './components/customers-dialogs'
import { CustomersPrimaryButtons } from './components/customers-primary-buttons'
import { CustomersProvider } from './components/customers-provider'
import { CustomersTable } from './components/customers-table'
import { useCustomers } from './hooks/use-customers'

export function Customers() {
  const { data: customers, isLoading, error } = useCustomers()

  return (
    <CustomersProvider>
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
            <h2 className='text-2xl font-bold tracking-tight'>Customers</h2>
            <p className='text-muted-foreground'>
              Manage your customer database.
            </p>
          </div>
          <CustomersPrimaryButtons />
        </div>

        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='text-destructive'>Error loading customers</div>
        ) : (
          <CustomersTable data={customers || []} />
        )}
      </Main>

      <CustomersDialogs />
    </CustomersProvider>
  )
}
