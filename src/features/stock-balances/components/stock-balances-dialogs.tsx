import { AdjustmentDialog } from './adjustment-dialog'
import { useStockBalancesContext } from './stock-balances-provider'

export function StockBalancesDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } =
    useStockBalancesContext()

  return (
    <>
      <AdjustmentDialog
        key='stock-adjust'
        currentRow={currentRow}
        open={open === 'adjust'}
        onOpenChange={(v) => {
          setOpen(v ? 'adjust' : null)
          if (!v) setCurrentRow(null)
        }}
      />
    </>
  )
}
