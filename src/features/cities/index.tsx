import { getRouteApi } from '@tanstack/react-router'
import { CitiesDialogProvider } from './components/cities-provider'
import { CitiesTable } from './components/cities-table'
import { CitiesDialogs } from './components/cities-dialogs'
import { CitiesPrimaryButtons } from './components/cities-primary-buttons'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useCities } from './hooks/use-cities'

const route = getRouteApi('/_authenticated/cities')

export function Cities() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data: cities = [], isLoading } = useCities()

  if (isLoading) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <p className='text-muted-foreground'>Loading cities...</p>
      </div>
    )
  }

  return (
    <CitiesDialogProvider>
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
            <h2 className='text-2xl font-bold tracking-tight'>Cities</h2>
            <p className='text-muted-foreground'>
              Manage your cities here.
            </p>
          </div>
          <CitiesPrimaryButtons />
        </div>
        <CitiesTable data={cities} search={search} navigate={navigate} />
      </Main>

      <CitiesDialogs />
    </CitiesDialogProvider>
  )
}
