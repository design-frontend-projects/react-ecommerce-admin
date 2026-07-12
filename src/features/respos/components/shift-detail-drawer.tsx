// Shift detail dialog: cash summary, movements, and the audit timeline
// (original values → corrections chain) for admins (specs/026 FR-6/FR-7).
import { format } from 'date-fns'
import { History, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useShiftAudit, useShiftMovements } from '../api/shift-hooks'
import type { ShiftDto } from '../data/shift-schemas'
import { formatCurrency } from '../lib/formatters'
import { ShiftStatusBadge } from './shift-status-badge'

interface ShiftDetailDrawerProps {
  shift: ShiftDto | null
  onOpenChange: (open: boolean) => void
}

function money(value: string | null): string {
  return value === null ? '—' : formatCurrency(Number(value))
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className='space-y-0.5'>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p className='text-sm font-medium'>{value}</p>
    </div>
  )
}

export function ShiftDetailDrawer({
  shift,
  onOpenChange,
}: ShiftDetailDrawerProps) {
  const { t } = useTranslation()
  const { data: movements, isLoading: movementsLoading } = useShiftMovements(
    shift?.id ?? null
  )
  const { data: audit, isLoading: auditLoading } = useShiftAudit(shift?.id)

  if (!shift) return null

  return (
    <Dialog open={!!shift} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            {t('shifts.detail.title', 'Shift Details')}
            <ShiftStatusBadge shift={shift} />
          </DialogTitle>
          <DialogDescription>
            {shift.employeeName ?? '—'}
            {shift.branchName ? ` · ${shift.branchName}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
          <SummaryItem
            label={t('shifts.detail.openedAt', 'Opened at')}
            value={format(new Date(shift.openedAt), 'MMM d, yyyy HH:mm')}
          />
          <SummaryItem
            label={t('shifts.detail.closedAt', 'Closed at')}
            value={
              shift.closedAt
                ? format(new Date(shift.closedAt), 'MMM d, yyyy HH:mm')
                : '—'
            }
          />
          <SummaryItem
            label={t('shifts.detail.openingCash', 'Opening cash')}
            value={money(shift.openingCash)}
          />
          <SummaryItem
            label={t('shifts.detail.cashSales', 'Cash sales')}
            value={money(shift.cashSalesTotal)}
          />
          <SummaryItem
            label={t('shifts.detail.movementsIn', 'Paid in')}
            value={money(shift.movementsInTotal)}
          />
          <SummaryItem
            label={t('shifts.detail.movementsOut', 'Paid out')}
            value={money(shift.movementsOutTotal)}
          />
          <SummaryItem
            label={t('shifts.detail.expectedCash', 'Expected cash')}
            value={money(shift.expectedCash)}
          />
          <SummaryItem
            label={t('shifts.detail.closingCash', 'Counted cash')}
            value={money(shift.closingCash)}
          />
          <SummaryItem
            label={t('shifts.detail.variance', 'Variance')}
            value={money(shift.variance)}
          />
        </div>

        {shift.isCorrected && (
          <div className='rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400'>
            {t(
              'shifts.detail.correctedNote',
              'This shift was corrected. Original counted cash: {{closing}} · original variance: {{variance}}.',
              {
                closing: money(shift.originalClosingCash),
                variance: money(shift.originalVariance),
              }
            )}
          </div>
        )}

        {(shift.varianceComment || shift.closeReason) && (
          <div className='space-y-1 text-sm'>
            {shift.varianceComment && (
              <p>
                <span className='text-muted-foreground'>
                  {t('shifts.detail.comment', 'Comment')}:
                </span>{' '}
                {shift.varianceComment}
              </p>
            )}
            {shift.closeReason && (
              <p>
                <span className='text-muted-foreground'>
                  {t('shifts.detail.closeReason', 'Close reason')}:
                </span>{' '}
                {shift.closeReason}
              </p>
            )}
          </div>
        )}

        <Separator />

        <div className='space-y-2'>
          <h4 className='text-sm font-semibold'>
            {t('shifts.detail.movements', 'Cash Movements')}
          </h4>
          {movementsLoading ? (
            <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
          ) : !movements || movements.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              {t('shifts.detail.noMovements', 'No cash movements recorded.')}
            </p>
          ) : (
            <ul className='space-y-1'>
              {movements.map((movement) => (
                <li
                  key={movement.id}
                  className='flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-sm'
                >
                  <span>
                    <Badge
                      variant='outline'
                      className={
                        movement.movementType === 'in'
                          ? 'border-green-500/40 text-green-600 dark:text-green-400'
                          : 'border-red-500/40 text-red-600 dark:text-red-400'
                      }
                    >
                      {movement.movementType === 'in'
                        ? t('shifts.movement.paidIn', 'Paid In')
                        : t('shifts.movement.paidOut', 'Paid Out')}
                    </Badge>{' '}
                    <span className='text-muted-foreground'>
                      {movement.reason.replace('_', ' ')}
                    </span>
                    {movement.note ? ` — ${movement.note}` : ''}
                  </span>
                  <span className='font-medium'>
                    {movement.movementType === 'in' ? '+' : '-'}
                    {formatCurrency(Number(movement.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Separator />

        <div className='space-y-2'>
          <h4 className='flex items-center gap-2 text-sm font-semibold'>
            <History className='h-4 w-4 text-muted-foreground' />
            {t('shifts.detail.audit', 'Audit Trail')}
          </h4>
          {auditLoading ? (
            <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
          ) : !audit || audit.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              {t('shifts.detail.noAudit', 'No audit entries.')}
            </p>
          ) : (
            <ol className='space-y-2 border-s ps-4'>
              {audit.map((entry) => (
                <li key={entry.id} className='text-sm'>
                  <p className='font-medium capitalize'>
                    {entry.action.replace('_', ' ')}
                    <span className='ms-2 text-xs font-normal text-muted-foreground'>
                      {format(new Date(entry.createdAt), 'MMM d, yyyy HH:mm')}
                    </span>
                  </p>
                  {entry.reason && (
                    <p className='text-muted-foreground'>{entry.reason}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
