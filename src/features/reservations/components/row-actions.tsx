import { useState } from 'react'
import { Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Can } from '@/components/rbac/Can'
import type { ReservationListItem } from '../data/schema'
import { useReleaseReservation } from '../hooks/use-reservations'

export function ReservationRowActions({ row }: { row: ReservationListItem }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const releaseReservation = useReleaseReservation()

  if (row.status !== 'active') {
    return null
  }

  const remaining = row.qty - row.qty_consumed

  const handleRelease = async () => {
    try {
      await releaseReservation.mutateAsync(row.id)
      setConfirmOpen(false)
    } catch {
      setConfirmOpen(false)
    }
  }

  return (
    <Can permission='sales.manage'>
      <Button variant='ghost' size='sm' onClick={() => setConfirmOpen(true)}>
        <Unlock className='me-1 h-4 w-4' />
        Release
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive
        title='Release this reservation?'
        desc={`${remaining} unit(s) will return to available stock. The linked order line will no longer be reserved.`}
        confirmText='Release'
        isLoading={releaseReservation.isPending}
        handleConfirm={handleRelease}
      />
    </Can>
  )
}
