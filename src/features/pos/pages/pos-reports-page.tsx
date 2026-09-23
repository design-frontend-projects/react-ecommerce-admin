import { useState } from 'react'
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  RotateCcw,
  Printer,
  FileText,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  usePosSessionsList,
  usePosSessionSummary,
  usePosTerminals,
} from '../hooks/use-pos-queries'

export function PosReportsPage() {
  const [selectedTerminalId, setSelectedTerminalId] = useState<string | undefined>()
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  const { data: terminals = [] } = usePosTerminals()
  const { data: sessionData, isLoading } = usePosSessionsList({
    terminalId: selectedTerminalId,
    pageSize: 50,
  })

  const sessions = sessionData?.sessions || []

  // Load active session details if clicked
  const { data: sessionDetail, isLoading: isLoadingDetail } =
    usePosSessionSummary(selectedSessionId || undefined)

  // Calculate aggregates
  const totalSales = sessions.reduce(
    (sum: number, s: any) => sum + Number(s.total_sales || 0),
    0
  )
  const totalDiscrepancies = sessions.reduce(
    (sum: number, s: any) => sum + Math.abs(Number(s.discrepancy ?? s.cash_difference ?? 0)),
    0
  )
  const openSessionsCount = sessions.filter(
    (s: any) => s.status === 'open'
  ).length

  const handlePrintZReport = (detail: any) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Z-Report - ${detail.session.id.slice(0, 8)}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: monospace; width: 78mm; padding: 10px; font-size: 12px; margin: 0 auto; }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center">
            <h2 style="margin: 0;">SESSION AUDIT / Z-REPORT</h2>
            <p style="margin: 3px 0;">Session: ${detail.session.id.slice(0, 8)}</p>
            <p style="margin: 3px 0;">Cashier: ${detail.session.cashier_name || 'Staff'}</p>
            <p style="margin: 3px 0;">Closed: ${detail.session.closed_at ? new Date(detail.session.closed_at).toLocaleString() : 'OPEN'}</p>
          </div>
          <div class="divider"></div>
          <div class="row"><span>Opening Float:</span><span>${formatCurrency(detail.openingCash)}</span></div>
          <div class="row"><span>Cash Sales:</span><span>${formatCurrency(detail.cashSales)}</span></div>
          <div class="row"><span>Card Sales:</span><span>${formatCurrency(detail.cardSales)}</span></div>
          <div class="row"><span>Cash In:</span><span>${formatCurrency(detail.cashIn)}</span></div>
          <div class="row"><span>Cash Out:</span><span>-${formatCurrency(detail.cashOut)}</span></div>
          <div class="row"><span>Refunds:</span><span>-${formatCurrency(detail.cashRefunds)}</span></div>
          <div class="divider"></div>
          <div class="row bold"><span>Actual Counted Cash:</span><span>${formatCurrency(detail.actualCash)}</span></div>
          <div class="row bold"><span>Variance / Discrepancy:</span><span>${formatCurrency(detail.discrepancy)}</span></div>
          <div class="divider"></div>
          <div class="center"><p>Official POS Audit Log</p></div>
          <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };</script>
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-extrabold tracking-tight'>POS Reports & Audit</h1>
        <p className='text-sm text-muted-foreground mt-1'>
          Review shift performance, cash drawer reconciliation variances, and historical register sessions.
        </p>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs font-bold uppercase'>Total Sales Logged</CardDescription>
            <CardTitle className='text-2xl font-black text-emerald-600 dark:text-emerald-400'>
              {formatCurrency(totalSales)}
            </CardTitle>
          </CardHeader>
          <CardContent className='text-xs text-muted-foreground'>
            Across all completed shifts
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs font-bold uppercase'>Active Register Shifts</CardDescription>
            <CardTitle className='text-2xl font-black text-primary'>
              {openSessionsCount} Open
            </CardTitle>
          </CardHeader>
          <CardContent className='text-xs text-muted-foreground'>
            Currently transacting in stores
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs font-bold uppercase'>Total Drawer Variance</CardDescription>
            <CardTitle className='text-2xl font-black text-amber-600 dark:text-amber-400'>
              {formatCurrency(totalDiscrepancies)}
            </CardTitle>
          </CardHeader>
          <CardContent className='text-xs text-muted-foreground'>
            Cumulative over/short discrepancy
          </CardContent>
        </Card>
      </div>

      {/* Shifts Table */}
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <div>
              <CardTitle className='text-lg'>Register Shift History</CardTitle>
              <CardDescription className='text-xs'>
                Detailed log of opened and closed till sessions with drawer reconciliation results.
              </CardDescription>
            </div>

            {/* Filter by terminal */}
            <div className='flex items-center gap-2'>
              <Filter className='h-3.5 w-3.5 text-muted-foreground' />
              <select
                value={selectedTerminalId || ''}
                onChange={(e) => setSelectedTerminalId(e.target.value || undefined)}
                className='h-8 rounded-md border bg-background px-2 text-xs'
              >
                <option value=''>All Terminals</option>
                {terminals.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} - {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className='p-0'>
          <Table>
            <TableHeader>
              <TableRow className='text-xs'>
                <TableHead>Terminal</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Opened At</TableHead>
                <TableHead>Closed At</TableHead>
                <TableHead className='text-right'>Starting Float</TableHead>
                <TableHead className='text-right'>Actual Counted</TableHead>
                <TableHead className='text-right'>Variance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='text-right'>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className='text-center py-8 text-muted-foreground text-xs'>
                    Loading session audit records...
                  </TableCell>
                </TableRow>
              ) : sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className='text-center py-8 text-muted-foreground text-xs'>
                    No sessions found.
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((s: any) => {
                  const variance = Number(s.discrepancy ?? s.cash_difference ?? 0)
                  return (
                    <TableRow key={s.id} className='text-xs'>
                      <TableCell className='font-mono font-semibold'>
                        {s.terminal?.code || s.pos_terminals?.code || 'POS'}
                      </TableCell>
                      <TableCell className='font-medium'>
                        {s.cashier_name || 'Cashier'}
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {new Date(s.opened_at).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {s.closed_at
                          ? new Date(s.closed_at).toLocaleString([], {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </TableCell>
                      <TableCell className='text-right'>
                        {formatCurrency(Number(s.opening_cash || 0))}
                      </TableCell>
                      <TableCell className='text-right font-semibold'>
                        {s.actual_cash != null
                          ? formatCurrency(Number(s.actual_cash))
                          : '—'}
                      </TableCell>
                      <TableCell className='text-right font-bold'>
                        {s.discrepancy != null || s.cash_difference != null ? (
                          <span
                            className={
                              variance === 0
                                ? 'text-emerald-600'
                                : variance > 0
                                ? 'text-amber-600'
                                : 'text-rose-600'
                            }
                          >
                            {variance > 0 ? `+${formatCurrency(variance)}` : formatCurrency(variance)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant='outline'
                          className={
                            s.status === 'open'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-muted text-muted-foreground'
                          }
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-right'>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-7 text-xs gap-1'
                          onClick={() => setSelectedSessionId(s.id)}
                        >
                          <FileText className='h-3.5 w-3.5' /> Audit
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Session Audit Modal */}
      <Dialog
        open={Boolean(selectedSessionId)}
        onOpenChange={(open) => !open && setSelectedSessionId(null)}
      >
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Session Audit Breakdown</DialogTitle>
            <DialogDescription>
              Session #{selectedSessionId?.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetail || !sessionDetail ? (
            <div className='py-8 text-center text-xs text-muted-foreground'>
              Loading audit details...
            </div>
          ) : (
            <div className='space-y-4 py-2 text-xs'>
              <div className='rounded-lg border bg-muted/30 p-3 space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Starting Float:</span>
                  <span className='font-semibold'>{formatCurrency(sessionDetail.openingCash)}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Cash Sales:</span>
                  <span className='font-semibold text-emerald-600 dark:text-emerald-400'>
                    +{formatCurrency(sessionDetail.cashSales)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Card Sales:</span>
                  <span className='font-semibold'>
                    {formatCurrency(sessionDetail.cardSales)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Paid In (Cash In):</span>
                  <span className='font-semibold text-emerald-600 dark:text-emerald-400'>
                    +{formatCurrency(sessionDetail.cashIn)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Paid Out (Cash Out):</span>
                  <span className='font-semibold text-rose-500'>
                    -{formatCurrency(sessionDetail.cashOut)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Refunds:</span>
                  <span className='font-semibold text-rose-500'>
                    -{formatCurrency(sessionDetail.cashRefunds)}
                  </span>
                </div>
                <Separator />
                <div className='flex justify-between font-bold text-sm'>
                  <span>Counted Drawer Cash:</span>
                  <span className='text-primary'>{formatCurrency(sessionDetail.actualCash)}</span>
                </div>
                <div className='flex justify-between font-bold'>
                  <span>Variance:</span>
                  <span
                    className={
                      sessionDetail.discrepancy === 0
                        ? 'text-emerald-600'
                        : sessionDetail.discrepancy > 0
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }
                  >
                    {formatCurrency(sessionDetail.discrepancy)}
                  </span>
                </div>
              </div>

              {sessionDetail.session.notes && (
                <div className='rounded-md border p-2.5 bg-muted/10'>
                  <span className='font-bold text-muted-foreground block mb-0.5'>Notes:</span>
                  <p>{sessionDetail.session.notes}</p>
                </div>
              )}

              <DialogFooter className='gap-2 sm:gap-0 pt-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => handlePrintZReport(sessionDetail)}
                  className='gap-1.5'
                >
                  <Printer className='h-4 w-4' /> Print Z-Report
                </Button>
                <Button
                  type='button'
                  onClick={() => setSelectedSessionId(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
