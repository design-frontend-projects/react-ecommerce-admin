import { useState } from 'react'
import { format } from 'date-fns'
import {
  FileText,
  Printer,
  Copy,
  Check,
  Building2,
  Calendar,
  Layers,
  Package,
  Boxes,
  DollarSign,
  ArrowLeft,
  Pencil,
  PackageCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { POStatusBadge } from './po-status-badge'
import { usePOContext } from './po-provider'
import {
  usePurchaseOrder,
  type PurchaseOrder,
} from '../hooks/use-purchase-orders'

export interface POSummaryDraftItem {
  productId: number
  productName: string
  productSku?: string
  variantId: string | null
  variantSku: string
  variantLabel?: string
  quantity: number
  unitCost: number
  subtotal: number
}

export interface POSummaryDraftData {
  supplierName: string
  supplierId: string
  orderDate: string
  expectedDeliveryDate?: string
  notes?: string
  items: POSummaryDraftItem[]
  totalAmount: number
}

interface POSummaryDialogProps {
  // Optional draft mode props (used when reviewing draft from Create/Edit dialog)
  draftData?: POSummaryDraftData | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onConfirmDraftSubmit?: () => Promise<void> | void
  isSubmittingDraft?: boolean
}

export function POSummaryDialog({
  draftData,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onConfirmDraftSubmit,
  isSubmittingDraft,
}: POSummaryDialogProps) {
  const { open: contextOpen, setOpen: setContextOpen, currentRow, setCurrentRow } = usePOContext()
  const [copied, setCopied] = useState(false)

  // Is this dialog being opened in Draft review mode or in View mode from table?
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

  // If in View mode, fetch full PO with its items
  const poId = !isDraftMode && currentRow ? currentRow.po_id : 0
  const { data: fullPO, isLoading: isLoadingPO } = usePurchaseOrder(poId)

  // Consolidate data into a uniform summary model
  const poNumber = isDraftMode
    ? 'DRAFT PREVIEW'
    : `PO-${String(currentRow?.po_id || 0).padStart(4, '0')}`

  const status = isDraftMode ? 'pending' : fullPO?.status || currentRow?.status || 'pending'
  const supplierName = isDraftMode
    ? draftData?.supplierName || 'Unspecified Supplier'
    : fullPO?.suppliers?.name || currentRow?.suppliers?.name || '—'

  const orderDate = isDraftMode
    ? draftData?.orderDate
    : fullPO?.order_date || currentRow?.order_date

  const expectedDeliveryDate = isDraftMode
    ? draftData?.expectedDeliveryDate
    : fullPO?.expected_delivery_date || currentRow?.expected_delivery_date

  const notes = isDraftMode ? draftData?.notes : fullPO?.notes || currentRow?.notes

  const lineItems: POSummaryDraftItem[] = isDraftMode
    ? draftData?.items || []
    : (fullPO?.purchase_order_items || []).map((item) => {
        const variant = item.products?.product_variants?.find(
          (v) => v.id === item.product_variant_id
        )
        return {
          productId: item.product_id,
          productName: item.products?.name || `Product #${item.product_id}`,
          variantId: item.product_variant_id,
          variantSku: variant?.sku || item.product_variant_id || 'Standard',
          quantity: item.quantity_ordered,
          unitCost: item.unit_cost,
          subtotal: item.subtotal,
        }
      })

  const totalAmount = isDraftMode
    ? draftData?.totalAmount || 0
    : Number(fullPO?.total_amount ?? currentRow?.total_amount ?? 0)

  const totalQuantity = lineItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalItemsCount = lineItems.length

  const formatDateDisplay = (dateStr?: string | null) => {
    if (!dateStr) return '—'
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy')
    } catch {
      return dateStr
    }
  }

  const handleCopySummary = async () => {
    const textLines = [
      `=== PURCHASE ORDER SUMMARY ===`,
      `PO Number: ${poNumber}`,
      `Status: ${status.toUpperCase()}`,
      `Supplier: ${supplierName}`,
      `Order Date: ${formatDateDisplay(orderDate)}`,
      `Expected Delivery: ${formatDateDisplay(expectedDeliveryDate)}`,
      `Total Line Items: ${totalItemsCount}`,
      `Total Units: ${totalQuantity}`,
      `Total Amount: $${totalAmount.toFixed(2)}`,
      ``,
      `--- Line Items ---`,
      ...lineItems.map(
        (it, idx) =>
          `${idx + 1}. ${it.productName} [Variant: ${it.variantSku}] | Qty: ${it.quantity} | Unit Cost: $${it.unitCost.toFixed(2)} | Subtotal: $${it.subtotal.toFixed(2)}`
      ),
      ...(notes ? [``, `Notes: ${notes}`] : []),
    ]

    try {
      await navigator.clipboard.writeText(textLines.join('\n'))
      setCopied(true)
      toast.success('Summary copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy summary')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className='max-h-[92vh] sm:max-w-4xl flex flex-col p-0 overflow-hidden'>
        {/* Header */}
        <div className='p-6 pb-4 border-b bg-muted/20'>
          <DialogHeader className='space-y-1.5'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-primary/10 rounded-lg text-primary'>
                  <FileText className='h-6 w-6' />
                </div>
                <div>
                  <div className='flex items-center gap-2'>
                    <DialogTitle className='text-xl font-bold tracking-tight'>
                      Purchase Order Summary
                    </DialogTitle>
                    <Badge
                      variant={isDraftMode ? 'outline' : 'secondary'}
                      className='font-mono font-bold text-xs'
                    >
                      {poNumber}
                    </Badge>
                  </div>
                  <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                    {isDraftMode
                      ? 'Review the purchase order details and line items before confirming.'
                      : 'Complete breakdown and procurement specifications.'}
                  </DialogDescription>
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <POStatusBadge status={status as any} />
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-8 text-xs'
                  onClick={handleCopySummary}
                >
                  {copied ? (
                    <Check className='h-3.5 w-3.5 mr-1.5 text-emerald-600' />
                  ) : (
                    <Copy className='h-3.5 w-3.5 mr-1.5 text-muted-foreground' />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-8 text-xs'
                  onClick={handlePrint}
                >
                  <Printer className='h-3.5 w-3.5 mr-1.5 text-muted-foreground' />
                  Print
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Body Content */}
        <ScrollArea className='flex-1 p-6'>
          {isLoadingPO && !isDraftMode ? (
            <div className='py-16 text-center text-sm text-muted-foreground'>
              <div className='inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2' />
              <p>Loading purchase order details...</p>
            </div>
          ) : (
            <div className='space-y-6'>
              {/* Order Metadata Cards */}
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                <div className='rounded-lg border bg-card p-3.5 space-y-1'>
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium'>
                    <Building2 className='h-3.5 w-3.5 text-primary' />
                    <span>Supplier</span>
                  </div>
                  <p className='text-sm font-semibold truncate text-foreground'>
                    {supplierName}
                  </p>
                </div>

                <div className='rounded-lg border bg-card p-3.5 space-y-1'>
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium'>
                    <Calendar className='h-3.5 w-3.5 text-primary' />
                    <span>Order Date</span>
                  </div>
                  <p className='text-sm font-semibold text-foreground'>
                    {formatDateDisplay(orderDate)}
                  </p>
                </div>

                <div className='rounded-lg border bg-card p-3.5 space-y-1'>
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium'>
                    <Calendar className='h-3.5 w-3.5 text-amber-500' />
                    <span>Expected Delivery</span>
                  </div>
                  <p className='text-sm font-semibold text-foreground'>
                    {formatDateDisplay(expectedDeliveryDate)}
                  </p>
                </div>
              </div>

              {/* KPI Summary Strip */}
              <div className='grid grid-cols-3 gap-3 bg-muted/30 border rounded-xl p-4'>
                <div className='flex flex-col'>
                  <span className='text-xs text-muted-foreground font-medium flex items-center gap-1'>
                    <Package className='h-3.5 w-3.5' /> Total Items
                  </span>
                  <span className='text-xl font-bold mt-1 text-foreground'>
                    {totalItemsCount}
                  </span>
                  <span className='text-[11px] text-muted-foreground'>Unique products</span>
                </div>

                <div className='flex flex-col'>
                  <span className='text-xs text-muted-foreground font-medium flex items-center gap-1'>
                    <Boxes className='h-3.5 w-3.5' /> Total Units
                  </span>
                  <span className='text-xl font-bold mt-1 text-foreground'>
                    {totalQuantity}
                  </span>
                  <span className='text-[11px] text-muted-foreground'>Ordered units</span>
                </div>

                <div className='flex flex-col text-right sm:text-left'>
                  <span className='text-xs text-muted-foreground font-medium flex items-center sm:justify-start justify-end gap-1'>
                    <DollarSign className='h-3.5 w-3.5 text-primary' /> Total Cost
                  </span>
                  <span className='text-xl font-bold mt-1 text-primary'>
                    ${totalAmount.toFixed(2)}
                  </span>
                  <span className='text-[11px] text-muted-foreground'>Estimated expenditure</span>
                </div>
              </div>

              {/* Line Items Section */}
              <div className='space-y-2.5'>
                <div className='flex items-center justify-between'>
                  <h4 className='text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5'>
                    <Layers className='h-3.5 w-3.5 text-primary' />
                    Line Items Breakdown ({lineItems.length})
                  </h4>
                </div>

                <div className='rounded-lg border overflow-hidden bg-card'>
                  <Table>
                    <TableHeader className='bg-muted/50'>
                      <TableRow>
                        <TableHead className='w-12 text-center'>#</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Variant / SKU</TableHead>
                        <TableHead className='w-24 text-center'>Qty</TableHead>
                        <TableHead className='w-28 text-right'>Unit Cost</TableHead>
                        <TableHead className='w-28 text-right'>Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className='py-8 text-center text-sm text-muted-foreground'
                          >
                            No line items present in this purchase order.
                          </TableCell>
                        </TableRow>
                      ) : (
                        lineItems.map((item, idx) => (
                          <TableRow key={idx} className='hover:bg-muted/20'>
                            <TableCell className='text-center text-xs text-muted-foreground font-mono'>
                              {idx + 1}
                            </TableCell>
                            <TableCell>
                              <div className='font-medium text-sm text-foreground'>
                                {item.productName}
                              </div>
                              {item.productSku && (
                                <div className='font-mono text-xs text-muted-foreground'>
                                  SKU: {item.productSku}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className='flex items-center gap-1.5'>
                                <Badge variant='outline' className='font-mono text-xs'>
                                  {item.variantSku}
                                </Badge>
                                {item.variantLabel && (
                                  <span className='text-xs text-muted-foreground'>
                                    ({item.variantLabel})
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className='text-center font-medium'>
                              {item.quantity}
                            </TableCell>
                            <TableCell className='text-right font-mono text-sm'>
                              ${item.unitCost.toFixed(2)}
                            </TableCell>
                            <TableCell className='text-right font-mono font-semibold text-sm'>
                              ${item.subtotal.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Notes */}
              {notes && (
                <div className='rounded-lg border bg-muted/20 p-4 space-y-1.5'>
                  <h4 className='text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5'>
                    <FileText className='h-3.5 w-3.5 text-muted-foreground' />
                    Notes & Instructions
                  </h4>
                  <p className='text-sm text-foreground whitespace-pre-wrap'>
                    {notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className='p-4 border-t bg-muted/20'>
          <DialogFooter className='flex-row items-center justify-between sm:justify-between w-full'>
            {isDraftMode ? (
              <>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleClose}
                  disabled={isSubmittingDraft}
                >
                  <ArrowLeft className='mr-1.5 h-4 w-4' />
                  Back to Edit
                </Button>

                <Button
                  type='button'
                  size='sm'
                  onClick={() => onConfirmDraftSubmit?.()}
                  disabled={isSubmittingDraft}
                >
                  {isSubmittingDraft ? 'Saving Order...' : 'Confirm & Create Order'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleClose}
                >
                  Close
                </Button>

                <div className='flex items-center gap-2'>
                  {currentRow &&
                    (currentRow.status === 'pending' ||
                      currentRow.status === 'partial') && (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          handleClose()
                          setContextOpen('receive')
                        }}
                      >
                        <PackageCheck className='mr-1.5 h-4 w-4' />
                        Receive
                      </Button>
                    )}

                  {currentRow && currentRow.status === 'pending' && (
                    <Button
                      type='button'
                      size='sm'
                      onClick={() => {
                        handleClose()
                        setContextOpen('edit')
                      }}
                    >
                      <Pencil className='mr-1.5 h-4 w-4' />
                      Edit Order
                    </Button>
                  )}
                </div>
              </>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
