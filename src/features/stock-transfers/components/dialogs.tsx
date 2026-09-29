import { TransferCreateDialog } from './create-dialog'
import { useTransfersContext } from './provider'
import { TransferViewDialog } from './view-dialog'

export function TransfersDialogs() {
  const { open, setOpen, currentRow } = useTransfersContext()

  return (
    <>
      <TransferCreateDialog
        open={open === 'create' || open === 'edit'}
        onOpenChange={(value) => setOpen(value ? open : null)}
        transferToEdit={open === 'edit' ? currentRow : null}
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
