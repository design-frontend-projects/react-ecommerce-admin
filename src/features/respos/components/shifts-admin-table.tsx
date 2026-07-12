// Admin "All Shifts" tab: search/filter/paginate every shift, with
// force-close / correction / review actions and the detail drawer
// (specs/026 FR-6).
import { useState } from 'react'
import { format } from 'date-fns'
import {
  Eye,
  Loader2,
  MoreHorizontal,
  PencilLine,
  Settings2,
  ShieldCheck,
  XOctagon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAllShifts, useReviewShift } from '../api/shift-hooks'
import type { ListShiftsQuery, ShiftDto } from '../data/shift-schemas'
import { formatCurrency } from '../lib/formatters'
import { ForceCloseDialog } from './force-close-dialog'
import { ShiftCorrectionDialog } from './shift-correction-dialog'
import { ShiftDetailDrawer } from './shift-detail-drawer'
import { ShiftSettingsDialog } from './shift-settings-dialog'
import { ShiftStatusBadge } from './shift-status-badge'

const PAGE_SIZE = 25

function money(value: string | null): string {
  return value === null ? '—' : formatCurrency(Number(value))
}

export function ShiftsAdminTable({
  restaurantId,
}: {
  restaurantId?: string | null
}) {
  const { t } = useTranslation()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [detailShift, setDetailShift] = useState<ShiftDto | null>(null)
  const [forceCloseShift, setForceCloseShift] = useState<ShiftDto | null>(null)
  const [correctionShift, setCorrectionShift] = useState<ShiftDto | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const query: Partial<ListShiftsQuery> = {
    page,
    pageSize: PAGE_SIZE,
    ...(statusFilter !== 'all'
      ? { status: statusFilter as ListShiftsQuery['status'] }
      : {}),
    ...(needsReviewOnly ? { needsReview: true } : {}),
  }

  const { data, isLoading } = useAllShifts(query)
  const reviewShift = useReviewShift()

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  const handleReview = async (shift: ShiftDto) => {
    try {
      await reviewShift.mutateAsync(shift.id)
      toast.success(t('shifts.review.success', 'Shift marked as reviewed'))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('shifts.review.error', 'Unable to mark shift as reviewed')
      )
    }
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-4'>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value)
            setPage(1)
          }}
        >
          <SelectTrigger className='w-44'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>
              {t('shifts.filters.allStatuses', 'All statuses')}
            </SelectItem>
            <SelectItem value='open'>
              {t('shifts.status.open', 'Open')}
            </SelectItem>
            <SelectItem value='closed'>
              {t('shifts.status.closed', 'Closed')}
            </SelectItem>
            <SelectItem value='force_closed'>
              {t('shifts.status.forceClosed', 'Force-closed')}
            </SelectItem>
            <SelectItem value='auto_closed'>
              {t('shifts.status.autoClosed', 'Auto-closed')}
            </SelectItem>
          </SelectContent>
        </Select>

        <label className='flex items-center gap-2 text-sm'>
          <Switch
            checked={needsReviewOnly}
            onCheckedChange={(checked) => {
              setNeedsReviewOnly(checked)
              setPage(1)
            }}
          />
          {t('shifts.filters.needsReview', 'Needs review only')}
        </label>

        <Button
          variant='outline'
          size='sm'
          className='ms-auto gap-2'
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 className='h-4 w-4' />
          {t('shifts.settings.title', 'Shift Settings')}
        </Button>
      </div>

      {isLoading ? (
        <div className='flex justify-center py-12'>
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      ) : !data || data.shifts.length === 0 ? (
        <p className='py-12 text-center text-sm text-muted-foreground'>
          {t(
            'shifts.filters.noResults',
            'No shifts match the current filters.'
          )}
        </p>
      ) : (
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('shifts.table.status', 'Status')}</TableHead>
                <TableHead>{t('shifts.table.employee', 'Employee')}</TableHead>
                <TableHead>{t('shifts.table.branch', 'Branch')}</TableHead>
                <TableHead>{t('shifts.table.openedAt', 'Opened')}</TableHead>
                <TableHead>{t('shifts.table.closedAt', 'Closed')}</TableHead>
                <TableHead className='text-right'>
                  {t('shifts.table.opening', 'Opening')}
                </TableHead>
                <TableHead className='text-right'>
                  {t('shifts.table.expected', 'Expected')}
                </TableHead>
                <TableHead className='text-right'>
                  {t('shifts.table.counted', 'Counted')}
                </TableHead>
                <TableHead className='text-right'>
                  {t('shifts.table.variance', 'Variance')}
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.shifts.map((shift) => {
                const varianceValue =
                  shift.variance === null ? null : Number(shift.variance)
                return (
                  <TableRow key={shift.id}>
                    <TableCell>
                      <ShiftStatusBadge shift={shift} />
                    </TableCell>
                    <TableCell>{shift.employeeName ?? '—'}</TableCell>
                    <TableCell>{shift.branchName ?? '—'}</TableCell>
                    <TableCell>
                      {format(new Date(shift.openedAt), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell>
                      {shift.closedAt
                        ? format(new Date(shift.closedAt), 'MMM d, HH:mm')
                        : '—'}
                    </TableCell>
                    <TableCell className='text-right'>
                      {money(shift.openingCash)}
                    </TableCell>
                    <TableCell className='text-right'>
                      {money(shift.expectedCash)}
                    </TableCell>
                    <TableCell className='text-right'>
                      {money(shift.closingCash)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        varianceValue === null
                          ? ''
                          : varianceValue < 0
                            ? 'text-red-600 dark:text-red-400'
                            : varianceValue > 0
                              ? 'text-green-600 dark:text-green-400'
                              : ''
                      }`}
                    >
                      {money(shift.variance)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='icon'>
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem
                            onClick={() => setDetailShift(shift)}
                          >
                            <Eye className='me-2 h-4 w-4' />
                            {t('shifts.actions.view', 'View details')}
                          </DropdownMenuItem>
                          {shift.status === 'open' && (
                            <DropdownMenuItem
                              onClick={() => setForceCloseShift(shift)}
                              className='text-destructive'
                            >
                              <XOctagon className='me-2 h-4 w-4' />
                              {t('shifts.actions.forceClose', 'Force-close')}
                            </DropdownMenuItem>
                          )}
                          {shift.status !== 'open' && (
                            <DropdownMenuItem
                              onClick={() => setCorrectionShift(shift)}
                            >
                              <PencilLine className='me-2 h-4 w-4' />
                              {t('shifts.actions.correct', 'Correct amounts')}
                            </DropdownMenuItem>
                          )}
                          {shift.needsReview && (
                            <DropdownMenuItem
                              onClick={() => void handleReview(shift)}
                            >
                              <ShieldCheck className='me-2 h-4 w-4' />
                              {t('shifts.actions.review', 'Mark reviewed')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {data && data.total > PAGE_SIZE && (
        <div className='flex items-center justify-between'>
          <p className='text-sm text-muted-foreground'>
            {t('shifts.pagination', 'Page {{page}} of {{total}}', {
              page,
              total: totalPages,
            })}
          </p>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              {t('common.previous', 'Previous')}
            </Button>
            <Button
              variant='outline'
              size='sm'
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              {t('common.next', 'Next')}
            </Button>
          </div>
        </div>
      )}

      <ShiftDetailDrawer
        shift={detailShift}
        onOpenChange={(open) => {
          if (!open) setDetailShift(null)
        }}
      />
      <ForceCloseDialog
        shift={forceCloseShift}
        onOpenChange={(open) => {
          if (!open) setForceCloseShift(null)
        }}
      />
      <ShiftCorrectionDialog
        shift={correctionShift}
        onOpenChange={(open) => {
          if (!open) setCorrectionShift(null)
        }}
      />
      <ShiftSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        restaurantId={restaurantId}
      />
    </div>
  )
}
