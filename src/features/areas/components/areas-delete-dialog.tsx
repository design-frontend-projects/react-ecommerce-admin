import { toast } from 'sonner'
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
import { type Area } from '../data/schema'
import { useDeleteArea } from '../hooks/use-areas'

type AreasDeleteDialogProps = {
  currentRow: Area | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AreasDeleteDialog({
  currentRow,
  open,
  onOpenChange,
}: AreasDeleteDialogProps) {
  const deleteArea = useDeleteArea()

  const onDelete = () => {
    if (!currentRow) return
    deleteArea.mutate(currentRow.id, {
      onSuccess: () => {
        toast.success('Area deleted successfully', {
          description: `Area ${currentRow.name} has been deleted.`,
        })
        onOpenChange(false)
      },
      onError: (error) => {
        toast.error('Failed to delete area', {
          description: error.message,
        })
      },
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            area <strong>{currentRow?.name}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            disabled={deleteArea.isPending}
          >
            {deleteArea.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
