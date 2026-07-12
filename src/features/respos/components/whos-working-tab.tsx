// "Who's working now" live view (specs/026 FR-4): all open shifts with
// elapsed time and stale badges, refreshed by polling + the res_shifts
// realtime subscription, with quick force-close for admins.
import { useState } from 'react'
import { format } from 'date-fns'
import { Loader2, Users, XOctagon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useActiveShiftsAll } from '../api/shift-hooks'
import type { ShiftDto } from '../data/shift-schemas'
import { formatCurrency } from '../lib/formatters'
import { ForceCloseDialog } from './force-close-dialog'
import { ShiftStatusBadge } from './shift-status-badge'

function formatElapsed(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`
}

export function WhosWorkingTab({
  branchId,
  canManage,
}: {
  branchId?: string
  canManage: boolean
}) {
  const { t } = useTranslation()
  const { data: shifts, isLoading } = useActiveShiftsAll(branchId)
  const [forceCloseTarget, setForceCloseTarget] = useState<ShiftDto | null>(
    null
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Users className='h-5 w-5 text-muted-foreground' />
          {t('shifts.live.title', "Who's Working Now")}
        </CardTitle>
        <CardDescription>
          {t(
            'shifts.live.desc',
            'All currently open shifts, updated in real time.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='flex justify-center py-12'>
            <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
          </div>
        ) : !shifts || shifts.length === 0 ? (
          <p className='py-12 text-center text-sm text-muted-foreground'>
            {t('shifts.live.empty', 'No open shifts right now.')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('shifts.table.employee', 'Employee')}</TableHead>
                <TableHead>{t('shifts.table.branch', 'Branch')}</TableHead>
                <TableHead>{t('shifts.table.status', 'Status')}</TableHead>
                <TableHead>{t('shifts.table.openedAt', 'Opened')}</TableHead>
                <TableHead>{t('shifts.live.elapsed', 'Elapsed')}</TableHead>
                <TableHead className='text-right'>
                  {t('shifts.table.opening', 'Opening')}
                </TableHead>
                {canManage && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => {
                // Server-computed; refreshed by the 60s poll + realtime.
                const elapsedMinutes = shift.elapsedMinutes
                return (
                  <TableRow key={shift.id}>
                    <TableCell className='font-medium'>
                      {shift.employeeName ?? '—'}
                    </TableCell>
                    <TableCell>{shift.branchName ?? '—'}</TableCell>
                    <TableCell>
                      <ShiftStatusBadge shift={shift} />
                    </TableCell>
                    <TableCell>
                      {format(new Date(shift.openedAt), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell>{formatElapsed(elapsedMinutes)}</TableCell>
                    <TableCell className='text-right'>
                      {formatCurrency(Number(shift.openingCash))}
                    </TableCell>
                    {canManage && (
                      <TableCell className='text-right'>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='gap-1 text-destructive'
                          onClick={() => setForceCloseTarget(shift)}
                        >
                          <XOctagon className='h-4 w-4' />
                          {t('shifts.actions.forceClose', 'Force-close')}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <ForceCloseDialog
        shift={forceCloseTarget}
        onOpenChange={(open) => {
          if (!open) setForceCloseTarget(null)
        }}
      />
    </Card>
  )
}
