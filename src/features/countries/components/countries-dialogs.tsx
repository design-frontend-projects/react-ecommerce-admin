import { useCountriesContext } from './countries-provider'
import { CountryActionDialog } from './country-action-dialog'
import { CountryDeleteDialog } from './country-delete-dialog'

export function CountriesDialogs() {
  useCountriesContext()

  return (
    <>
      <CountryActionDialog />
      <CountryDeleteDialog />
    </>
  )
}
