import { CountriesDialogProvider } from './components/countries-provider'

export function CountriesProvider({ children }: { children: React.ReactNode }) {
  return (
    <CountriesDialogProvider>{children}</CountriesDialogProvider>
  )
}

export {
  CountriesDialogProvider,
  useCountriesDialog,
} from './components/countries-provider'
export { CountriesTable, CountriesDialogs } from './components'
