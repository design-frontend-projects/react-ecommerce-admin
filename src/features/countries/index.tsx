import { Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { CountriesDialogs } from './components/countries-dialogs'
import { CountriesPrimaryButtons } from './components/countries-primary-buttons'
import { CountriesProvider } from './components/countries-provider'
import { CountriesTable } from './components/countries-table'
import { useCountries } from './hooks/use-countries'

export function Countries() {
  const { data: countries, isLoading, error } = useCountries()

  return (
    <CountriesProvider>
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
            <h2 className='text-2xl font-bold tracking-tight'>Countries</h2>
            <p className='text-muted-foreground'>
              Manage your countries.
            </p>
          </div>
          <CountriesPrimaryButtons />
        </div>

        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='text-destructive'>Error loading countries</div>
        ) : (
          <CountriesTable data={countries || []} />
        )}
      </Main>

      <CountriesDialogs />
    </CountriesProvider>
  )
}
