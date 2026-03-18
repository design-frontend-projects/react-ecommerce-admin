import { Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { CurrenciesDialogs } from './components/currencies-dialogs'
import { CurrenciesPrimaryButtons } from './components/currencies-primary-buttons'
import { CurrenciesProvider } from './components/currencies-provider'
import { CurrenciesTable } from './components/currencies-table'
import { useCurrencies } from './hooks/use-currencies'

export function Currencies() {
  const { data: currencies, isLoading, error } = useCurrencies()

  return (
    <CurrenciesProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Currencies</h2>
            <p className='text-muted-foreground'>
              Manage your currencies.
            </p>
          </div>
          <CurrenciesPrimaryButtons />
        </div>

        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='text-destructive'>Error loading currencies</div>
        ) : (
          <CurrenciesTable data={currencies || []} />
        )}
      </Main>

      <CurrenciesDialogs />
    </CurrenciesProvider>
  )
}
