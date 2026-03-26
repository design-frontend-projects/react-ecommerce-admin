import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { CountriesProvider, useCountriesDialog } from './components/countries-provider'
import { CountriesTable } from './components/countries-table'
import { CountriesDialogs } from './components/countries-dialogs'
import { CountriesPrimaryButtons } from './components/countries-primary-buttons'

export default function Countries() {
  return (
    <CountriesProvider>
      <CountriesContent />
    </CountriesProvider>
  )
}

// Also export as named for existing route import
export { Countries }

function CountriesContent() {
  const { open, setOpen, currentRow, setCurrentRow } = useCountriesDialog()

  return (
    <>
      <Header>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <UserNav />
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

        <CountriesDialogs />
      </Main>
    </>
  )
}
