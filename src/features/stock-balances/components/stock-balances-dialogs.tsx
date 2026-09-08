import { AdjustmentDialog } from './adjustment-dialog'
import { StockMovementDrawer } from './stock-movement-drawer'
import { useStockBalancesContext } from './stock-balances-provider'

export function StockBalancesDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useStockBalancesContext()

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

      <StockMovementDrawer
        key='stock-movements'
        currentRow={currentRow}
        open={open === 'movements'}
        onOpenChange={(v) => {
          setOpen(v ? 'movements' : null)
          if (!v) setCurrentRow(null)
        }}
      />
    </>
  )
}
