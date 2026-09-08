import { PriceListActionDialog } from './price-list-action-dialog'
import { PriceListDeleteDialog } from './price-list-delete-dialog'
import { PriceListViewDialog } from './price-list-view-dialog'

export function PriceListDialogs() {
  return (
    <>
      <PriceListActionDialog />
      <PriceListDeleteDialog />
      <PriceListViewDialog />
    </>
  )
}
