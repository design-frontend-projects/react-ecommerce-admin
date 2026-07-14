import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SerialListItem } from '../data/schema'
import { useSerialTrail } from '../hooks/use-serials'

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SerialTrailDialog({
  open,
  onOpenChange,
  serial,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serial: SerialListItem | null
}) {
  const {
    data: entries,
    isLoading,
    error,
  } = useSerialTrail(open && serial ? serial.id : null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            Movement trail
            {serial ? (
              <span className='ms-2 font-mono text-base font-normal text-muted-foreground'>
                {serial.serial_number}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            Every inventory movement this serial number participated in, oldest
            first.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className='flex min-h-[160px] items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        ) : error ? (
          <p className='py-8 text-center text-rose-500'>
            Error loading the movement trail.
          </p>
        ) : (
          <ScrollArea className='max-h-[60vh]'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Movement</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>In</TableHead>
                  <TableHead>Out</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries && entries.length > 0 ? (
                  entries.map((entry) => {
                    const movement = entry.inventory_movements
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Badge variant='outline'>
                            {movement.movement_type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDateTime(movement.movement_date)}
                        </TableCell>
                        <TableCell>{movement.qty_in}</TableCell>
                        <TableCell>{movement.qty_out}</TableCell>
                        <TableCell>
                          {movement.reference_type
                            ? `${movement.reference_type}${
                                movement.reference_id
                                  ? ` (${movement.reference_id.slice(0, 8)})`
                                  : ''
                              }`
                            : '—'}
                        </TableCell>
                        <TableCell>{movement.remarks ?? '—'}</TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className='h-24 text-center'>
                      No movements recorded for this serial yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
