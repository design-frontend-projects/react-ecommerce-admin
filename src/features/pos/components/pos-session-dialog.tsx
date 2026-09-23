import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Lock,
  Unlock,
  AlertTriangle,
  Printer,
  DollarSign,
  Receipt,
  CreditCard,
  Clock,
  CheckCircle2,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { usePosStore } from '../store/use-pos-store'
import {
  useOpenSessionMutation,
  useCloseSessionMutation,
  usePosSessionSummary,
} from '../hooks/use-pos-queries'

interface PosSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'open' | 'close'
  onSuccess?: () => void
}

export function PosSessionDialog({
  open,
  onOpenChange,
  mode,
  onSuccess,
}: PosSessionDialogProps) {
  const { t } = useTranslation()
  const { terminal, session, setSession } = usePosStore()
  const [openingCash, setOpeningCash] = useState<string>('0')
  const [actualCash, setActualCash] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const openMutation = useOpenSessionMutation()
  const closeMutation = useCloseSessionMutation()

  const { data: summary, isLoading: isLoadingSummary } = usePosSessionSummary(
    mode === 'close' ? session?.id : undefined
  )

  useEffect(() => {
    if (open) {
      setOpeningCash('0')
      setActualCash('')
      setNotes('')
    }
  }, [open, mode])

  const expectedCash = summary
    ? Number(summary.expectedCash ?? 0)
    : 0

  // Automatically fill Counted Cash with collected expected amount when summary loads
  useEffect(() => {
    if (open && mode === 'close' && summary != null && actualCash === '') {
      const exp = Number(summary.expectedCash ?? 0)
      setActualCash(exp.toFixed(2))
    }
  }, [open, mode, summary, actualCash])

  const countedCashNumber = Number(actualCash) || 0
  const discrepancy = Math.round((countedCashNumber - expectedCash) * 100) / 100

  const handleOpenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!terminal?.id) {
      toast.error(t('pos.session.noTerminalSelected', 'No terminal selected'))
      return
    }

    try {
      const res = await openMutation.mutateAsync({
        terminalId: terminal.id,
        openingCash: Number(openingCash) || 0,
        notes: notes.trim() || undefined,
      })

      setSession({
        id: res.session.id,
        status: 'open',
        openedAt: res.session.opened_at,
        openingCash: Number(res.session.opening_cash || 0),
        cashierName: res.session.cashier_name || 'Cashier',
      })

      toast.success(
        t('pos.session.shiftOpenedToast', 'POS Register session opened successfully!')
      )
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error(err.message || t('pos.session.failedOpen', 'Failed to open session'))
    }
  }

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.id) {
      toast.error(t('pos.session.noActiveSession', 'No active session to close'))
      return
    }

    if (actualCash === '') {
      toast.error(
        t('pos.session.enterCountedCash', 'Please enter the counted cash amount')
      )
      return
    }

    try {
      await closeMutation.mutateAsync({
        sessionId: session.id,
        actualCash: countedCashNumber,
        notes: notes.trim() || undefined,
      })

      setSession(null)
      toast.success(
        t('pos.session.shiftClosedToast', 'POS Session closed successfully!')
      )
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error(err.message || t('pos.session.failedClose', 'Failed to close session'))
    }
  }

  const printZReport = () => {
    if (!summary) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const openedTimeStr = summary.shiftTimeframe?.openedAt
      ? new Date(summary.shiftTimeframe.openedAt).toLocaleString()
      : session?.openedAt
      ? new Date(session.openedAt).toLocaleString()
      : 'N/A'

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Z-Report - Session Closing</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: monospace; width: 78mm; padding: 10px; font-size: 12px; margin: 0 auto; color: #111; }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center">
            <h2 style="margin: 0; font-size: 16px;">Z-REPORT (SHIFT CLOSE)</h2>
            <p style="margin: 2px 0;">Terminal: ${terminal?.code || 'POS-01'}</p>
            <p style="margin: 2px 0;">Cashier: ${session?.cashierName || 'Cashier'}</p>
            <p style="margin: 2px 0;">Shift Opened: ${openedTimeStr}</p>
            <p style="margin: 2px 0;">Closed At: ${new Date().toLocaleString()}</p>
          </div>
          <div class="divider"></div>
          <div class="row"><span>Opening Float:</span><span>${formatCurrency(summary.openingCash)}</span></div>
          <div class="row"><span>Cash Sales:</span><span>${formatCurrency(summary.cashSales)}</span></div>
          <div class="row"><span>Card Sales:</span><span>${formatCurrency(summary.cardSales)}</span></div>
          ${Number(summary.otherSales || 0) > 0 ? `<div class="row"><span>Other Payments:</span><span>${formatCurrency(summary.otherSales)}</span></div>` : ''}
          <div class="row"><span>Total Shift Sales:</span><span>${formatCurrency(summary.totalSales)}</span></div>
          <div class="row"><span>Invoices / Orders:</span><span>${summary.invoicesCount || summary.ordersCount || 0}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Cash In (Paid In):</span><span>+${formatCurrency(summary.cashIn)}</span></div>
          <div class="row"><span>Cash Out (Paid Out):</span><span>-${formatCurrency(summary.cashOut)}</span></div>
          <div class="row"><span>Cash Refunds:</span><span>-${formatCurrency(summary.cashRefunds)}</span></div>
          <div class="divider"></div>
          <div class="row bold"><span>Expected Drawer Cash:</span><span>${formatCurrency(expectedCash)}</span></div>
          <div class="row bold"><span>Actual Counted Cash:</span><span>${formatCurrency(countedCashNumber)}</span></div>
          <div class="row bold" style="color: ${discrepancy < 0 ? '#b00' : discrepancy > 0 ? '#b70' : '#080'};">
            <span>Discrepancy:</span><span>${discrepancy > 0 ? '+' : ''}${formatCurrency(discrepancy)}</span>
          </div>
          <div class="divider"></div>
          <div class="center"><p style="margin: 4px 0; font-size: 10px;">Audit Record Generated Automatically</p></div>
          <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };</script>
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            {mode === 'open' ? (
              <Unlock className='h-5 w-5 text-emerald-500' />
            ) : (
              <Lock className='h-5 w-5 text-amber-500' />
            )}
            <DialogTitle>
              {mode === 'open'
                ? t('pos.session.openTitle', 'Open Register Session')
                : t('pos.session.closeTitle', 'Close Shift & Reconcile Cash')}
            </DialogTitle>
          </div>
          <DialogDescription>
            {mode === 'open'
              ? `${t('pos.session.openDesc', 'Open a new till session on terminal')} ${terminal?.name || terminal?.code || ''}`
              : `${t('pos.session.closeDesc', 'Count physical cash in the drawer and reconcile before closing this shift.')} ${terminal?.code || ''}`}
          </DialogDescription>
        </DialogHeader>

        {mode === 'open' ? (
          <form onSubmit={handleOpenSubmit} className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label htmlFor='openingCash'>
                {t('pos.session.openingCashFloat', 'Opening Cash Float')}
              </Label>
              <div className='relative'>
                <DollarSign className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  id='openingCash'
                  type='number'
                  step='0.01'
                  min='0'
                  className='pl-9'
                  placeholder='0.00'
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <p className='text-xs text-muted-foreground'>
                {t(
                  'pos.session.openingHelp',
                  'Counted starting cash placed into the drawer at the start of your shift.'
                )}
              </p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='openNotes'>
                {t('pos.session.notes', 'Shift Notes (Optional)')}
              </Label>
              <Textarea
                id='openNotes'
                placeholder={t(
                  'pos.session.notesPlaceholder',
                  'Any notes regarding till condition or shift handover...'
                )}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter className='gap-2 sm:gap-0 pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
              >
                {t('pos.session.cancel', 'Cancel')}
              </Button>
              <Button
                type='submit'
                disabled={openMutation.isPending}
                className='gap-2 bg-emerald-600 hover:bg-emerald-700 text-white'
              >
                <Unlock className='h-4 w-4' />
                {openMutation.isPending
                  ? t('pos.session.opening', 'Opening...')
                  : t('pos.session.openShiftBtn', 'Open Shift')}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleCloseSubmit} className='space-y-4 py-2'>
            {isLoadingSummary ? (
              <div className='py-8 text-center text-sm text-muted-foreground'>
                {t('pos.session.calculating', 'Calculating session metrics...')}
              </div>
            ) : (
              <>
                {/* Shift Timeframe & Metadata Banner */}
                {summary?.shiftTimeframe && (
                  <div className='flex items-center justify-between text-xs rounded-md bg-muted/40 px-3 py-2 border border-border/50 text-muted-foreground'>
                    <div className='flex items-center gap-1.5'>
                      <Clock className='h-3.5 w-3.5 text-primary' />
                      <span>
                        {t('pos.session.openedAt', 'Opened')}:{' '}
                        <strong className='text-foreground'>
                          {new Date(summary.shiftTimeframe.openedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </strong>
                        {summary.shiftTimeframe.durationMinutes > 0 && (
                          <span className='ml-1 text-[11px] opacity-80'>
                            ({Math.floor(summary.shiftTimeframe.durationMinutes / 60)}h{' '}
                            {summary.shiftTimeframe.durationMinutes % 60}m)
                          </span>
                        )}
                      </span>
                    </div>
                    <Badge variant='outline' className='text-[10px] bg-background'>
                      <Receipt className='h-3 w-3 mr-1 opacity-70' />
                      {summary.invoicesCount || summary.ordersCount || 0} {t('pos.session.invoices', 'Orders')}
                    </Badge>
                  </div>
                )}

                <Card className='bg-muted/30 border-dashed'>
                  <CardContent className='p-4 space-y-2 text-xs'>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>
                        {t('pos.session.summary.openingCash', 'Opening Float')}:
                      </span>
                      <span className='font-semibold'>
                        {formatCurrency(summary?.openingCash ?? 0)}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground flex items-center gap-1'>
                        <DollarSign className='h-3 w-3 text-emerald-500' />
                        {t('pos.session.summary.cashSales', 'Cash Sales')}:
                      </span>
                      <span className='font-semibold text-emerald-600 dark:text-emerald-400'>
                        +{formatCurrency(summary?.cashSales ?? 0)}
                      </span>
                    </div>

                    {/* Card & Non-Cash Reference */}
                    {Number(summary?.cardSales || 0) > 0 && (
                      <div className='flex justify-between text-muted-foreground'>
                        <span className='flex items-center gap-1'>
                          <CreditCard className='h-3 w-3 text-blue-500' />
                          {t('pos.session.summary.cardSales', 'Card Sales (Terminal)')}:
                        </span>
                        <span className='font-medium text-foreground'>
                          {formatCurrency(summary?.cardSales ?? 0)}
                        </span>
                      </div>
                    )}

                    {Number(summary?.otherSales || 0) > 0 && (
                      <div className='flex justify-between text-muted-foreground'>
                        <span className='flex items-center gap-1'>
                          <Wallet className='h-3 w-3 text-purple-500' />
                          {t('pos.session.summary.otherSales', 'Other Digital Sales')}:
                        </span>
                        <span className='font-medium text-foreground'>
                          {formatCurrency(summary?.otherSales ?? 0)}
                        </span>
                      </div>
                    )}

                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>
                        {t('pos.session.summary.cashIn', 'Cash In (Paid In)')}:
                      </span>
                      <span className='font-semibold text-emerald-600 dark:text-emerald-400'>
                        +{formatCurrency(summary?.cashIn ?? 0)}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>
                        {t('pos.session.summary.cashOut', 'Cash Out (Paid Out)')}:
                      </span>
                      <span className='font-semibold text-rose-500'>
                        -{formatCurrency(summary?.cashOut ?? 0)}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>
                        {t('pos.session.summary.cashRefunds', 'Cash Refunds')}:
                      </span>
                      <span className='font-semibold text-rose-500'>
                        -{formatCurrency(summary?.cashRefunds ?? 0)}
                      </span>
                    </div>

                    <Separator />
                    <div className='flex justify-between font-bold text-sm pt-1'>
                      <span>{t('pos.session.expectedCash', 'Expected Cash in Drawer')}:</span>
                      <span className='text-primary text-base font-black'>
                        {formatCurrency(expectedCash)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Counted Cash with Quick Match Button */}
                <div className='space-y-1.5'>
                  <div className='flex items-center justify-between'>
                    <Label htmlFor='actualCash' className='text-sm font-semibold'>
                      {t('pos.session.countedCash', 'Counted Cash in Drawer')}
                    </Label>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => setActualCash(expectedCash.toFixed(2))}
                      className='h-6 px-2 text-xs font-semibold text-primary hover:bg-primary/10'
                      title={t('pos.session.setExpectedTip', 'Set to expected cash total')}
                    >
                      <CheckCircle2 className='h-3 w-3 mr-1 text-primary' />
                      {t('pos.session.matchExpected', 'Match Expected')} ({formatCurrency(expectedCash)})
                    </Button>
                  </div>
                  <div className='relative'>
                    <DollarSign className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                    <Input
                      id='actualCash'
                      type='number'
                      step='0.01'
                      min='0'
                      className='pl-9 text-lg font-bold'
                      placeholder='0.00'
                      value={actualCash}
                      onChange={(e) => setActualCash(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  <p className='text-[11px] text-muted-foreground'>
                    {t(
                      'pos.session.prefilledNotice',
                      'Pre-filled with expected shift cash. Update if physical drawer count differs.'
                    )}
                  </p>
                </div>

                {/* Discrepancy Alert */}
                {actualCash !== '' && (
                  <div
                    className={`rounded-md p-3 flex items-center justify-between text-sm font-medium ${
                      discrepancy === 0
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                        : discrepancy > 0
                        ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                        : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                    }`}
                  >
                    <div className='flex items-center gap-2'>
                      {discrepancy === 0 ? (
                        <CheckCircle2 className='h-4 w-4 text-emerald-600' />
                      ) : (
                        <AlertTriangle className='h-4 w-4' />
                      )}
                      <span>
                        {discrepancy === 0
                          ? t('pos.session.balancedMsg', 'Drawer is perfectly balanced!')
                          : discrepancy > 0
                          ? `${t('pos.session.overBy', 'Over by')} +${formatCurrency(discrepancy)}`
                          : `${t('pos.session.shortBy', 'Short by')} -${formatCurrency(Math.abs(discrepancy))}`}
                      </span>
                    </div>
                    <span className='font-bold'>
                      {discrepancy > 0 ? `+${formatCurrency(discrepancy)}` : formatCurrency(discrepancy)}
                    </span>
                  </div>
                )}

                <div className='space-y-1.5'>
                  <Label htmlFor='closeNotes' className='text-xs font-semibold'>
                    {t('pos.session.closingNotes', 'Closing Notes & Discrepancy Reason')}
                  </Label>
                  <Textarea
                    id='closeNotes'
                    placeholder={t(
                      'pos.session.closingNotesPlaceholder',
                      'Explain any cash variance or final shift observations...'
                    )}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <DialogFooter className='gap-2 sm:gap-0 pt-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={printZReport}
                    className='gap-2'
                  >
                    <Printer className='h-4 w-4' />
                    {t('pos.reports.printReport', 'Print Z-Report')}
                  </Button>
                  <Button
                    type='submit'
                    disabled={closeMutation.isPending || actualCash === ''}
                    className='gap-2 bg-rose-600 hover:bg-rose-700 text-white'
                  >
                    <Lock className='h-4 w-4' />
                    {closeMutation.isPending
                      ? t('pos.session.closing', 'Closing...')
                      : t('pos.session.closeShiftBtn', 'Close & Reconcile Shift')}
                  </Button>
                </DialogFooter>
              </>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

