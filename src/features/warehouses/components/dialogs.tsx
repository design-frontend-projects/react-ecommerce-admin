import { WarehouseActionDialog } from './warehouse-action-dialog'
import { WarehouseDeleteDialog } from './warehouse-delete-dialog'
import { WarehouseLocationsDialog } from './locations-dialog'
import { useWarehousesContext } from './provider'

export function WarehousesDialogs() {
  const { open, setOpen, currentRow } = useWarehousesContext()

  return (
    <>
      <WarehouseActionDialog />
      <WarehouseDeleteDialog />
      {currentRow && (
        <WarehouseLocationsDialog
          open={open === 'locations'}
          onOpenChange={(value) => setOpen(value ? 'locations' : null)}
          warehouse={currentRow}
        />
      )}
    </>
  )
}
