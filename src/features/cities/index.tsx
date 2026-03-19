import { CitiesDialogProvider } from './components/cities-provider'
import { CitiesDataProvider } from './context/cities-context'

export function CitiesProvider({ children }: { children: React.ReactNode }) {
  return (
    <CitiesDataProvider>
      <CitiesDialogProvider>{children}</CitiesDialogProvider>
    </CitiesDataProvider>
  )
}

export { CitiesDataProvider, useCitiesData } from './context/cities-context'
export {
  CitiesDialogProvider,
  useCitiesDialog,
} from './components/cities-provider'
export { CitiesTable, CitiesDialogs } from './components'
