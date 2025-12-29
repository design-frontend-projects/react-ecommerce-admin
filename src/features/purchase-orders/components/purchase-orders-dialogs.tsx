import { POActionDialog } from './purchase-order-action-dialog'
import { PODeleteDialog } from './purchase-order-delete-dialog'
import { POItemsDialog } from './purchase-order-items-dialog'

export function PODialogs() {
  return (
    <>
      <POActionDialog />
      <PODeleteDialog />
      <POItemsDialog />
    </>
  )
}
