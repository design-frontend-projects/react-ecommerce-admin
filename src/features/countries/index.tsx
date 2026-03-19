import { CountriesDialogProvider } from './components/countries-provider'
import { CountriesDataProvider } from './context/countries-context'

export function CountriesProvider({ children }: { children: React.ReactNode }) {
  return (
    <CountriesDataProvider>
      <CountriesDialogProvider>{children}</CountriesDialogProvider>
    </CountriesDataProvider>
  )
}

export {
  CountriesDataProvider,
  useCountriesData,
} from './context/countries-context'
export {
  CountriesDialogProvider,
  useCountriesDialog,
} from './components/countries-provider'
export { CountriesTable, CountriesDialogs } from './components'
