import { getRouteApi } from '@tanstack/react-router'
import { CitiesDialogProvider } from './components/cities-provider'
import { CitiesTable } from './components/cities-table'
import { CitiesDialogs } from './components/cities-dialogs'
import { CitiesPrimaryButtons } from './components/cities-primary-buttons'
import { useCities } from './hooks/use-cities'

const route = getRouteApi('/_authenticated/cities/')

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
      <div className='flex flex-col gap-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Cities</h2>
            <p className='text-muted-foreground'>
              Manage your cities here.
            </p>
          </div>
          <CitiesPrimaryButtons />
        </div>
        <CitiesTable data={cities} search={search} navigate={navigate} />
        <CitiesDialogs />
      </div>
    </CitiesDialogProvider>
  )
}
