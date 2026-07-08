import { TransferCreateDialog } from './create-dialog'
import { TransferViewDialog } from './view-dialog'
import { useTransfersContext } from './provider'

export function TransfersDialogs() {
  const { open, setOpen, currentRow } = useTransfersContext()

  return (
    <>
      <TransferCreateDialog
        open={open === 'create'}
        onOpenChange={(value) => setOpen(value ? 'create' : null)}
      />
      {currentRow ? (
        <TransferViewDialog
          transfer={currentRow}
          open={open === 'view'}
          onOpenChange={(value) => setOpen(value ? 'view' : null)}
        />
      ) : null}
    </>
  )
}
