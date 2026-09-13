import { format } from 'date-fns'
import {
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  FileText,
  Printer,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useFinancialTransaction } from '../hooks/use-financial-transactions'
import { getStatusBadge, getTypeBadge } from './columns'
import { useTransactionsContext } from './transactions-provider'

export function TransactionDetailDialog() {
  const {
    isDetailOpen,
    setIsDetailOpen,
    selectedId,
    openRefund,
    openStatusChange,
    setSelectedId,
  } = useTransactionsContext()

  const { data: tx, isLoading, error } = useFinancialTransaction(selectedId)

  const formatAmount = (num?: number, currency = 'USD') => {
    if (num == null) return '—'
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(num)
    } catch {
      return `${currency} ${num.toFixed(2)}`
    }
  }

  const isCompleted = tx?.status === 'completed' || tx?.status === 'posted'
  const isPending = tx?.status === 'pending' || tx?.status === 'draft'
  const canRefund =
    isCompleted &&
    tx?.status !== 'refunded' &&
    ['sale', 'payment_in', 'income'].includes(tx?.transaction_type || '')

  return (
    <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
      <DialogContent className='max-h-[92vh] overflow-y-auto sm:max-w-3xl p-6'>
        <DialogHeader className='space-y-2 border-b pb-4'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div className='flex items-center space-x-2'>
              <DialogTitle className='font-mono text-xl font-bold tracking-tight'>
                {tx?.transaction_number || 'Transaction Details'}
              </DialogTitle>
              {tx?.transaction_number && (
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7 text-muted-foreground hover:text-foreground'
                  onClick={() => {
                    void navigator.clipboard.writeText(tx.transaction_number)
                    toast.success('Copied transaction number to clipboard')
                  }}
                >
                  <Copy className='h-3.5 w-3.5' />
                </Button>
              )}
            </div>
            <div className='flex items-center space-x-2'>
              {tx && getTypeBadge(tx.transaction_type)}
              {tx && getStatusBadge(tx.status)}
            </div>
          </div>
          <DialogDescription className='text-xs text-muted-foreground'>
            Detailed ledger entry and financial line item breakdown.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className='space-y-4 py-6'>
            <Skeleton className='h-24 w-full rounded-xl' />
            <Skeleton className='h-40 w-full rounded-xl' />
            <Skeleton className='h-32 w-full rounded-xl' />
          </div>
        ) : error || !tx ? (
          <div className='py-8 text-center text-sm text-destructive'>
            Failed to load transaction details. Please try again.
          </div>
        ) : (
          <div className='space-y-5 py-2'>
            {/* 4-Card Overview Strip */}
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
              <div className='rounded-lg border bg-card/40 p-3 space-y-1'>
                <span className='text-[11px] font-medium text-muted-foreground'>
                  Recorded Date
                </span>
                <p className='text-xs font-semibold text-foreground'>
                  {tx.created_at
                    ? format(new Date(tx.created_at), 'MMM dd, yyyy HH:mm')
                    : '—'}
                </p>
              </div>

              <div className='rounded-lg border bg-card/40 p-3 space-y-1'>
                <span className='text-[11px] font-medium text-muted-foreground'>
                  Currency
                </span>
                <p className='text-xs font-semibold text-foreground font-mono'>
                  {tx.currency}
                </p>
              </div>

              <div className='rounded-lg border bg-card/40 p-3 space-y-1'>
                <span className='text-[11px] font-medium text-muted-foreground'>
                  Created By
                </span>
                <p className='text-xs font-semibold text-foreground truncate'>
                  {tx.created_by_name || 'System'}
                </p>
              </div>

              <div className='rounded-lg border bg-card/40 p-3 space-y-1'>
                <span className='text-[11px] font-medium text-muted-foreground'>
                  Line Items Count
                </span>
                <p className='text-xs font-semibold text-foreground'>
                  {tx.details.length} item{tx.details.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {/* Financial Summary Card */}
            <div className='rounded-xl border bg-card/70 p-4 space-y-2.5 shadow-xs'>
              <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                Financial Breakdown
              </h4>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1'>
                <div>
                  <span className='text-xs text-muted-foreground'>Subtotal</span>
                  <p className='text-sm font-medium text-foreground'>
                    {formatAmount(tx.subtotal, tx.currency)}
                  </p>
                </div>
                <div>
                  <span className='text-xs text-muted-foreground'>Tax Amount</span>
                  <p className='text-sm font-medium text-foreground'>
                    {formatAmount(tx.tax_amount, tx.currency)}
                  </p>
                </div>
                <div>
                  <span className='text-xs text-muted-foreground'>Discount</span>
                  <p className='text-sm font-medium text-foreground'>
                    {formatAmount(tx.discount_amount, tx.currency)}
                  </p>
                </div>
                <div>
                  <span className='text-xs text-muted-foreground font-semibold'>
                    Grand Total
                  </span>
                  <p className='text-lg font-bold text-primary'>
                    {formatAmount(tx.total_amount, tx.currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            {tx.details.length > 0 && (
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                    Itemized Details
                  </h4>
                  <Badge variant='outline' className='text-[11px]'>
                    {tx.details.length} Line {tx.details.length === 1 ? 'Item' : 'Items'}
                  </Badge>
                </div>
                <div className='rounded-xl border overflow-hidden bg-card/40'>
                  <Table>
                    <TableHeader className='bg-muted/40'>
                      <TableRow>
                        <TableHead className='text-xs'>Product</TableHead>
                        <TableHead className='text-xs text-right'>Qty</TableHead>
                        <TableHead className='text-xs text-right'>Unit Price</TableHead>
                        <TableHead className='text-xs text-right'>Discount</TableHead>
                        <TableHead className='text-xs text-right'>Tax</TableHead>
                        <TableHead className='text-xs text-right'>Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tx.details.map((item) => (
                        <TableRow key={item.id} className='text-xs'>
                          <TableCell className='font-medium'>
                            <div>{item.product_name}</div>
                            {item.sku && (
                              <span className='text-[10px] font-mono text-muted-foreground'>
                                SKU: {item.sku}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className='text-right font-medium'>
                            {item.quantity}
                          </TableCell>
                          <TableCell className='text-right'>
                            {formatAmount(item.unit_price, tx.currency)}
                          </TableCell>
                          <TableCell className='text-right text-muted-foreground'>
                            {item.discount_amount > 0
                              ? formatAmount(item.discount_amount, tx.currency)
                              : '—'}
                          </TableCell>
                          <TableCell className='text-right text-muted-foreground'>
                            {item.tax_amount > 0
                              ? formatAmount(item.tax_amount, tx.currency)
                              : '—'}
                          </TableCell>
                          <TableCell className='text-right font-semibold text-foreground'>
                            {formatAmount(item.subtotal, tx.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Linked Documents & References */}
            {(tx.reference_transaction ||
              tx.child_refunds.length > 0 ||
              tx.linked_invoice ||
              tx.linked_return) && (
              <div className='rounded-xl border bg-card/40 p-4 space-y-3'>
                <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                  Linked Documents & Trail
                </h4>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  {tx.reference_transaction && (
                    <div className='rounded-lg border p-2.5 bg-muted/20 space-y-1'>
                      <span className='text-[11px] text-muted-foreground flex items-center'>
                        <RotateCcw className='mr-1 h-3 w-3 text-purple-500' />
                        Refund of Original Transaction
                      </span>
                      <div className='flex items-center justify-between'>
                        <Button
                          variant='link'
                          className='p-0 h-auto font-mono text-xs font-bold'
                          onClick={() => setSelectedId(tx.reference_transaction!.id)}
                        >
                          {tx.reference_transaction.transaction_number}
                        </Button>
                        <span className='text-xs font-semibold'>
                          {formatAmount(
                            tx.reference_transaction.total_amount,
                            tx.reference_transaction.currency
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {tx.linked_invoice && (
                    <div className='rounded-lg border p-2.5 bg-muted/20 space-y-1'>
                      <span className='text-[11px] text-muted-foreground flex items-center'>
                        <FileText className='mr-1 h-3 w-3 text-blue-500' />
                        Linked Sales Invoice
                      </span>
                      <div className='flex items-center justify-between'>
                        <span className='font-mono text-xs font-bold'>
                          {tx.linked_invoice.invoice_no}
                        </span>
                        <Badge variant='outline' className='text-[10px]'>
                          {tx.linked_invoice.status}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {tx.linked_return && (
                    <div className='rounded-lg border p-2.5 bg-muted/20 space-y-1'>
                      <span className='text-[11px] text-muted-foreground flex items-center'>
                        <FileSpreadsheet className='mr-1 h-3 w-3 text-amber-500' />
                        Linked Sales Return
                      </span>
                      <div className='flex items-center justify-between'>
                        <span className='font-mono text-xs font-bold'>
                          {tx.linked_return.return_no}
                        </span>
                        <Badge variant='outline' className='text-[10px]'>
                          {tx.linked_return.status}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>

                {/* Child Refunds List */}
                {tx.child_refunds.length > 0 && (
                  <div className='space-y-1.5 pt-2'>
                    <span className='text-[11px] font-medium text-muted-foreground'>
                      Issued Refunds Against This Transaction:
                    </span>
                    <div className='space-y-1.5'>
                      {tx.child_refunds.map((cr) => (
                        <div
                          key={cr.id}
                          className='flex items-center justify-between rounded-lg border p-2 text-xs bg-purple-500/5 border-purple-500/20'
                        >
                          <Button
                            variant='link'
                            className='p-0 h-auto font-mono text-xs font-bold text-purple-700 dark:text-purple-400'
                            onClick={() => setSelectedId(cr.id)}
                          >
                            {cr.transaction_number}
                          </Button>
                          <div className='flex items-center space-x-2'>
                            <span className='font-medium text-muted-foreground text-[11px]'>
                              {cr.created_at ? format(new Date(cr.created_at), 'MMM dd') : ''}
                            </span>
                            <span className='font-bold text-purple-700 dark:text-purple-300'>
                              -{formatAmount(cr.total_amount, cr.currency)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes & Audit Info */}
            <div className='rounded-xl border bg-card/30 p-3 text-xs space-y-1.5'>
              <span className='font-semibold text-muted-foreground'>Notes & Audit Trail:</span>
              <p className='text-muted-foreground whitespace-pre-wrap'>
                {tx.notes || 'No notes entered.'}
              </p>
              {tx.ip_address && (
                <div className='pt-1 text-[11px] text-muted-foreground/80 font-mono'>
                  Origin IP: {tx.ip_address}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className='border-t pt-4 flex flex-wrap items-center justify-between gap-2 sm:justify-between'>
          <Button
            variant='outline'
            size='sm'
            className='h-8 text-xs'
            onClick={() => {
              window.print()
            }}
          >
            <Printer className='mr-1.5 h-3.5 w-3.5' />
            Print Ledger
          </Button>

          <div className='flex items-center space-x-2'>
            {isPending && tx && (
              <Button
                size='sm'
                className='h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white'
                onClick={() => {
                  setIsDetailOpen(false)
                  openStatusChange(tx, 'completed')
                }}
              >
                <CheckCircle2 className='mr-1.5 h-3.5 w-3.5' />
                Mark Completed
              </Button>
            )}

            {canRefund && tx && (
              <Button
                size='sm'
                variant='outline'
                className='h-8 text-xs text-purple-600 border-purple-500/30 hover:bg-purple-500/10'
                onClick={() => {
                  setIsDetailOpen(false)
                  openRefund(tx)
                }}
              >
                <RotateCcw className='mr-1.5 h-3.5 w-3.5' />
                Issue Refund
              </Button>
            )}

            <Button
              variant='secondary'
              size='sm'
              className='h-8 text-xs'
              onClick={() => setIsDetailOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
