import { CountriesProvider } from './components/countries-provider'
import { CountriesTable } from './components/countries-table'
import { CountriesDialogs } from './components/countries-dialogs'
import { CountriesPrimaryButtons } from './components/countries-primary-buttons'
import { useCountries } from './hooks/use-countries'

export function Countries() {
  const { isLoading } = useCountries()

  if (isLoading) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <p className='text-muted-foreground'>Loading countries...</p>
      </div>
    )
  }

  return (
    <CountriesProvider>
      <div className='flex flex-col gap-4'>
        <div className='flex items-center justify-between'>
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
      </div>
    </CountriesProvider>
  )
}

// Re-export components for external consumers (e.g., (admin) route)
export { CountriesProvider } from './components/countries-provider'
export { CountriesTable } from './components/countries-table'
export { CountriesDialogs } from './components/countries-dialogs'
