import { ReceiptCreateDialog } from './create-dialog'
import { useReceiptsContext } from './provider'
import { ReceiptViewDialog } from './view-dialog'

export function ReceiptsDialogs() {
  const { open, setOpen, currentRow } = useReceiptsContext()

  return (
    <>
      <ReceiptCreateDialog
        open={open === 'create'}
        onOpenChange={(value) => setOpen(value ? 'create' : null)}
      />
      {currentRow ? (
        <ReceiptViewDialog
          receipt={currentRow}
          open={open === 'view'}
          onOpenChange={(value) => setOpen(value ? 'view' : null)}
        />
      ) : null}
    </>
  )
}
