import { POActionDialog } from './po-action-dialog'
import { POCancelDialog } from './po-cancel-dialog'
import { PODeleteDialog } from './po-delete-dialog'
import { POReceiveDialog } from './po-receive-dialog'
import { POSummaryDialog } from './po-summary-dialog'

export function PODialogs() {
  return (
    <>
      <POActionDialog />
      <POCancelDialog />
      <PODeleteDialog />
      <POReceiveDialog />
      <POSummaryDialog />
    </>
  )
}

