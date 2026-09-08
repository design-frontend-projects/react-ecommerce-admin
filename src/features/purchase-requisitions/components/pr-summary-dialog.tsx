import { useState } from 'react'
import { format } from 'date-fns'
import {
  FileText,
  Printer,
  Copy,
  Check,
  Store,
  Calendar,
  Send,
  CheckCircle,
  XCircle,
  ArrowRightCircle,
  Pencil,
  DollarSign,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Can } from '@/components/rbac/Can'
import {
  useRequisition,
  useRequisitionAction,
} from '../hooks/use-purchase-requisitions'
import { PRStatusBadge } from './pr-status-badge'
import { useRequisitionsContext } from './provider'

export interface PRSummaryDraftItem {
  productId?: string | number | null
  productName: string
  productSku?: string | null
  variantId?: string | null
  variantSku: string
  variantLabel?: string | null
  uomId?: string | null
  uomName?: string | null
  uomCode?: string | null
  quantity: number
  unitCost: number
  subtotal: number
  supplierId?: string | null
  supplierName?: string | null
  reason?: string | null
}

export interface PRSummaryDraftData {
  storeId?: string | null
  storeName?: string
  currency: string
  neededBy?: string
  notes?: string
  items: PRSummaryDraftItem[]
  totalAmount?: number
}

interface PRSummaryDialogProps {
  draftData?: PRSummaryDraftData | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onConfirmDraftSubmit?: () => Promise<void> | void
  isSubmittingDraft?: boolean
}

export function PRSummaryDialog({
  draftData,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onConfirmDraftSubmit,
  isSubmittingDraft,
}: PRSummaryDialogProps) {
  const {
    open: contextOpen,
    setOpen: setContextOpen,
    currentRow,
  } = useRequisitionsContext()
  const requisitionAction = useRequisitionAction()
  const [copied, setCopied] = useState(false)

  const isDraftMode = Boolean(draftData)
  const isOpen = isDraftMode
    ? Boolean(externalOpen)
    : contextOpen === 'view' && Boolean(currentRow)

  const handleClose = () => {
    if (isDraftMode) {
      externalOnOpenChange?.(false)
    } else {
      setContextOpen(null)
    }
  }

  // If in View mode, fetch full detail
  const reqId = !isDraftMode && currentRow ? currentRow.id : undefined
  const { data: detail, isLoading: isLoadingDetail } = useRequisition(reqId)

  const requisitionNumber = isDraftMode
    ? 'DRAFT PREVIEW'
    : currentRow?.requisition_number || 'PR-000000'

  const status = isDraftMode
    ? 'draft'
    : detail?.status || currentRow?.status || 'draft'
  const source = isDraftMode
    ? 'manual'
    : detail?.source || currentRow?.source || 'manual'
  const currency = isDraftMode
    ? draftData?.currency || 'USD'
    : detail?.currency || currentRow?.currency || 'USD'

  const storeName = isDraftMode
    ? draftData?.storeName || 'No store / location specified'
    : detail?.stores?.name || currentRow?.stores?.name || 'No store specified'

  const neededBy = isDraftMode
    ? draftData?.neededBy
    : detail?.needed_by || currentRow?.needed_by

  const notes = isDraftMode
    ? draftData?.notes
    : detail?.notes || currentRow?.notes

  const lineItems: PRSummaryDraftItem[] = isDraftMode
    ? draftData?.items || []
    : (detail?.purchase_requisition_items || []).map((item) => {
        const prodVariant = item.product_variants
        const prod = prodVariant?.products

        let attrLabel: string | undefined
        if (prodVariant?.dimensions) {
          try {
            const parsed =
              typeof prodVariant.dimensions === 'string'
                ? JSON.parse(prodVariant.dimensions)
                : prodVariant.dimensions
            attrLabel = parsed?.label || undefined
          } catch {
            attrLabel = undefined
          }
        }

        const qty = Number(item.qty_requested || 0)
        const cost = Number(item.est_unit_cost || 0)

        return {
          productId: prodVariant?.product_id,
          productName: prod?.name || 'Product',
          productSku: prod?.sku,
          variantId: item.product_variant_id,
          variantSku: prodVariant?.sku || 'Standard',
          variantLabel: attrLabel,
          uomId: item.uom_id,
          uomName: item.uoms?.name,
          uomCode: item.uoms?.code,
          quantity: qty,
          unitCost: cost,
          subtotal: qty * cost,
          supplierId: item.preferred_supplier_id ?? item.suppliers?.id,
          supplierName: item.suppliers?.name,
          reason: item.reason,
        }
      })

  const totalAmount = isDraftMode
    ? draftData?.totalAmount !== undefined
      ? Number(draftData.totalAmount)
      : lineItems.reduce((sum, item) => sum + item.subtotal, 0)
    : detail?.total_amount !== undefined
      ? Number(detail.total_amount)
      : lineItems.reduce((sum, item) => sum + item.subtotal, 0)

  const copySummaryToClipboard = () => {
    const text = [
      `PURCHASE REQUISITION: ${requisitionNumber}`,
      `Status: ${status.toUpperCase()}`,
      `Location: ${storeName}`,
      `Currency: ${currency}`,
      `Needed By: ${neededBy || 'N/A'}`,
      `Total Estimated Amount: ${currency} ${totalAmount.toFixed(2)}`,
      '',
      '--- ITEMS ---',
      ...lineItems.map(
        (it, idx) =>
          `${idx + 1}. ${it.productName} (${it.variantSku}) | Qty: ${it.quantity} ${it.uomCode || ''} @ ${currency} ${it.unitCost.toFixed(2)} = ${currency} ${it.subtotal.toFixed(2)}${it.supplierName ? ` [Supplier: ${it.supplierName}]` : ''}`
      ),
      notes ? `\nNotes: ${notes}` : '',
    ].join('\n')

    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Requisition summary copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className='max-h-[92vh] w-full overflow-y-auto sm:max-w-4xl md:max-w-5xl'>
        <DialogHeader className='border-b pb-4'>
          <div className='flex flex-wrap items-center justify-between gap-2 pr-6'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <FileText className='h-5 w-5' />
              </div>
              <div>
                <DialogTitle className='flex items-center gap-2 text-xl font-bold'>
                  <span>{requisitionNumber}</span>
                  <PRStatusBadge status={status} />
                  <Badge
                    variant='outline'
                    className='text-xs font-normal capitalize'
                  >
                    {source === 'reorder_engine' ? 'Reorder Engine' : 'Manual'}
                  </Badge>
                </DialogTitle>
                <DialogDescription className='mt-0.5'>
                  {isDraftMode
                    ? 'Review the requisition details and items before submission.'
                    : 'Requisition summary and itemized procurement request.'}
                </DialogDescription>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={copySummaryToClipboard}
              >
                {copied ? (
                  <Check className='mr-1 h-4 w-4 text-emerald-600' />
                ) : (
                  <Copy className='mr-1 h-4 w-4' />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handlePrint}
              >
                <Printer className='mr-1 h-4 w-4' />
                Print
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className='space-y-6 py-2'>
          {/* Key Metric Highlights */}
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            <div className='rounded-lg border bg-card p-3 shadow-xs'>
              <div className='flex items-center gap-2 text-xs font-medium text-muted-foreground'>
                <Store className='h-3.5 w-3.5' />
                <span>Destination</span>
              </div>
              <p className='mt-1 truncate text-sm font-semibold'>{storeName}</p>
            </div>

            <div className='rounded-lg border bg-card p-3 shadow-xs'>
              <div className='flex items-center gap-2 text-xs font-medium text-muted-foreground'>
                <Calendar className='h-3.5 w-3.5' />
                <span>Needed By</span>
              </div>
              <p className='mt-1 text-sm font-semibold'>
                {neededBy
                  ? format(new Date(neededBy), 'MMM dd, yyyy')
                  : 'Flexible'}
              </p>
            </div>

            <div className='rounded-lg border bg-card p-3 shadow-xs'>
              <div className='flex items-center gap-2 text-xs font-medium text-muted-foreground'>
                <FileText className='h-3.5 w-3.5' />
                <span>Line Items</span>
              </div>
              <p className='mt-1 text-sm font-semibold'>
                {lineItems.length} item{lineItems.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className='rounded-lg border border-primary/20 bg-primary/5 p-3 shadow-xs'>
              <div className='flex items-center gap-2 text-xs font-medium text-primary'>
                <DollarSign className='h-3.5 w-3.5' />
                <span>Total Estimated</span>
              </div>
              <p className='mt-1 font-mono text-base font-bold text-foreground'>
                {currency} {totalAmount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <h4 className='text-sm font-semibold tracking-tight'>
                Procurement Items ({lineItems.length})
              </h4>
              <Badge
                variant='outline'
                className='font-mono text-xs font-normal'
              >
                Currency: {currency}
              </Badge>
            </div>

            {isLoadingDetail && !isDraftMode ? (
              <div className='rounded-md border p-8 text-center text-sm text-muted-foreground'>
                Loading requisition details...
              </div>
            ) : lineItems.length > 0 ? (
              <div className='overflow-x-auto rounded-md border'>
                <Table className='min-w-190'>
                  <TableHeader>
                    <TableRow className='bg-muted/40'>
                      <TableHead className='min-w-50'>Product</TableHead>
                      <TableHead className='min-w-37.5'>Variant</TableHead>
                      <TableHead className='w-27.5 text-center'>UOM</TableHead>
                      <TableHead className='w-22.5 text-center'>Qty</TableHead>
                      <TableHead className='w-27.5 text-right'>
                        Est. Cost
                      </TableHead>
                      <TableHead className='w-27.5 pr-3 text-right'>
                        Subtotal
                      </TableHead>
                      <TableHead className='min-w-35'>
                        Preferred Supplier
                      </TableHead>
                      <TableHead className='min-w-30'>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className='font-medium'>
                          <div>
                            <span>{item.productName}</span>
                            {item.productSku && (
                              <span className='ml-1.5 font-mono text-xs text-muted-foreground'>
                                ({item.productSku})
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className='flex flex-col'>
                            <span className='font-mono text-xs font-medium'>
                              {item.variantSku}
                            </span>
                            {item.variantLabel && (
                              <span className='text-xs text-muted-foreground'>
                                {item.variantLabel}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className='text-center'>
                          {item.uomCode || item.uomName ? (
                            <Badge
                              variant='outline'
                              className='text-[11px] font-medium'
                            >
                              {item.uomCode || item.uomName}
                            </Badge>
                          ) : (
                            <span className='text-xs text-muted-foreground'>
                              Default
                            </span>
                          )}
                        </TableCell>

                        <TableCell className='text-center font-mono font-semibold'>
                          {item.quantity}
                        </TableCell>

                        <TableCell className='text-right font-mono text-xs'>
                          {currency} {item.unitCost.toFixed(2)}
                        </TableCell>

                        <TableCell className='pr-3 text-right font-mono text-xs font-medium'>
                          {currency} {item.subtotal.toFixed(2)}
                        </TableCell>

                        <TableCell>
                          {item.supplierName ? (
                            <Badge
                              variant='secondary'
                              className='max-w-37.5 truncate text-xs'
                            >
                              {item.supplierName}
                            </Badge>
                          ) : (
                            <span className='text-xs text-muted-foreground'>
                              —
                            </span>
                          )}
                        </TableCell>

                        <TableCell className='max-w-40 truncate text-xs text-muted-foreground'>
                          {item.reason || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
                No items in this requisition.
              </div>
            )}

            {/* Total Footer */}
            <div className='flex justify-end pt-2'>
              <div className='flex items-baseline gap-2 rounded-lg border bg-muted/30 px-4 py-2'>
                <span className='text-xs font-medium text-muted-foreground'>
                  Grand Estimated Total:
                </span>
                <span className='font-mono text-lg font-bold'>
                  {currency} {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {notes ? (
            <div className='rounded-lg border bg-muted/40 p-3 text-xs'>
              <span className='font-semibold text-foreground'>
                Notes / Justification:{' '}
              </span>
              <span className='text-muted-foreground'>{notes}</span>
            </div>
          ) : null}
        </div>

        <DialogFooter className='flex flex-col-reverse items-center gap-2 border-t pt-4 sm:flex-row sm:justify-between'>
          <Button type='button' variant='outline' onClick={handleClose}>
            Close
          </Button>

          <div className='flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto'>
            {isDraftMode ? (
              <Button
                type='button'
                onClick={onConfirmDraftSubmit}
                disabled={isSubmittingDraft}
              >
                {isSubmittingDraft
                  ? 'Submitting...'
                  : 'Confirm & Save Requisition'}
              </Button>
            ) : (
              <Can permission='purchasing.manage'>
                {status === 'draft' ? (
                  <>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => {
                        if (currentRow) {
                          setContextOpen('edit')
                        }
                      }}
                    >
                      <Pencil className='mr-1.5 h-3.5 w-3.5' />
                      Edit
                    </Button>
                    <Button
                      type='button'
                      disabled={requisitionAction.isPending}
                      onClick={async () => {
                        if (currentRow) {
                          await requisitionAction.mutateAsync({
                            id: currentRow.id,
                            action: 'submit',
                          })
                          handleClose()
                        }
                      }}
                    >
                      <Send className='mr-1.5 h-3.5 w-3.5' />
                      Submit for Approval
                    </Button>
                  </>
                ) : null}

                {status === 'submitted' ? (
                  <>
                    <Button
                      type='button'
                      variant='destructive'
                      disabled={requisitionAction.isPending}
                      onClick={async () => {
                        if (currentRow) {
                          await requisitionAction.mutateAsync({
                            id: currentRow.id,
                            action: 'reject',
                          })
                          handleClose()
                        }
                      }}
                    >
                      <XCircle className='mr-1.5 h-3.5 w-3.5' />
                      Reject
                    </Button>
                    <Button
                      type='button'
                      className='bg-emerald-600 hover:bg-emerald-700'
                      disabled={requisitionAction.isPending}
                      onClick={async () => {
                        if (currentRow) {
                          await requisitionAction.mutateAsync({
                            id: currentRow.id,
                            action: 'approve',
                          })
                          handleClose()
                        }
                      }}
                    >
                      <CheckCircle className='mr-1.5 h-3.5 w-3.5' />
                      Approve Requisition
                    </Button>
                  </>
                ) : null}

                {status === 'approved' ? (
                  <Button
                    type='button'
                    className='bg-purple-600 hover:bg-purple-700'
                    disabled={requisitionAction.isPending}
                    onClick={async () => {
                      if (currentRow) {
                        await requisitionAction.mutateAsync({
                          id: currentRow.id,
                          action: 'convert',
                        })
                        handleClose()
                      }
                    }}
                  >
                    <ArrowRightCircle className='mr-1.5 h-3.5 w-3.5' />
                    Convert to Purchase Order
                  </Button>
                ) : null}
              </Can>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
