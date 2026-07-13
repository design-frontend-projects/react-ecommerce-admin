import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
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
import { Can } from '@/components/rbac/Can'
import { useExpireBatches } from '../hooks/use-batches'

export function BatchesPrimaryButtons() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const expireBatches = useExpireBatches()

  return (
    <Can permission='inventory.manage'>
      <Button
        variant='outline'
        onClick={() => setConfirmOpen(true)}
        disabled={expireBatches.isPending}
      >
        <CalendarClock className='me-1 h-4 w-4' />
        Run expiry sweep
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run expiry sweep?</AlertDialogTitle>
            <AlertDialogDescription>
              Every active batch whose expiry date has passed will be marked as
              expired. This does not change stock balances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                expireBatches.mutate()
                setConfirmOpen(false)
              }}
            >
              Run sweep
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Can>
  )
}
