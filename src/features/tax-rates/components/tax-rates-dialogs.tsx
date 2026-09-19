import { TaxActionDialog } from './tax-rate-action-dialog'
import { TaxDeleteDialog } from './tax-rate-delete-dialog'
import { TaxRateBulkDeleteDialog } from './tax-rate-bulk-delete-dialog'
import { TaxRateViewSheet } from './tax-rate-view-sheet'
import { TaxRatesCalculatorDialog } from './tax-rates-calculator-dialog'

export function TaxDialogs() {
  return (
    <>
      <TaxActionDialog />
      <TaxDeleteDialog />
      <TaxRateBulkDeleteDialog />
      <TaxRateViewSheet />
      <TaxRatesCalculatorDialog />
    </>
  )
}
