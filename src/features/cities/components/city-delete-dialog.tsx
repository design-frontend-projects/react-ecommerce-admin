import { useCitiesContext } from './cities-provider'
import { useDeleteCity } from '../hooks/use-cities'
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
import { Button } from '@/components/ui/button'

export function CityDeleteDialog() {
  const { isOpen, action, close, selectedCity } = useCitiesContext()
  const deleteCity = useDeleteCity()

  const isDeleteOpen = isOpen && action === 'delete'

  const onDelete = async () => {
    if (!selectedCity) return

    try {
      await deleteCity.mutateAsync(selectedCity.id)
      close()
    } catch (error) {
      console.error('Failed to delete city:', error)
    }
  }

  return (
    <AlertDialog open={isDeleteOpen} onOpenChange={(open) => !open && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the city
            "{selectedCity?.name}" from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={close}>Cancel</AlertDialogCancel>
          <Button
            variant='destructive'
            onClick={onDelete}
            disabled={deleteCity.isPending}
            className='bg-red-600 hover:bg-red-700'
          >
            {deleteCity.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
