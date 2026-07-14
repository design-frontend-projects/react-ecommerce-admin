import { BranchActionDialog } from './branch-action-dialog'
import { BranchDeleteDialog } from './branch-delete-dialog'
import { useBranchesContext } from './branches-provider'

export function BranchesDialogs() {
  useBranchesContext()

  return (
    <>
      <BranchActionDialog />
      <BranchDeleteDialog />
    </>
  )
}
