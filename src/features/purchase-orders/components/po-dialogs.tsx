import { POActionDialog } from './po-action-dialog'
import { PODeleteDialog } from './po-delete-dialog'
import { POReceiveDialog } from './po-receive-dialog'

export function PODialogs() {
  return (
    <>
      <POActionDialog />
      <PODeleteDialog />
      <POReceiveDialog />
    </>
  )
}
