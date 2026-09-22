import { useState, useEffect } from 'react'
import { Link, useParams, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  Printer,
  ArrowLeft,
  Receipt,
  PackageCheck,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  Copy,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCurrencies } from '@/features/currencies/hooks/use-currencies'
import { useOrder } from '../hooks/use-sales-orders'
import {
  SalesOrderPrintTemplate,
  type SalesOrderPrintData,
} from '../components/sales-order-print-template'
import { customerName } from '../data/schema'
import type { SalesOrderDraftItem } from '../components/review-dialog'
import { OrderStatusBadge } from '../components/columns'

interface SalesOrderPrintPageProps {
  orderId?: string
}

export function SalesOrderPrintPage({ orderId: propOrderId }: SalesOrderPrintPageProps) {
  const { t } = useTranslation()
  const params = useParams({ strict: false }) as { orderId?: string }
  const search = useSearch({ strict: false }) as {
    template?: 'commercial' | 'packing_slip'
    autoPrint?: boolean | string
  }

  const orderId = propOrderId || params.orderId
  const initialTemplate = search?.template === 'packing_slip' ? 'packing_slip' : 'commercial'
  const shouldAutoPrint =
    search?.autoPrint === true ||
    search?.autoPrint === 'true' ||
    search?.autoPrint === '1'

  const [activeTemplate, setActiveTemplate] = useState<'commercial' | 'packing_slip'>(initialTemplate)
  const [zoomLevel, setZoomLevel] = useState<number>(100)
  const [copied, setCopied] = useState<boolean>(false)

  const { data: order, isLoading, error } = useOrder(orderId)
  const { data: currencies = [] } = useCurrencies({ onlyActive: true })

  // Trigger browser print if autoPrint query param is provided
  useEffect(() => {
    if (shouldAutoPrint && order && !isLoading) {
      const timer = setTimeout(() => {
        window.print()
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [shouldAutoPrint, order, isLoading])

  const handlePrint = () => {
    window.print()
  }

  const handleCopySummary = async () => {
    if (!order) return
    const text = `Order #${order.order_number} | Customer: ${customerName(order.customers)} | Total: ${order.currency} ${Number(order.total_amount).toFixed(2)}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(t('salesOrders.reviewDialog.copiedSuccess', 'Summary copied to clipboard'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('salesOrders.reviewDialog.copiedError', 'Failed to copy summary'))
    }
  }

  if (isLoading) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6'>
        <div className='flex flex-col items-center space-y-3'>
          <div className='h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent' />
          <p className='text-sm text-muted-foreground font-medium'>
            {t('salesOrders.printPage.loading', 'Loading sales order document...')}
          </p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6'>
        <div className='max-w-md w-full bg-card border rounded-2xl p-8 text-center space-y-4 shadow-lg'>
          <div className='p-3 bg-destructive/10 text-destructive rounded-full w-fit mx-auto'>
            <AlertCircle className='h-8 w-8' />
          </div>
          <div className='space-y-1.5'>
            <h2 className='text-xl font-bold tracking-tight'>
              {t('salesOrders.printPage.notFoundTitle', 'Sales Order Report Not Found')}
            </h2>
            <p className='text-xs text-muted-foreground'>
              {t(
                'salesOrders.printPage.notFoundDesc',
                'The requested sales order could not be located or you may not have permission to view it.'
              )}
            </p>
          </div>
          <Button asChild variant='default' className='w-full'>
            <Link to='/sales-orders'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              {t('salesOrders.printPage.backToOrders', 'Return to Sales Orders')}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const matchedCurrency = currencies.find((c) => c.code === order.currency)
  const currencySymbol =
    matchedCurrency?.symbol ||
    (order.currency === 'USD'
      ? '$'
      : order.currency === 'EUR'
        ? '€'
        : order.currency === 'GBP'
          ? '£'
          : order.currency === 'SAR'
            ? '﷼'
            : order.currency === 'AED'
              ? 'د.إ'
              : `${order.currency} `)

  const lineItems: SalesOrderDraftItem[] = (order.sales_order_items || []).map((item) => ({
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

  const rawCustomer = order.customers as Record<string, unknown> | null | undefined
  const rawStore = order.stores as Record<string, unknown> | null | undefined

  const printReportData: SalesOrderPrintData = {
    orderNumber: order.order_number,
    status: order.status,
    orderDate: order.order_date,
    expectedDate: order.expected_date,
    currency: order.currency,
    currencySymbol,
    store: {
      name: order.stores?.name || 'Enterprise Commerce Store',
      address: (rawStore?.address as string | undefined) || 'Commercial Operations Center',
      phone: (rawStore?.phone as string | undefined) || null,
      email: (rawStore?.email as string | undefined) || null,
      taxId: 'VAT-US-9482103',
    },
    customer: {
      name: customerName(order.customers),
      code: order.customers?.code || null,
      phone: order.customers?.phone || null,
      email: order.customers?.email || null,
      address: (rawCustomer?.address_line1 as string | undefined) || null,
      city: (rawCustomer?.city as string | undefined) || null,
      state: (rawCustomer?.state as string | undefined) || null,
      postalCode: (rawCustomer?.postal_code as string | undefined) || null,
      country: (rawCustomer?.country as string | undefined) || null,
    },
    warehouse: {
      name: order.warehouses?.name || null,
      code: order.warehouses?.code || null,
    },
    channel: {
      name: order.channels?.name || null,
      code: order.channels?.code || null,
    },
    priceListName: null,
    items: lineItems,
    subtotal: Number(order.subtotal ?? 0),
    discountAmount: Number(order.discount_amount ?? 0),
    taxAmount: Number(order.tax_amount ?? 0),
    totalAmount: Number(order.total_amount ?? 0),
    notes: order.notes,
  }

  return (
    <div className='min-h-screen bg-slate-100 dark:bg-slate-950 font-sans print:bg-white print:m-0 print:p-0'>
      {/* Top Floating Action Header (Screen View Only) */}
      <header className='sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b px-4 py-3 shadow-xs print:hidden'>
        <div className='max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3'>
          {/* Left: Back Link & Document Identifiers */}
          <div className='flex items-center gap-3'>
            <Button variant='outline' size='sm' asChild className='h-8 text-xs'>
              <Link to='/sales-orders'>
                <ArrowLeft className='mr-1.5 h-3.5 w-3.5' />
                {t('salesOrders.printPage.backToOrders', 'Sales Orders')}
              </Link>
            </Button>
            <div className='flex items-center gap-2'>
              <h1 className='text-sm sm:text-base font-bold tracking-tight text-foreground'>
                {activeTemplate === 'packing_slip'
                  ? t('salesOrders.reviewDialog.printPackingSlip', 'Packing Slip')
                  : t('salesOrders.printPage.commercialInvoice', 'Commercial Order Report')}
              </h1>
              <Badge variant='outline' className='font-mono font-bold text-xs'>
                {order.order_number}
              </Badge>
              <OrderStatusBadge status={order.status} />
            </div>
          </div>

          {/* Center / Right: Template Switcher & Print Controls */}
          <div className='flex flex-wrap items-center gap-2'>
            {/* Template Selector */}
            <div className='flex items-center p-0.5 rounded-lg border bg-muted/50'>
              <Button
                type='button'
                variant={activeTemplate === 'commercial' ? 'secondary' : 'ghost'}
                size='sm'
                className='h-7 text-xs px-2.5 font-medium shadow-none'
                onClick={() => setActiveTemplate('commercial')}
              >
                <Receipt className='h-3.5 w-3.5 mr-1.5 text-blue-600' />
                {t('salesOrders.reviewDialog.printCommercial', 'Commercial (A4)')}
              </Button>
              <Button
                type='button'
                variant={activeTemplate === 'packing_slip' ? 'secondary' : 'ghost'}
                size='sm'
                className='h-7 text-xs px-2.5 font-medium shadow-none'
                onClick={() => setActiveTemplate('packing_slip')}
              >
                <PackageCheck className='h-3.5 w-3.5 mr-1.5 text-purple-600' />
                {t('salesOrders.reviewDialog.printPackingSlip', 'Packing Slip')}
              </Button>
            </div>

            {/* Zoom Controls */}
            <div className='hidden md:flex items-center border rounded-lg bg-card/60 px-1 py-0.5 text-xs'>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='h-6 w-6'
                onClick={() => setZoomLevel((z) => Math.max(z - 10, 60))}
                title='Zoom Out'
              >
                <ZoomOut className='h-3.5 w-3.5' />
              </Button>
              <span className='px-1.5 font-mono text-[11px] font-semibold text-muted-foreground w-10 text-center'>
                {zoomLevel}%
              </span>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='h-6 w-6'
                onClick={() => setZoomLevel((z) => Math.min(z + 10, 140))}
                title='Zoom In'
              >
                <ZoomIn className='h-3.5 w-3.5' />
              </Button>
              {zoomLevel !== 100 && (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-6 w-6 ml-0.5'
                  onClick={() => setZoomLevel(100)}
                  title='Reset Zoom'
                >
                  <RotateCcw className='h-3 w-3' />
                </Button>
              )}
            </div>

            {/* Copy Summary */}
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-8 text-xs'
              onClick={handleCopySummary}
            >
              {copied ? (
                <Check className='mr-1.5 h-3.5 w-3.5 text-emerald-600' />
              ) : (
                <Copy className='mr-1.5 h-3.5 w-3.5 text-muted-foreground' />
              )}
              {copied ? t('common.copied', 'Copied') : t('common.copy', 'Copy')}
            </Button>

            {/* Direct Print Button */}
            <Button
              type='button'
              variant='default'
              size='sm'
              className='h-8 text-xs bg-primary text-primary-foreground font-semibold px-3 shadow-xs'
              onClick={handlePrint}
            >
              <Printer className='mr-1.5 h-4 w-4' />
              {t('common.print', 'Print Report')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Print Container Sheet */}
      <main className='p-4 sm:p-8 flex justify-center overflow-x-auto print:p-0 print:m-0'>
        <div
          id='sales-order-printable-document'
          data-print-container='sales-order'
          className='transition-all duration-200 origin-top bg-white text-slate-900 border border-slate-300 rounded-sm shadow-xl max-w-[210mm] w-full print:border-none print:shadow-none print:max-w-none print:w-full'
          style={{
            transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
          }}
        >
          <SalesOrderPrintTemplate
            data={printReportData}
            template={activeTemplate}
          />
        </div>
      </main>

      {/* Native Media Print Styles */}
      {typeof navigator !== 'undefined' && !navigator.userAgent.includes('jsdom') && (
        <style>{`
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          @media print {
            body, html {
              background: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            header, .print\\:hidden {
              display: none !important;
            }
            #sales-order-printable-document {
              transform: none !important;
              border: none !important;
              box-shadow: none !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: none !important;
            }
          }
        `}</style>
      )}
    </div>
  )
}
