import { useState } from 'react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
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
  Warehouse,
  User,
  Phone,
  Mail,
  Receipt,
  CheckCircle2,
  Globe,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCurrencies } from '@/features/currencies/hooks/use-currencies'
import { useOrdersContext } from './provider'
import { useOrder } from '../hooks/use-sales-orders'
import { OrderStatusBadge } from './columns'
import { customerName, type OrderStatus } from '../data/schema'

export interface SalesOrderDraftItem {
  productId?: string | null
  productName: string
  productSku?: string | null
  variantId?: string | null
  variantSku?: string | null
  variantLabel?: string | null
  uomId?: string | null
  uomCode?: string | null
  uomName?: string | null
  quantity: number
  unitPrice: number
  discountAmount?: number
  taxAmount?: number
  subtotal: number
}

export interface SalesOrderDraftData {
  orderNumber?: string
  storeName?: string
  storeId?: string | null
  warehouseName?: string | null
  warehouseId?: string | null
  channelName?: string | null
  channelId?: string | null
  customerName?: string
  customerId?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  customerCode?: string | null
  orderDate?: string
  expectedDate?: string | null
  currency?: string
  notes?: string | null
  items: SalesOrderDraftItem[]
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
}

interface ReviewDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  draftData?: SalesOrderDraftData | null
  isSubmittingDraft?: boolean
  onConfirmDraftSubmit?: () => Promise<void> | void
}

export function SalesOrderReviewDialog({
  open,
  onOpenChange,
  draftData,
  isSubmittingDraft,
  onConfirmDraftSubmit,
}: ReviewDialogProps) {
  const { t } = useTranslation()
  const { open: contextOpen, setOpen: setContextOpen, currentRow } = useOrdersContext()
  const [copied, setCopied] = useState(false)

  const isDraftMode = Boolean(draftData)
  const isOpen = open !== undefined ? open : contextOpen === 'review'
  const handleClose = () => {
    if (onOpenChange) {
      onOpenChange(false)
    } else {
      setContextOpen(null)
    }
  }

  const orderId = isDraftMode ? undefined : currentRow?.id

  const { data: fullOrder, isLoading: isLoadingOrder } = useOrder(orderId)

  const orderNumber = isDraftMode
    ? draftData?.orderNumber || 'DRAFT'
    : fullOrder?.order_number || currentRow?.order_number || 'N/A'

  const status: OrderStatus = isDraftMode
    ? 'draft'
    : fullOrder?.status || currentRow?.status || 'draft'

  const storeName = isDraftMode
    ? draftData?.storeName || 'Default Store'
    : fullOrder?.stores?.name || 'N/A'

  const warehouseName = isDraftMode
    ? draftData?.warehouseName || null
    : fullOrder?.warehouses?.name || null

  const channelName = isDraftMode
    ? draftData?.channelName || null
    : fullOrder?.channels?.name || currentRow?.channels?.name || null

  const orderCustomer = isDraftMode ? null : fullOrder?.customers || currentRow?.customers
  const custDisplayName = isDraftMode
    ? draftData?.customerName || t('salesOrders.form.walkInCustomer', 'Walk-in Customer')
    : customerName(orderCustomer)
  const custName = custDisplayName

  const custPhone = isDraftMode
    ? draftData?.customerPhone
    : orderCustomer?.phone
  const customerPhone = custPhone

  const custEmail = isDraftMode
    ? draftData?.customerEmail
    : orderCustomer?.email

  const custCode = isDraftMode
    ? draftData?.customerCode
    : orderCustomer?.code

  const orderDate = isDraftMode
    ? draftData?.orderDate || new Date().toISOString()
    : fullOrder?.order_date || currentRow?.order_date || new Date().toISOString()

  const expectedDate = isDraftMode
    ? draftData?.expectedDate
    : fullOrder?.expected_date || currentRow?.expected_date

  const currency = isDraftMode
    ? draftData?.currency || 'USD'
    : fullOrder?.currency || currentRow?.currency || 'USD'

  const { data: currencies = [] } = useCurrencies({ onlyActive: true })
  const matchedCurrency = currencies.find((c) => c.code === currency)
  const currencySymbol = matchedCurrency?.symbol || (currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'SAR' ? '﷼' : currency === 'AED' ? 'د.إ' : `${currency} `)

  const notes = isDraftMode ? draftData?.notes : fullOrder?.notes || currentRow?.notes

  const lineItems: SalesOrderDraftItem[] = isDraftMode
    ? draftData?.items || []
    : (fullOrder?.sales_order_items || []).map((item) => ({
        productId: item.product_variants?.products?.id,
        productName:
          item.product_variants?.products?.name ||
          item.product_variants?.name ||
          `Product Variant #${item.product_variant_id.slice(0, 8)}`,
        productSku: item.product_variants?.products?.sku,
        variantId: item.product_variant_id,
        variantSku: item.product_variants?.sku || item.product_variant_id.slice(0, 8),
        variantLabel: item.product_variants?.name || undefined,
        uomId: item.uom_id,
        uomName: item.uoms?.name,
        uomCode: item.uoms?.code,
        quantity: Number(item.qty_ordered),
        unitPrice: Number(item.unit_price),
        discountAmount: Number(item.discount_amount),
        taxAmount: Number(item.tax_amount),
        subtotal: Number(item.line_total),
      }))

  const subtotal = isDraftMode
    ? draftData?.subtotal || 0
    : Number(fullOrder?.subtotal ?? currentRow?.subtotal ?? 0)

  const discountAmount = isDraftMode
    ? draftData?.discountAmount || 0
    : Number(fullOrder?.discount_amount ?? currentRow?.discount_amount ?? 0)

  const taxAmount = isDraftMode
    ? draftData?.taxAmount || 0
    : Number(fullOrder?.tax_amount ?? currentRow?.tax_amount ?? 0)

  const totalAmount = isDraftMode
    ? draftData?.totalAmount || 0
    : Number(fullOrder?.total_amount ?? currentRow?.total_amount ?? 0)

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
      `=== SALES ORDER SUMMARY ===`,
      `Order #: ${orderNumber}`,
      `Status: ${status.toUpperCase()}`,
      `Customer: ${custName}${customerPhone ? ` (${customerPhone})` : ''}`,
      `Store: ${storeName}${channelName ? ` [Channel: ${channelName}]` : ''}`,
      `Warehouse: ${warehouseName}`,
      `Order Date: ${formatDateDisplay(orderDate)}`,
      `Expected Delivery: ${formatDateDisplay(expectedDate)}`,
      `Currency: ${currency}`,
      `Total Line Items: ${totalItemsCount}`,
      `Total Units: ${totalQuantity}`,
      `Subtotal: ${currencySymbol}${subtotal.toFixed(2)}`,
      discountAmount > 0 ? `Discount: -${currencySymbol}${discountAmount.toFixed(2)}` : null,
      taxAmount > 0 ? `Tax: +${currencySymbol}${taxAmount.toFixed(2)}` : null,
      `Grand Total: ${currencySymbol}${totalAmount.toFixed(2)}`,
      ``,
      `--- Line Items ---`,
      ...lineItems.map(
        (it, idx) =>
          `${idx + 1}. ${it.productName} [SKU: ${it.variantSku}]${it.uomCode ? ` [UOM: ${it.uomCode}]` : ''} | Qty: ${it.quantity} x ${currencySymbol}${it.unitPrice.toFixed(2)}${it.discountAmount ? ` (Disc: ${currencySymbol}${it.discountAmount.toFixed(2)})` : ''}${it.taxAmount ? ` (Tax: ${currencySymbol}${it.taxAmount.toFixed(2)})` : ''} = ${currencySymbol}${it.subtotal.toFixed(2)}`
      ),
      ...(notes ? [``, `Notes: ${notes}`] : []),
    ].filter(Boolean) as string[]

    try {
      await navigator.clipboard.writeText(textLines.join('\n'))
      setCopied(true)
      toast.success(t('salesOrders.reviewDialog.copiedSuccess', 'Sales order summary copied to clipboard'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('salesOrders.reviewDialog.copiedError', 'Failed to copy summary'))
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className='max-h-[92vh] sm:max-w-4xl flex flex-col p-0 overflow-hidden print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none'>
        {/* Header - Screen view */}
        <div className='p-6 pb-4 border-b bg-muted/20 print:hidden'>
          <DialogHeader className='space-y-1.5'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-primary/10 rounded-lg text-primary'>
                  <Receipt className='h-6 w-6' />
                </div>
                <div>
                  <div className='flex items-center gap-2'>
                    <DialogTitle className='text-xl font-bold tracking-tight'>
                      {t('salesOrders.reviewDialog.title', 'Sales Order Review & Print')}
                    </DialogTitle>
                    <Badge
                      variant={isDraftMode ? 'outline' : 'secondary'}
                      className='font-mono font-bold text-xs'
                    >
                      {orderNumber}
                    </Badge>
                  </div>
                  <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                    {isDraftMode
                      ? t('salesOrders.reviewDialog.draftDesc', 'Review the order specifications and commercial breakdown before finalizing.')
                      : t('salesOrders.reviewDialog.savedDesc', 'Commercial sales order invoice, specifications, and fulfillment record.')}
                  </DialogDescription>
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <OrderStatusBadge status={status} />
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

        {/* Body Content - Screen & Print Wrapped */}
        <ScrollArea className='flex-1 p-6 print:p-0 print:overflow-visible'>
          {isLoadingOrder && !isDraftMode ? (
            <div className='py-16 text-center text-sm text-muted-foreground'>
              <div className='inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2' />
              <p>{t('salesOrders.reviewDialog.loadingDetails', 'Loading sales order details...')}</p>
            </div>
          ) : (
            <div data-print-content className='space-y-6 text-foreground'>
              {/* PRINT ONLY Header */}
              <div className='hidden print:block border-b pb-4 mb-6'>
                <div className='flex justify-between items-start'>
                  <div>
                    <h1 className='text-2xl font-bold tracking-tight text-black'>
                      {t('salesOrders.reviewDialog.printTitle', 'SALES ORDER / CONFIRMATION')}
                    </h1>
                    <p className='text-xs text-gray-500 font-mono mt-0.5'>
                      {t('salesOrders.reviewDialog.orderReference', 'Order Reference:')} {orderNumber}
                    </p>
                    <p className='text-xs text-gray-600 mt-1'>
                      {t('salesOrders.reviewDialog.issuedBy', 'Issued by:')} {storeName}
                      {channelName ? ` · ${t('salesOrders.form.channel', 'Channel')}: ${channelName}` : ''}
                    </p>
                  </div>
                  <div className='text-right'>
                    <div className='inline-block px-2.5 py-1 rounded bg-gray-100 text-xs font-bold uppercase tracking-wider text-gray-800 border'>
                      {t('salesOrders.columns.status', 'Status')}: {status}
                    </div>
                    <p className='text-xs text-gray-600 mt-2'>
                      {t('salesOrders.columns.orderDate', 'Date')}: {formatDateDisplay(orderDate)}
                    </p>
                    {expectedDate && (
                      <p className='text-xs text-gray-600'>
                        {t('salesOrders.reviewDialog.expectedDelivery', 'Expected Delivery:')} {formatDateDisplay(expectedDate)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Metadata Cards */}
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-2 print:gap-4'>
                {/* Customer Info */}
                <div className='rounded-lg border bg-card p-3.5 space-y-1 print:border-gray-300 print:bg-white'>
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium print:text-gray-500'>
                    <User className='h-3.5 w-3.5 text-primary print:text-black' />
                    <span>{t('salesOrders.form.customer', 'Customer')}</span>
                  </div>
                  <p className='text-sm font-semibold truncate text-foreground print:text-black'>
                    {custDisplayName}
                  </p>
                  <div className='text-xs text-muted-foreground space-y-0.5 print:text-gray-600'>
                    {custCode && <p className='font-mono text-[11px]'>ID: {custCode}</p>}
                    {custPhone && (
                      <p className='flex items-center gap-1'>
                        <Phone className='h-3 w-3 print:hidden' /> {custPhone}
                      </p>
                    )}
                    {custEmail && (
                      <p className='flex items-center gap-1 truncate'>
                        <Mail className='h-3 w-3 print:hidden' /> {custEmail}
                      </p>
                    )}
                  </div>
                </div>

                {/* Store Info */}
                <div className='rounded-lg border bg-card p-3.5 space-y-1 print:border-gray-300 print:bg-white'>
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium print:text-gray-500'>
                    <Building2 className='h-3.5 w-3.5 text-primary print:text-black' />
                    <span>{t('salesOrders.reviewDialog.storeChannel', 'Store / Sales Channel')}</span>
                  </div>
                  <p className='text-sm font-semibold truncate text-foreground print:text-black'>
                    {storeName}
                  </p>
                  {channelName && (
                    <p className='text-xs text-primary font-medium flex items-center gap-1 print:text-gray-700'>
                      <Globe className='h-3 w-3 print:hidden' />
                      <span>{channelName}</span>
                    </p>
                  )}
                  <p className='text-xs text-muted-foreground print:text-gray-600'>
                    {t('salesOrders.form.currency', 'Currency')}: <span className='font-mono font-medium'>{currency}</span>
                  </p>
                </div>

                {/* Fulfillment Location */}
                <div className='rounded-lg border bg-card p-3.5 space-y-1 print:border-gray-300 print:bg-white'>
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium print:text-gray-500'>
                    <Warehouse className='h-3.5 w-3.5 text-primary print:text-black' />
                    <span>{t('salesOrders.reviewDialog.fulfillmentLocation', 'Fulfillment Location')}</span>
                  </div>
                  <p className='text-sm font-semibold truncate text-foreground print:text-black'>
                    {warehouseName}
                  </p>
                  <p className='text-xs text-muted-foreground print:text-gray-600'>
                    {t('salesOrders.reviewDialog.stockDispatchOrigin', 'Stock dispatch origin')}
                  </p>
                </div>

                {/* Timeline */}
                <div className='rounded-lg border bg-card p-3.5 space-y-1 print:border-gray-300 print:bg-white'>
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium print:text-gray-500'>
                    <Calendar className='h-3.5 w-3.5 text-primary print:text-black' />
                    <span>{t('salesOrders.columns.orderDate', 'Order Date')}</span>
                  </div>
                  <p className='text-sm font-semibold text-foreground print:text-black'>
                    {formatDateDisplay(orderDate)}
                  </p>
                  {expectedDate && (
                    <p className='text-xs text-muted-foreground print:text-gray-600'>
                      {t('salesOrders.reviewDialog.estDelivery', 'Est. Delivery:')} {formatDateDisplay(expectedDate)}
                    </p>
                  )}
                </div>
              </div>

              {/* KPI Summary Strip - Screen Only */}
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/30 border rounded-xl p-4 print:hidden'>
                <div className='flex flex-col'>
                  <span className='text-xs text-muted-foreground font-medium flex items-center gap-1'>
                    <Package className='h-3.5 w-3.5' /> {t('salesOrders.reviewDialog.lineItems', 'Line Items')}
                  </span>
                  <span className='text-xl font-bold mt-1 text-foreground'>
                    {totalItemsCount}
                  </span>
                  <span className='text-[11px] text-muted-foreground'>{t('salesOrders.reviewDialog.distinctProducts', 'Distinct products')}</span>
                </div>

                <div className='flex flex-col'>
                  <span className='text-xs text-muted-foreground font-medium flex items-center gap-1'>
                    <Boxes className='h-3.5 w-3.5' /> {t('salesOrders.reviewDialog.totalUnits', 'Total Units')}
                  </span>
                  <span className='text-xl font-bold mt-1 text-foreground'>
                    {totalQuantity}
                  </span>
                  <span className='text-[11px] text-muted-foreground'>{t('salesOrders.reviewDialog.orderedQuantity', 'Ordered quantity')}</span>
                </div>

                <div className='flex flex-col'>
                  <span className='text-xs text-muted-foreground font-medium flex items-center gap-1'>
                    <Receipt className='h-3.5 w-3.5' /> {t('salesOrders.viewDialog.subtotal', 'Subtotal')}
                  </span>
                  <span className='text-xl font-bold mt-1 text-foreground'>
                    ${subtotal.toFixed(2)}
                  </span>
                  <span className='text-[11px] text-muted-foreground'>
                    {discountAmount > 0 ? `-$${discountAmount.toFixed(2)} ${t('salesOrders.reviewDialog.discounts', 'discounts')}` : t('salesOrders.reviewDialog.beforeTax', 'Before tax/discounts')}
                  </span>
                </div>

                <div className='flex flex-col text-right sm:text-left'>
                  <span className='text-xs text-muted-foreground font-medium flex items-center sm:justify-start justify-end gap-1'>
                    <DollarSign className='h-3.5 w-3.5 text-primary' /> {t('salesOrders.viewDialog.grandTotal', 'Grand Total')}
                  </span>
                  <span className='text-xl font-bold mt-1 text-primary'>
                    ${totalAmount.toFixed(2)}
                  </span>
                  <span className='text-[11px] text-muted-foreground'>{t('salesOrders.reviewDialog.netInvoicePayable', 'Net invoice payable')}</span>
                </div>
              </div>

              {/* Line Items Section */}
              <div className='space-y-2.5'>
                <div className='flex items-center justify-between print:mb-2'>
                  <h4 className='text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 print:text-black'>
                    <Layers className='h-3.5 w-3.5 text-primary print:text-black' />
                    {t('salesOrders.reviewDialog.orderedItemsBreakdown', 'Ordered Items Breakdown')} ({lineItems.length})
                  </h4>
                </div>

                <div className='rounded-lg border overflow-hidden bg-card print:border-gray-300 print:bg-white'>
                  <Table>
                    <TableHeader className='bg-muted/50 print:bg-gray-100'>
                      <TableRow className='print:border-b-gray-300'>
                        <TableHead className='w-12 text-center font-bold text-xs print:text-black'>#</TableHead>
                        <TableHead className='font-bold text-xs print:text-black'>{t('salesOrders.reviewDialog.product', 'Product')}</TableHead>
                        <TableHead className='font-bold text-xs print:text-black'>{t('salesOrders.reviewDialog.variantSku', 'Variant / SKU')}</TableHead>
                        <TableHead className='w-20 text-center font-bold text-xs print:text-black'>{t('salesOrders.itemsTable.uom', 'UOM')}</TableHead>
                        <TableHead className='w-20 text-center font-bold text-xs print:text-black'>{t('salesOrders.reviewDialog.qty', 'Qty')}</TableHead>
                        <TableHead className='w-24 text-right font-bold text-xs print:text-black'>{t('salesOrders.itemsTable.unitPrice', 'Unit Price')}</TableHead>
                        {discountAmount > 0 && (
                          <TableHead className='w-20 text-right font-bold text-xs print:text-black'>{t('salesOrders.reviewDialog.disc', 'Disc')}</TableHead>
                        )}
                        {taxAmount > 0 && (
                          <TableHead className='w-20 text-right font-bold text-xs print:text-black'>{t('salesOrders.itemsTable.tax', 'Tax')}</TableHead>
                        )}
                        <TableHead className='w-28 text-right font-bold text-xs print:text-black'>{t('salesOrders.itemsTable.lineTotal', 'Line Total')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className='py-8 text-center text-sm text-muted-foreground'
                          >
                            {t('salesOrders.reviewDialog.noItems', 'No line items present in this sales order.')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        lineItems.map((item, idx) => (
                          <TableRow key={idx} className='hover:bg-muted/20 print:border-b-gray-200'>
                            <TableCell className='text-center text-xs text-muted-foreground font-mono print:text-black'>
                              {idx + 1}
                            </TableCell>
                            <TableCell>
                              <div className='font-medium text-sm text-foreground print:text-black'>
                                {item.productName}
                              </div>
                              {item.productSku && (
                                <div className='font-mono text-xs text-muted-foreground print:text-gray-600'>
                                  SKU: {item.productSku}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className='flex items-center gap-1.5'>
                                <Badge variant='outline' className='font-mono text-xs print:border-gray-300 print:text-black'>
                                  {item.variantSku}
                                </Badge>
                                {item.variantLabel && (
                                  <span className='text-xs text-muted-foreground print:text-gray-600'>
                                    ({item.variantLabel})
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className='text-center'>
                              {item.uomCode || item.uomName ? (
                                <Badge variant='outline' className='font-mono text-xs print:border-gray-300 print:text-black'>
                                  {item.uomCode || item.uomName}
                                </Badge>
                              ) : (
                                <span className='text-xs text-muted-foreground'>—</span>
                              )}
                            </TableCell>
                            <TableCell className='text-center font-medium print:text-black'>
                              {item.quantity}
                            </TableCell>
                            <TableCell className='text-right font-mono text-sm print:text-black'>
                              {currencySymbol}{item.unitPrice.toFixed(2)}
                            </TableCell>
                            {discountAmount > 0 && (
                              <TableCell className='text-right font-mono text-xs text-rose-600 print:text-black'>
                                {item.discountAmount ? `-${currencySymbol}${item.discountAmount.toFixed(2)}` : '—'}
                              </TableCell>
                            )}
                            {taxAmount > 0 && (
                              <TableCell className='text-right font-mono text-xs text-muted-foreground print:text-black'>
                                {item.taxAmount ? `+${currencySymbol}${item.taxAmount.toFixed(2)}` : '—'}
                              </TableCell>
                            )}
                            <TableCell className='text-right font-mono font-semibold text-sm print:text-black'>
                              {currencySymbol}{item.subtotal.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals & Calculations Section */}
              <div className='flex flex-col sm:flex-row justify-between items-start gap-4 pt-2'>
                {/* Notes & Instructions */}
                <div className='w-full sm:w-1/2 space-y-2'>
                  {notes ? (
                    <div className='rounded-lg border bg-muted/20 p-4 space-y-1 print:border-gray-300 print:bg-white'>
                      <h4 className='text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5 print:text-black'>
                        <FileText className='h-3.5 w-3.5' />
                        {t('salesOrders.reviewDialog.notesTitle', 'Notes & Special Instructions')}
                      </h4>
                      <p className='text-sm text-foreground whitespace-pre-wrap print:text-black'>
                        {notes}
                      </p>
                    </div>
                  ) : (
                    <div className='p-3 border border-dashed rounded-lg text-xs text-muted-foreground print:border-gray-200'>
                      {t('salesOrders.reviewDialog.standardTerms', 'Standard commercial sales order. Terms subject to agreement.')}
                    </div>
                  )}
                </div>

                {/* Financial Summary Box */}
                <div className='w-full sm:w-80 rounded-lg border bg-card p-4 space-y-2.5 print:border-gray-300 print:bg-white'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground print:text-gray-600'>{t('salesOrders.viewDialog.subtotal', 'Subtotal')}</span>
                    <span className='font-mono font-medium print:text-black'>{currencySymbol}{subtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className='flex justify-between text-sm text-rose-600 print:text-black'>
                      <span>{t('salesOrders.reviewDialog.discountTotal', 'Discount Total')}</span>
                      <span className='font-mono font-medium'>-{currencySymbol}{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {taxAmount > 0 && (
                    <div className='flex justify-between text-sm text-muted-foreground print:text-gray-600'>
                      <span>{t('salesOrders.reviewDialog.taxAmount', 'Tax Amount')}</span>
                      <span className='font-mono font-medium print:text-black'>+{currencySymbol}{taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className='border-t pt-2 flex justify-between items-baseline print:border-t-gray-400'>
                    <span className='text-base font-bold print:text-black'>{t('salesOrders.reviewDialog.totalPayable', 'Total Payable')}</span>
                    <span className='font-mono text-xl font-extrabold text-primary print:text-black'>
                      {currencySymbol}{totalAmount.toFixed(2)} <span className='text-xs font-normal text-muted-foreground'>{currency}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* PRINT ONLY Signature Lines */}
              <div className='hidden print:grid grid-cols-2 gap-12 pt-16 mt-12 border-t border-gray-300'>
                <div>
                  <div className='border-t border-black pt-2'>
                    <p className='font-bold text-xs text-black'>{t('salesOrders.reviewDialog.preparedBy', 'Prepared By / Sales Representative')}</p>
                    <p className='text-[10px] text-gray-500 mt-0.5'>{t('salesOrders.reviewDialog.signatureStamp', 'Signature & Stamp')}</p>
                  </div>
                </div>
                <div>
                  <div className='border-t border-black pt-2'>
                    <p className='font-bold text-xs text-black'>{t('salesOrders.reviewDialog.customerAcceptance', 'Customer Acceptance / Authorized Recipient')}</p>
                    <p className='text-[10px] text-gray-500 mt-0.5'>{t('salesOrders.reviewDialog.signatureDate', 'Signature & Date')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions - Screen Only */}
        <div className='p-4 border-t bg-muted/20 print:hidden'>
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
                  {t('salesOrders.reviewDialog.backToEdit', 'Back to Edit')}
                </Button>

                <Button
                  type='button'
                  size='sm'
                  onClick={() => onConfirmDraftSubmit?.()}
                  disabled={isSubmittingDraft}
                >
                  <CheckCircle2 className='mr-1.5 h-4 w-4' />
                  {isSubmittingDraft ? t('salesOrders.reviewDialog.savingOrder', 'Saving Order...') : t('salesOrders.reviewDialog.confirmAndCreate', 'Confirm & Create Order')}
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
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handlePrint}
                  >
                    <Printer className='mr-1.5 h-4 w-4' />
                    {t('salesOrders.reviewDialog.printOrder', 'Print Order')}
                  </Button>
                </div>
              </>
            )}
          </DialogFooter>
        </div>
      </DialogContent>

      {/* Embedded Print Styling */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          [data-print-content], [data-print-content] * {
            visibility: visible !important;
          }
          [data-print-content] {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </Dialog>
  )
}
