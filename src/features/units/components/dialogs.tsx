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
import { useDeleteUom } from '../hooks/use-uoms'
import { useUnitsContext } from './provider'
import { UomFormDialog } from './uom-form-dialog'

export function UnitsDialogs() {
  const { open, setOpen, currentRow } = useUnitsContext()
  const deleteUom = useDeleteUom()

  return (
    <>
      <UomFormDialog
        open={open === 'create'}
        onOpenChange={(value) => setOpen(value ? 'create' : null)}
        uom={null}
      />
      {currentRow ? (
        <>
          <UomFormDialog
            open={open === 'edit'}
            onOpenChange={(value) => setOpen(value ? 'edit' : null)}
            uom={currentRow}
          />
          <AlertDialog
            open={open === 'delete'}
            onOpenChange={(value) => setOpen(value ? 'delete' : null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete unit?</AlertDialogTitle>
                <AlertDialogDescription>
                  {currentRow.code} — {currentRow.name} will be permanently
                  deleted. Units referenced by products, variants, or
                  conversions cannot be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteUom.mutate(currentRow.id)
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
