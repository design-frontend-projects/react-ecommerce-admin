import { useBranchesContext } from './branches-provider'
import { BranchActionDialog } from './branch-action-dialog'
import { BranchDeleteDialog } from './branch-delete-dialog'

export function BranchesDialogs() {
  useBranchesContext()

  return (
    <>
      <BranchActionDialog />
      <BranchDeleteDialog />
    </>
  )
}
