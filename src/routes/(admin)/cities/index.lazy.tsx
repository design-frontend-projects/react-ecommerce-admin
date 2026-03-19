import { createLazyFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { CitiesProvider, CitiesTable, CitiesDialogs } from '@/features/cities'
import { useCities } from '@/features/cities/hooks/use-cities'

export const Route = createLazyFileRoute('/(admin)/cities/')({
  component: CitiesPage,
})

function CitiesPage() {
  const { data: cities = [] } = useCities()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  return (
    <CitiesProvider>
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
            <h2 className='text-2xl font-bold tracking-tight'>Cities</h2>
            <p className='text-muted-foreground'>
              Manage your cities and their settings.
            </p>
          </div>
        </div>
        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <CitiesTable data={cities} search={search} navigate={navigate} />
        </div>
      </Main>

      <CitiesDialogs />
    </CitiesProvider>
  )
}
