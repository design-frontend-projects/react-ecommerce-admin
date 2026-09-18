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
  Warehouse,
  Coins,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
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
import { usePurchaseOrder } from '../hooks/use-purchase-orders'

export interface POSummaryDraftItem {
  productId: number | string
  productName: string
  productSku?: string
  variantId: string | null
  variantSku: string
  variantLabel?: string
  uomId?: string | null
  uomName?: string
  uomCode?: string
  quantity: number
  unitCost: number
  subtotal: number
}

export interface POSummaryDraftData {
  supplierName: string
  supplierId: string
  warehouseId?: string
  warehouseName?: string
  orderDate: string
  expectedDeliveryDate?: string
  currencyId?: string
  currency?: string
  currencySymbol?: string
  subtotal?: number
  taxAmount?: number
  shippingAmount?: number
  discountAmount?: number
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
  const { t } = useTranslation()
  const { open: contextOpen, setOpen: setContextOpen, currentRow } = usePOContext()
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
    ? t('purchaseOrders.summary.draftPreview', 'DRAFT PREVIEW')
    : `PO-${String(currentRow?.po_id || 0).padStart(4, '0')}`

  const status = isDraftMode ? 'pending' : fullPO?.status || currentRow?.status || 'pending'
  const supplierName = isDraftMode
    ? draftData?.supplierName || t('purchaseOrders.summary.unspecifiedSupplier', 'Unspecified Supplier')
    : fullPO?.suppliers?.name || currentRow?.suppliers?.name || '—'

  const warehouseName = isDraftMode
    ? draftData?.warehouseName || null
    : fullPO?.warehouses?.name || currentRow?.warehouses?.name || null

  const currency = isDraftMode
    ? draftData?.currency || 'USD'
    : fullPO?.currency || fullPO?.currencies?.code || currentRow?.currency || currentRow?.currencies?.code || 'USD'

  const currencySymbol = isDraftMode
    ? draftData?.currencySymbol || '$'
    : fullPO?.currencies?.symbol || currentRow?.currencies?.symbol || '$'

  const currencyName = isDraftMode
    ? null
    : fullPO?.currencies?.name || currentRow?.currencies?.name || null

  const taxAmount = isDraftMode
    ? Number(draftData?.taxAmount || 0)
    : Number(fullPO?.tax_amount ?? fullPO?.tax_total ?? currentRow?.tax_amount ?? 0)

  const shippingAmount = isDraftMode
    ? Number(draftData?.shippingAmount || 0)
    : Number(fullPO?.shipping_amount ?? currentRow?.shipping_amount ?? 0)

  const discountAmount = isDraftMode
    ? Number(draftData?.discountAmount || 0)
    : Number(fullPO?.discount_amount ?? fullPO?.discount_total ?? currentRow?.discount_amount ?? 0)

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
          uomId: item.uom_id,
          uomName: item.uoms?.name,
          uomCode: item.uoms?.code,
          quantity: item.quantity_ordered,
          unitCost: item.unit_cost,
          subtotal: item.subtotal,
        }
      })

  const totalAmount = isDraftMode
    ? draftData?.totalAmount || 0
    : Number(fullPO?.grand_total ?? fullPO?.total_amount ?? currentRow?.grand_total ?? currentRow?.total_amount ?? 0)

  const subtotalAmount = lineItems.reduce((sum, item) => sum + item.subtotal, 0)
  const hasFinancialAdjustments = taxAmount > 0 || shippingAmount > 0 || discountAmount > 0
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
      ...(warehouseName ? [`Destination Warehouse: ${warehouseName}`] : []),
      `Order Date: ${formatDateDisplay(orderDate)}`,
      `Expected Delivery: ${formatDateDisplay(expectedDeliveryDate)}`,
      `Currency: ${currency} (${currencySymbol})`,
      `Total Line Items: ${totalItemsCount}`,
      `Total Units: ${totalQuantity}`,
      `Items Subtotal: ${currencySymbol}${subtotalAmount.toFixed(2)}`,
      ...(taxAmount > 0 ? [`Tax: +${currencySymbol}${taxAmount.toFixed(2)}`] : []),
      ...(shippingAmount > 0 ? [`Shipping: +${currencySymbol}${shippingAmount.toFixed(2)}`] : []),
      ...(discountAmount > 0 ? [`Discount: -${currencySymbol}${discountAmount.toFixed(2)}`] : []),
      `Total Amount: ${currencySymbol}${totalAmount.toFixed(2)} ${currency}`,
      ``,
      `--- Line Items ---`,
      ...lineItems.map(
        (it, idx) =>
          `${idx + 1}. ${it.productName} [Variant: ${it.variantSku}]${it.uomCode || it.uomName ? ` [UOM: ${it.uomCode || it.uomName}]` : ''} | Qty: ${it.quantity} | Unit Cost: ${currencySymbol}${it.unitCost.toFixed(2)} | Subtotal: ${currencySymbol}${it.subtotal.toFixed(2)}`
      ),
      ...(notes ? [``, `Notes: ${notes}`] : []),
    ]

    try {
      await navigator.clipboard.writeText(textLines.join('\n'))
      setCopied(true)
      toast.success(t('purchaseOrders.summary.copiedSuccess', 'Summary copied to clipboard'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('purchaseOrders.summary.copyFailed', 'Failed to copy summary'))
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
                      {t('purchaseOrders.summary.title', 'Purchase Order Summary')}
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
                      ? t(
                          'purchaseOrders.summary.draftDesc',
                          'Review the purchase order details and line items before confirming.'
                        )
                      : t(
                          'purchaseOrders.summary.viewDesc',
                          'Complete breakdown and procurement specifications.'
                        )}
                  </DialogDescription>
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <POStatusBadge
                  status={status as Parameters<typeof POStatusBadge>[0]['status']}
                />
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
                  {copied ? t('common.copied', 'Copied') : t('common.copy', 'Copy')}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-8 text-xs'
                  onClick={handlePrint}
                >
                  <Printer className='h-3.5 w-3.5 mr-1.5 text-muted-foreground' />
                  {t('common.print', 'Print')}
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
              <p>{t('purchaseOrders.summary.loading', 'Loading purchase order details...')}</p>
            </div>
          ) : (
            <div className='space-y-6'>
              {/* Order Metadata Cards */}
              <div className={cn(
                'grid gap-3',
                warehouseName ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'
              )}>
                <div className='rounded-lg border bg-card p-3.5 space-y-1'>
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium'>
                    <Building2 className='h-3.5 w-3.5 text-primary' />
                    <span>{t('purchaseOrders.fields.supplier', 'Supplier')}</span>
                  </div>
                  <p className='text-sm font-semibold truncate text-foreground'>
                    {supplierName}
                  </p>
                </div>

                {warehouseName && (
                  <div className='rounded-lg border bg-card p-3.5 space-y-1'>
                    <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium'>
                      <Warehouse className='h-3.5 w-3.5 text-primary' />
                      <span>{t('purchaseOrders.fields.destinationWarehouse', 'Destination')}</span>
                    </div>
                    <p className='text-sm font-semibold truncate text-foreground'>
                      {warehouseName}
                    </p>
                  </div>
                )}

                <div className='rounded-lg border bg-card p-3.5 space-y-1'>
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium'>
                    <Coins className='h-3.5 w-3.5 text-primary' />
                    <span>{t('purchaseOrders.fields.currency', 'Currency')}</span>
                  </div>
                  <div className='flex items-center gap-1.5'>
                    <Badge variant='outline' className='font-mono font-bold text-xs'>
                      {currencySymbol} {currency}
                    </Badge>
                    {currencyName && (
                      <span className='text-xs text-muted-foreground truncate'>
                        {currencyName}
                      </span>
                    )}
                  </div>
                </div>

                <div className='rounded-lg border bg-card p-3.5 space-y-1'>
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium'>
                    <Calendar className='h-3.5 w-3.5 text-primary' />
                    <span>{t('purchaseOrders.fields.orderDate', 'Order Date')}</span>
                  </div>
                  <p className='text-sm font-semibold text-foreground'>
                    {formatDateDisplay(orderDate)}
                  </p>
                </div>

                <div className='rounded-lg border bg-card p-3.5 space-y-1'>
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium'>
                    <Calendar className='h-3.5 w-3.5 text-amber-500' />
                    <span>{t('purchaseOrders.fields.expectedDelivery', 'Expected Delivery')}</span>
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
                    <Package className='h-3.5 w-3.5' /> {t('purchaseOrders.summary.totalItems', 'Total Items')}
                  </span>
                  <span className='text-xl font-bold mt-1 text-foreground'>
                    {totalItemsCount}
                  </span>
                  <span className='text-[11px] text-muted-foreground'>{t('purchaseOrders.summary.uniqueProducts', 'Unique products')}</span>
                </div>

                <div className='flex flex-col'>
                  <span className='text-xs text-muted-foreground font-medium flex items-center gap-1'>
                    <Boxes className='h-3.5 w-3.5' /> {t('purchaseOrders.summary.totalUnits', 'Total Units')}
                  </span>
                  <span className='text-xl font-bold mt-1 text-foreground'>
                    {totalQuantity}
                  </span>
                  <span className='text-[11px] text-muted-foreground'>{t('purchaseOrders.summary.orderedUnits', 'Ordered units')}</span>
                </div>

                <div className='flex flex-col text-right sm:text-left'>
                  <span className='text-xs text-muted-foreground font-medium flex items-center sm:justify-start justify-end gap-1'>
                    <DollarSign className='h-3.5 w-3.5 text-primary' /> {t('purchaseOrders.summary.totalCost', 'Total Cost')}
                  </span>
                  <span className='text-xl font-bold mt-1 text-primary'>
                    {currencySymbol}{totalAmount.toFixed(2)}
                  </span>
                  <span className='text-[11px] text-muted-foreground'>{t('purchaseOrders.summary.estimatedExpenditure', 'Estimated expenditure')}</span>
                </div>
              </div>

              {/* Line Items Section */}
              <div className='space-y-2.5'>
                <div className='flex items-center justify-between'>
                  <h4 className='text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5'>
                    <Layers className='h-3.5 w-3.5 text-primary' />
                    {t('purchaseOrders.summary.lineItemsBreakdown', 'Line Items Breakdown')} ({lineItems.length})
                  </h4>
                </div>

                <div className='rounded-lg border overflow-hidden bg-card'>
                  <Table>
                    <TableHeader className='bg-muted/50'>
                      <TableRow>
                        <TableHead className='w-12 text-center'>#</TableHead>
                        <TableHead>{t('purchaseOrders.lineItems.product', 'Product')}</TableHead>
                        <TableHead>{t('purchaseOrders.summary.variantSku', 'Variant / SKU')}</TableHead>
                        <TableHead className='w-20 text-center'>{t('purchaseOrders.lineItems.uom', 'UOM')}</TableHead>
                        <TableHead className='w-24 text-center'>{t('purchaseOrders.lineItems.qty', 'Qty')}</TableHead>
                        <TableHead className='w-28 text-right'>{t('purchaseOrders.lineItems.unitCost', 'Unit Cost')}</TableHead>
                        <TableHead className='w-28 text-right'>{t('purchaseOrders.lineItems.subtotal', 'Subtotal')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className='py-8 text-center text-sm text-muted-foreground'
                          >
                            {t('purchaseOrders.summary.noItemsPresent', 'No line items present in this purchase order.')}
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
                            <TableCell className='text-center'>
                              {item.uomCode || item.uomName ? (
                                <Badge variant='outline' className='font-mono text-xs'>
                                  {item.uomCode || item.uomName}
                                </Badge>
                              ) : (
                                <span className='text-xs text-muted-foreground'>—</span>
                              )}
                            </TableCell>
                            <TableCell className='text-center font-medium'>
                              {item.quantity}
                            </TableCell>
                            <TableCell className='text-right font-mono text-sm'>
                              {currencySymbol}{item.unitCost.toFixed(2)}
                            </TableCell>
                            <TableCell className='text-right font-mono font-semibold text-sm'>
                              {currencySymbol}{item.subtotal.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Financial Totals Breakdown */}
                {hasFinancialAdjustments && (
                  <div className='flex justify-end pt-2'>
                    <div className='w-full sm:w-80 space-y-2 rounded-xl border bg-card p-4 shadow-2xs text-xs'>
                      <div className='flex justify-between text-muted-foreground'>
                        <span>{t('purchaseOrders.financials.subtotal', 'Items Subtotal')}:</span>
                        <span className='font-mono font-medium text-foreground'>{currencySymbol}{subtotalAmount.toFixed(2)}</span>
                      </div>
                      {taxAmount > 0 && (
                        <div className='flex justify-between text-muted-foreground'>
                          <span>{t('purchaseOrders.financials.taxAmount', 'Tax Total')}:</span>
                          <span className='font-mono font-medium text-foreground'>+{currencySymbol}{taxAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {shippingAmount > 0 && (
                        <div className='flex justify-between text-muted-foreground'>
                          <span>{t('purchaseOrders.financials.shippingAmount', 'Shipping & Freight')}:</span>
                          <span className='font-mono font-medium text-foreground'>+{currencySymbol}{shippingAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {discountAmount > 0 && (
                        <div className='flex justify-between text-emerald-600 dark:text-emerald-400'>
                          <span>{t('purchaseOrders.financials.discountAmount', 'Discounts & Deductions')}:</span>
                          <span className='font-mono font-medium'>-{currencySymbol}{discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className='border-t pt-2 flex justify-between items-baseline font-bold text-sm text-foreground'>
                        <span>{t('purchaseOrders.financials.grandTotal', 'Grand Total')}:</span>
                        <span className='font-mono text-base text-primary'>{currencySymbol}{totalAmount.toFixed(2)} {currency}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {notes && (
                <div className='rounded-lg border bg-muted/20 p-4 space-y-1.5'>
                  <h4 className='text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5'>
                    <FileText className='h-3.5 w-3.5 text-muted-foreground' />
                    {t('purchaseOrders.summary.notesAndInstructions', 'Notes & Instructions')}
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
                  {t('purchaseOrders.summary.backToEdit', 'Back to Edit')}
                </Button>

                <Button
                  type='button'
                  size='sm'
                  onClick={() => onConfirmDraftSubmit?.()}
                  disabled={isSubmittingDraft}
                >
                  {isSubmittingDraft
                    ? t('purchaseOrders.summary.savingOrder', 'Saving Order...')
                    : t('purchaseOrders.summary.confirmCreate', 'Confirm & Create Order')}
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
                  {t('common.close', 'Close')}
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
                        {t('purchaseOrders.actions.receive', 'Receive')}
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
                      {t('purchaseOrders.actions.editOrder', 'Edit Order')}
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
