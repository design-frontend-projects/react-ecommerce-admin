import { useCurrenciesContext } from './currencies-provider'
import { CurrencyActionDialog } from './currency-action-dialog'
import { CurrencyDeleteDialog } from './currency-delete-dialog'

export function CurrenciesDialogs() {
  useCurrenciesContext()

  return (
    <>
      <CurrencyActionDialog />
      <CurrencyDeleteDialog />
    </>
  )
}
