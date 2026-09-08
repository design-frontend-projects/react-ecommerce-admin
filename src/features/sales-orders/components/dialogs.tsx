import { OrderCreateDialog } from './create-dialog'
import { useOrdersContext } from './provider'
import { OrderViewDialog } from './view-dialog'
import { SalesOrderReviewDialog } from './review-dialog'

export function OrdersDialogs() {
  const { open, setOpen, currentRow } = useOrdersContext()

  return (
    <>
      <OrderCreateDialog
        open={open === 'create'}
        onOpenChange={(value) => setOpen(value ? 'create' : null)}
      />

      {currentRow ? (
        <>
          <OrderViewDialog
            order={currentRow}
            open={open === 'view'}
            onOpenChange={(value) => setOpen(value ? 'view' : null)}
          />

          <SalesOrderReviewDialog
            open={open === 'review'}
            onOpenChange={(value) => setOpen(value ? 'review' : null)}
          />
        </>
      ) : null}
    </>
  )
}
