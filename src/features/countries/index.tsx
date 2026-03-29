import { CountriesProvider } from './components/countries-provider'
import { CountriesTable } from './components/countries-table'
import { CountriesDialogs } from './components/countries-dialogs'
import { CountriesPrimaryButtons } from './components/countries-primary-buttons'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

export function Countries() {
  return (
    <CountriesProvider>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Countries</h2>
            <p className='text-muted-foreground'>
              Manage your countries and their settings.
            </p>
          </div>
          <CountriesPrimaryButtons />
        </div>
        <CountriesTable />
      </Main>

      <CountriesDialogs />
    </CountriesProvider>
  )
}

export { CountriesProvider } from './components/countries-provider'
export { CountriesTable } from './components/countries-table'
export { CountriesDialogs } from './components/countries-dialogs'
