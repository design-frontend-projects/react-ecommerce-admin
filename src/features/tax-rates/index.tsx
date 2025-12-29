import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { TaxDialogs } from './components/tax-rates-dialogs'
import { TaxPrimaryButtons } from './components/tax-rates-primary-buttons'
import { TaxProvider } from './components/tax-rates-provider'
import { TaxTable } from './components/tax-rates-table'
import { useTaxRates } from './hooks/use-tax-rates'

export function TaxRates() {
  const { data, isLoading } = useTaxRates()

  return (
    <TaxProvider>
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
            <h2 className='text-2xl font-bold tracking-tight'>Tax Rates</h2>
            <p className='text-muted-foreground'>
              Manage tax rates for different regions and product types.
            </p>
          </div>
          <TaxPrimaryButtons />
        </div>
        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          {isLoading ? (
            <div>Loading tax rates...</div>
          ) : (
            <TaxTable data={data || []} />
          )}
        </div>
      </Main>

      <TaxDialogs />
    </TaxProvider>
  )
}
