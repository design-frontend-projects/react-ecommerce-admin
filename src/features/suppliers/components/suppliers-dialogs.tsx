import { SupplierActionDialog } from './supplier-action-dialog'
import { SupplierDeleteDialog } from './supplier-delete-dialog'
import { SupplierDetailsSheet } from './supplier-details-sheet'

export function SuppliersDialogs() {
  return (
    <>
      <SupplierActionDialog />
      <SupplierDeleteDialog />
      <SupplierDetailsSheet />
    </>
  )
}
