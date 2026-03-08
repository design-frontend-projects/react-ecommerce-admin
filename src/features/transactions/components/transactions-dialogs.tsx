import { TransactionActionDialog } from './transaction-action-dialog'
import { useTransactionsContext } from './transactions-provider'

export function TransactionsDialogs() {
  const { open, setOpen, currentRow } = useTransactionsContext()

  return (
    <>
      <TransactionActionDialog
        key='transaction-add'
        open={open === 'add'}
        onOpenChange={() => setOpen(null)}
      />
      {currentRow && (
        <TransactionActionDialog
          key={`transaction-view-${currentRow.id}`}
          open={open === 'view'}
          onOpenChange={() => setOpen(null)}
          currentRow={currentRow}
        />
      )}
    </>
  )
}
