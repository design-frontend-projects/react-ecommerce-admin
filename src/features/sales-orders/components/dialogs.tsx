import { OrderCreateDialog } from './create-dialog'
import { OrderViewDialog } from './view-dialog'
import { useOrdersContext } from './provider'

export function OrdersDialogs() {
  const { open, setOpen, currentRow } = useOrdersContext()

  return (
    <>
      <OrderCreateDialog
        open={open === 'create'}
        onOpenChange={(value) => setOpen(value ? 'create' : null)}
      />
      {currentRow ? (
        <OrderViewDialog
          order={currentRow}
          open={open === 'view'}
          onOpenChange={(value) => setOpen(value ? 'view' : null)}
        />
      ) : null}
    </>
  )
}
