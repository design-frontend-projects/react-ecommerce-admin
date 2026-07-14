import { AdjustmentCreateDialog } from './create-dialog'
import { useAdjustmentsContext } from './provider'
import { AdjustmentViewDialog } from './view-dialog'

export function AdjustmentsDialogs() {
  const { open, setOpen, currentRow } = useAdjustmentsContext()

  return (
    <>
      <AdjustmentCreateDialog
        open={open === 'create'}
        onOpenChange={(value) => setOpen(value ? 'create' : null)}
      />
      {currentRow ? (
        <AdjustmentViewDialog
          adjustment={currentRow}
          open={open === 'view'}
          onOpenChange={(value) => setOpen(value ? 'view' : null)}
        />
      ) : null}
    </>
  )
}
