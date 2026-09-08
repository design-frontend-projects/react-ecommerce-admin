import { PRActionDialog } from './pr-action-dialog'
import { PRSummaryDialog } from './pr-summary-dialog'
import { PRDeleteDialog } from './pr-delete-dialog'

export function RequisitionsDialogs() {
  return (
    <>
      <PRActionDialog />
      <PRSummaryDialog />
      <PRDeleteDialog />
    </>
  )
}
