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
import { useDeleteBrand } from '../hooks/use-brands'
import { BrandFormDialog } from './brand-form-dialog'
import { useBrandsContext } from './provider'

export function BrandsDialogs() {
  const { open, setOpen, currentRow } = useBrandsContext()
  const deleteBrand = useDeleteBrand()

  return (
    <>
      <BrandFormDialog
        open={open === 'create'}
        onOpenChange={(value) => setOpen(value ? 'create' : null)}
        brand={null}
      />
      {currentRow ? (
        <>
          <BrandFormDialog
            open={open === 'edit'}
            onOpenChange={(value) => setOpen(value ? 'edit' : null)}
            brand={currentRow}
          />
          <AlertDialog
            open={open === 'delete'}
            onOpenChange={(value) => setOpen(value ? 'delete' : null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete brand?</AlertDialogTitle>
                <AlertDialogDescription>
                  {currentRow.name} will be permanently deleted. Brands that
                  are still assigned to products cannot be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteBrand.mutate(currentRow.id)
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
