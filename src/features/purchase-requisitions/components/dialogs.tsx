import { RequisitionCreateDialog } from './create-dialog'
import { useRequisitionsContext } from './provider'
import { RequisitionViewDialog } from './view-dialog'

export function RequisitionsDialogs() {
  const { open, setOpen, currentRow } = useRequisitionsContext()

  return (
    <>
      <RequisitionCreateDialog
        open={open === 'create'}
        onOpenChange={(value) => setOpen(value ? 'create' : null)}
      />
      {currentRow ? (
        <RequisitionViewDialog
          requisition={currentRow}
          open={open === 'view'}
          onOpenChange={(value) => setOpen(value ? 'view' : null)}
        />
      ) : null}
    </>
  )
}
