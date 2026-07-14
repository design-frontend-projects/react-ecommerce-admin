import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeleteWarehouse } from '../hooks/use-warehouses'
import { WarehouseLocationsDialog } from './locations-dialog'
import { useWarehousesContext } from './provider'
import { WarehouseFormDialog } from './warehouse-form-dialog'

export function WarehousesDialogs() {
  const { open, setOpen, currentRow } = useWarehousesContext()
  const deleteWarehouse = useDeleteWarehouse()

  return (
    <>
      <WarehouseFormDialog
        open={open === 'create'}
        onOpenChange={(value) => setOpen(value ? 'create' : null)}
        warehouse={null}
      />
      {currentRow ? (
        <>
          <WarehouseFormDialog
            open={open === 'edit'}
            onOpenChange={(value) => setOpen(value ? 'edit' : null)}
            warehouse={currentRow}
          />
          <WarehouseLocationsDialog
            open={open === 'locations'}
            onOpenChange={(value) => setOpen(value ? 'locations' : null)}
            warehouse={currentRow}
          />
          <AlertDialog
            open={open === 'delete'}
            onOpenChange={(value) => setOpen(value ? 'delete' : null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete warehouse?</AlertDialogTitle>
                <AlertDialogDescription>
                  {currentRow.code} — {currentRow.name} will be permanently
                  deleted. Warehouses that still hold stock cannot be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteWarehouse.mutate(currentRow.id)
                    setOpen(null)
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </>
  )
}
