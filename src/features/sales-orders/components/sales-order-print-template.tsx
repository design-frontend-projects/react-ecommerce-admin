import { QRCodeSVG } from 'qrcode.react'
import Barcode from 'react-barcode'
import {
  Building2,
  Calendar,
  Layers,
  MapPin,
  Phone,
  Mail,
  User,
  Warehouse,
  Globe,
  Receipt,
  CheckSquare,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '../data/schema'
import type { SalesOrderDraftItem } from './review-dialog'

export interface PrintTemplateParty {
  name: string
  code?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
}

export interface SalesOrderPrintData {
  orderNumber: string
  status: OrderStatus
  orderDate: string
  expectedDate?: string | null
  currency: string
  currencySymbol: string
  store: {
    name: string
    address?: string | null
    phone?: string | null
    email?: string | null
    taxId?: string | null
  }
  customer: PrintTemplateParty
  warehouse?: {
    name?: string | null
    code?: string | null
  } | null
  channel?: {
    name?: string | null
    code?: string | null
  } | null
  priceListName?: string | null
  items: SalesOrderDraftItem[]
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  notes?: string | null
  terms?: string | null
  bankDetails?: {
    bankName?: string
    accountName?: string
    accountNumber?: string
    swiftCode?: string
    routingNumber?: string
  }
}

export interface SalesOrderPrintTemplateProps {
  data: SalesOrderPrintData
  template?: 'commercial' | 'packing_slip'
  className?: string
}

function StatusStamp({ status }: { status: OrderStatus }) {
  const stampConfig: Record<
    OrderStatus,
    { label: string; borderColor: string; textColor: string; bgTint: string }
  > = {
    draft: {
      label: '★ DRAFT PREVIEW ★',
      borderColor: 'border-slate-500',
      textColor: 'text-slate-600',
      bgTint: 'bg-slate-50/50',
    },
    confirmed: {
      label: '★ ORDER CONFIRMED ★',
      borderColor: 'border-blue-600',
      textColor: 'text-blue-700',
      bgTint: 'bg-blue-50/60',
    },
    picking: {
      label: '★ IN PICKING ★',
      borderColor: 'border-amber-600',
      textColor: 'text-amber-700',
      bgTint: 'bg-amber-50/60',
    },
    packed: {
      label: '★ PACKED & VERIFIED ★',
      borderColor: 'border-purple-600',
      textColor: 'text-purple-700',
      bgTint: 'bg-purple-50/60',
    },
    delivered: {
      label: '★ DISPATCHED / DELIVERED ★',
      borderColor: 'border-emerald-600',
      textColor: 'text-emerald-700',
      bgTint: 'bg-emerald-50/60',
    },
    invoiced: {
      label: '★ INVOICE ISSUED ★',
      borderColor: 'border-teal-600',
      textColor: 'text-teal-700',
      bgTint: 'bg-teal-50/60',
    },
    completed: {
      label: '★ FULFILLED & CLOSED ★',
      borderColor: 'border-emerald-700',
      textColor: 'text-emerald-800',
      bgTint: 'bg-emerald-50/80',
    },
    cancelled: {
      label: '★ VOID / CANCELLED ★',
      borderColor: 'border-rose-600',
      textColor: 'text-rose-700',
      bgTint: 'bg-rose-50/60',
    },
  }

  const conf = stampConfig[status] || stampConfig.draft

  return (
    <div
      className={cn(
        'inline-flex flex-col items-center justify-center px-3.5 py-1 border-2 border-dashed rounded-md transform -rotate-3 select-none pointer-events-none transition-transform',
        conf.borderColor,
        conf.textColor,
        conf.bgTint
      )}
      style={{
        boxShadow: '0 0 0 2px rgba(255,255,255,0.8) inset',
      }}
    >
      <span className='text-[9px] font-black uppercase tracking-widest leading-none'>
        OFFICIAL STATUS
      </span>
      <span className='text-xs font-black uppercase tracking-wider mt-0.5 whitespace-nowrap'>
        {conf.label}
      </span>
    </div>
  )
}

export function SalesOrderPrintTemplate({
  data,
  template = 'commercial',
  className,
}: SalesOrderPrintTemplateProps) {
  const isPackingSlip = template === 'packing_slip'
  const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0)

  // Safe barcode text (alphanumeric only for code128 standard)
  const barcodeValue = (data.orderNumber || 'DRAFT').replace(/[^A-Za-z0-9_-]/g, '')

  // QR Code payload for digital verification
  const qrVerificationPayload = JSON.stringify({
    type: 'SALES_ORDER',
    orderNo: data.orderNumber,
    date: data.orderDate,
    customer: data.customer.name,
    total: `${data.currency} ${data.totalAmount.toFixed(2)}`,
    status: data.status,
  })

  // Format customer address lines
  const customerAddressParts = [
    data.customer.address,
    data.customer.city,
    data.customer.state,
    data.customer.postalCode,
    data.customer.country,
  ].filter(Boolean)

  const formattedCustomerAddress = customerAddressParts.length > 0
    ? customerAddressParts.join(', ')
    : null

  return (
    <div
      className={cn(
        'w-full max-w-[210mm] mx-auto bg-white text-slate-900 p-8 sm:p-10 print:p-0 font-sans shadow-sm print:shadow-none transition-all',
        className
      )}
      style={{
        color: '#0f172a',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Top Decorative Accent Bar */}
      <div className='h-2 w-full bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-500 rounded-t-sm mb-6 print:mb-4' />

      {/* Header Section */}
      <div className='flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-slate-200'>
        {/* Company Identity */}
        <div className='space-y-1.5 max-w-sm'>
          <div className='flex items-center gap-2'>
            <div className='h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm print:shadow-none'>
              <Receipt className='h-5 w-5' />
            </div>
            <div>
              <h1 className='text-xl font-extrabold tracking-tight text-slate-900 leading-tight'>
                {data.store.name || 'Enterprise Commerce'}
              </h1>
              <p className='text-[10px] uppercase font-bold tracking-wider text-blue-600'>
                Sales & Order Fulfillment Record
              </p>
            </div>
          </div>

          <div className='text-xs text-slate-600 space-y-0.5 pt-1'>
            {data.store.address && (
              <p className='flex items-center gap-1.5'>
                <MapPin className='h-3.5 w-3.5 text-slate-400 shrink-0' />
                <span>{data.store.address}</span>
              </p>
            )}
            <div className='flex flex-wrap gap-x-3 gap-y-0.5 text-slate-600'>
              {data.store.phone && (
                <span className='flex items-center gap-1'>
                  <Phone className='h-3 w-3 text-slate-400' /> {data.store.phone}
                </span>
              )}
              {data.store.email && (
                <span className='flex items-center gap-1'>
                  <Mail className='h-3 w-3 text-slate-400' /> {data.store.email}
                </span>
              )}
            </div>
            <p className='text-[11px] font-mono text-slate-500 pt-0.5'>
              Tax/VAT ID: {data.store.taxId || 'VAT-REG-9482103'}
            </p>
          </div>
        </div>

        {/* Document Title & Reference Badges */}
        <div className='flex flex-col items-start sm:items-end text-left sm:text-right space-y-2'>
          <div className='space-y-0.5'>
            <div className='text-xs font-black tracking-wider uppercase text-blue-700'>
              {isPackingSlip ? 'WAREHOUSE DISPATCH' : 'OFFICIAL DOCUMENT'}
            </div>
            <h2 className='text-2xl font-black text-slate-900 tracking-tight'>
              {isPackingSlip ? 'PACKING & DELIVERY SLIP' : 'COMMERCIAL SALES ORDER'}
            </h2>
          </div>

          <div className='flex flex-wrap items-center justify-start sm:justify-end gap-2 pt-1'>
            <div className='px-2.5 py-1 bg-slate-100 rounded border border-slate-300 text-xs font-mono font-bold text-slate-800'>
              REF: {data.orderNumber}
            </div>
            <StatusStamp status={data.status} />
          </div>

          {/* Barcode representation */}
          {barcodeValue && (
            <div className='pt-1 hidden sm:block'>
              <Barcode
                value={barcodeValue}
                width={1.2}
                height={32}
                fontSize={10}
                margin={0}
                background='transparent'
                lineColor='#0f172a'
                displayValue={false}
              />
            </div>
          )}
        </div>
      </div>

      {/* Metadata & Logistics Banner */}
      <div className='grid grid-cols-1 md:grid-cols-12 gap-4 py-5 border-b border-slate-200'>
        {/* Bill & Ship To Customer Card */}
        <div className='md:col-span-6 bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5'>
              <User className='h-3.5 w-3.5 text-blue-600' />
              {isPackingSlip ? 'Deliver & Consignee To' : 'Bill & Deliver To'}
            </span>
            {data.customer.code && (
              <span className='text-[10px] font-mono px-1.5 py-0.5 bg-white border border-slate-200 rounded font-medium text-slate-600'>
                ID: {data.customer.code}
              </span>
            )}
          </div>

          <div>
            <h3 className='text-base font-bold text-slate-900'>
              {data.customer.name}
            </h3>
            {formattedCustomerAddress && (
              <p className='text-xs text-slate-600 mt-1 leading-relaxed flex items-start gap-1.5'>
                <MapPin className='h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5' />
                <span>{formattedCustomerAddress}</span>
              </p>
            )}
          </div>

          <div className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 pt-1'>
            {data.customer.phone && (
              <span className='flex items-center gap-1'>
                <Phone className='h-3 w-3 text-slate-400' /> {data.customer.phone}
              </span>
            )}
            {data.customer.email && (
              <span className='flex items-center gap-1'>
                <Mail className='h-3 w-3 text-slate-400' /> {data.customer.email}
              </span>
            )}
          </div>
        </div>

        {/* Commercial & Logistics Specifications */}
        <div className='md:col-span-6 bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2.5'>
          <div className='flex items-center justify-between'>
            <span className='text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5'>
              <Building2 className='h-3.5 w-3.5 text-blue-600' />
              Logistics & Commercial Details
            </span>
            <span className='text-[10px] font-mono font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded'>
              {data.currency}
            </span>
          </div>

          <div className='grid grid-cols-2 gap-2.5 text-xs'>
            <div>
              <span className='text-slate-400 block text-[10px] font-medium uppercase'>
                Order Date
              </span>
              <span className='font-semibold text-slate-800 flex items-center gap-1 mt-0.5'>
                <Calendar className='h-3 w-3 text-slate-400' />
                {data.orderDate ? new Date(data.orderDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
              </span>
            </div>

            <div>
              <span className='text-slate-400 block text-[10px] font-medium uppercase'>
                Expected Delivery
              </span>
              <span className='font-semibold text-slate-800 flex items-center gap-1 mt-0.5'>
                <Calendar className='h-3 w-3 text-slate-400' />
                {data.expectedDate ? new Date(data.expectedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Immediate / Standard'}
              </span>
            </div>

            <div>
              <span className='text-slate-400 block text-[10px] font-medium uppercase'>
                Fulfillment Origin
              </span>
              <span className='font-semibold text-slate-800 flex items-center gap-1 mt-0.5 truncate'>
                <Warehouse className='h-3 w-3 text-slate-400 shrink-0' />
                {data.warehouse?.name || 'Primary Distribution Center'}
              </span>
            </div>

            <div>
              <span className='text-slate-400 block text-[10px] font-medium uppercase'>
                Sales Channel
              </span>
              <span className='font-semibold text-slate-800 flex items-center gap-1 mt-0.5 truncate'>
                <Globe className='h-3 w-3 text-slate-400 shrink-0' />
                {data.channel?.name || 'Direct Sales'}
                {data.priceListName && (
                  <span className='text-[10px] font-normal text-slate-500 ml-1'>
                    ({data.priceListName})
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className='py-6'>
        <div className='flex items-center justify-between mb-3'>
          <h4 className='text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5'>
            <Layers className='h-3.5 w-3.5 text-blue-600' />
            {isPackingSlip ? 'Items Picklist & Verification' : 'Commercial Items Specification'}
            <span className='text-slate-400 font-normal'>
              ({data.items.length} line {data.items.length === 1 ? 'item' : 'items'}, {totalQuantity} units)
            </span>
          </h4>
        </div>

        <div className='rounded-lg border border-slate-300 overflow-hidden shadow-xs'>
          <table className='w-full text-left text-xs border-collapse'>
            <thead>
              <tr className='bg-slate-800 text-white font-bold border-b border-slate-700'>
                <th className='py-2.5 px-3 w-10 text-center text-[11px] uppercase tracking-wider'>#</th>
                {isPackingSlip && (
                  <th className='py-2.5 px-3 w-12 text-center text-[11px] uppercase tracking-wider'>
                    Pick
                  </th>
                )}
                <th className='py-2.5 px-3 text-[11px] uppercase tracking-wider'>
                  Product Description
                </th>
                <th className='py-2.5 px-3 w-32 text-[11px] uppercase tracking-wider'>
                  Variant / SKU
                </th>
                <th className='py-2.5 px-3 w-16 text-center text-[11px] uppercase tracking-wider'>
                  UOM
                </th>
                <th className='py-2.5 px-3 w-16 text-center text-[11px] uppercase tracking-wider'>
                  Qty
                </th>
                {!isPackingSlip && (
                  <>
                    <th className='py-2.5 px-3 w-24 text-right text-[11px] uppercase tracking-wider'>
                      Unit Price
                    </th>
                    {data.discountAmount > 0 && (
                      <th className='py-2.5 px-3 w-20 text-right text-[11px] uppercase tracking-wider'>
                        Disc
                      </th>
                    )}
                    {data.taxAmount > 0 && (
                      <th className='py-2.5 px-3 w-20 text-right text-[11px] uppercase tracking-wider'>
                        Tax
                      </th>
                    )}
                    <th className='py-2.5 px-3 w-28 text-right text-[11px] uppercase tracking-wider'>
                      Line Total
                    </th>
                  </>
                )}
                {isPackingSlip && (
                  <th className='py-2.5 px-3 w-32 text-left text-[11px] uppercase tracking-wider'>
                    Location / Notes
                  </th>
                )}
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-200'>
              {data.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={isPackingSlip ? 6 : 8}
                    className='py-8 text-center text-slate-400 italic text-sm'
                  >
                    No items in this order.
                  </td>
                </tr>
              ) : (
                data.items.map((item, idx) => (
                  <tr
                    key={idx}
                    className={cn(
                      'page-break-inside-avoid transition-colors',
                      idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
                    )}
                  >
                    <td className='py-3 px-3 text-center text-slate-500 font-mono font-medium'>
                      {idx + 1}
                    </td>

                    {isPackingSlip && (
                      <td className='py-3 px-3 text-center'>
                        <div className='h-4 w-4 mx-auto border-2 border-slate-400 rounded-xs bg-white' />
                      </td>
                    )}

                    <td className='py-3 px-3'>
                      <div className='font-bold text-slate-900 text-xs sm:text-sm'>
                        {item.productName}
                      </div>
                      {item.productSku && (
                        <div className='font-mono text-[11px] text-slate-500'>
                          Catalog SKU: {item.productSku}
                        </div>
                      )}
                    </td>

                    <td className='py-3 px-3'>
                      <div className='font-mono text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 inline-block'>
                        {item.variantSku || 'STANDARD'}
                      </div>
                      {item.variantLabel && (
                        <div className='text-[10px] text-slate-500 mt-0.5'>
                          {item.variantLabel}
                        </div>
                      )}
                    </td>

                    <td className='py-3 px-3 text-center'>
                      <span className='font-mono text-xs uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold'>
                        {item.uomCode || item.uomName || 'PCS'}
                      </span>
                    </td>

                    <td className='py-3 px-3 text-center'>
                      <span className='font-bold text-sm text-slate-900'>
                        {item.quantity}
                      </span>
                    </td>

                    {!isPackingSlip && (
                      <>
                        <td className='py-3 px-3 text-right font-mono font-medium text-slate-800'>
                          {data.currencySymbol}{item.unitPrice.toFixed(2)}
                        </td>

                        {data.discountAmount > 0 && (
                          <td className='py-3 px-3 text-right font-mono text-xs text-rose-600'>
                            {item.discountAmount ? `-${data.currencySymbol}${item.discountAmount.toFixed(2)}` : '—'}
                          </td>
                        )}

                        {data.taxAmount > 0 && (
                          <td className='py-3 px-3 text-right font-mono text-xs text-slate-600'>
                            {item.taxAmount ? `+${data.currencySymbol}${item.taxAmount.toFixed(2)}` : '—'}
                          </td>
                        )}

                        <td className='py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm'>
                          {data.currencySymbol}{item.subtotal.toFixed(2)}
                        </td>
                      </>
                    )}

                    {isPackingSlip && (
                      <td className='py-3 px-3 text-slate-500 text-[11px]'>
                        Bin: LOC-A{idx + 1}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Breakdown & Commercial Terms */}
      <div className='page-break-inside-avoid grid grid-cols-1 md:grid-cols-12 gap-6 pt-2 pb-6 border-b border-slate-200'>
        {/* Left Column: Bank Details, Terms, Verification QR Code */}
        <div className='md:col-span-7 space-y-4'>
          {!isPackingSlip ? (
            <>
              {/* Payment & Bank Settlement Box */}
              <div className='rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5'>
                <div className='flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700'>
                  <ShieldCheck className='h-4 w-4 text-emerald-600' />
                  Payment & Settlement Details
                </div>
                <div className='grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 pt-0.5'>
                  <p>
                    <span className='text-slate-400 font-medium'>Payment Terms:</span>{' '}
                    <span className='font-semibold text-slate-800'>Net 30 Days / Immediate</span>
                  </p>
                  <p>
                    <span className='text-slate-400 font-medium'>Settlement Ref:</span>{' '}
                    <span className='font-mono font-bold text-slate-800'>#{data.orderNumber}</span>
                  </p>
                  <p>
                    <span className='text-slate-400 font-medium'>Bank Name:</span>{' '}
                    <span className='font-medium text-slate-800'>{data.bankDetails?.bankName || 'Enterprise Commercial Bank'}</span>
                  </p>
                  <p>
                    <span className='text-slate-400 font-medium'>Account #:</span>{' '}
                    <span className='font-mono font-semibold text-slate-800'>{data.bankDetails?.accountNumber || '8401-2291-0048-192'}</span>
                  </p>
                </div>
              </div>

              {/* Order Notes & Instructions */}
              {data.notes && (
                <div className='rounded-lg border border-slate-200 bg-amber-50/50 p-3 space-y-1'>
                  <span className='text-[10px] font-bold uppercase tracking-wider text-amber-900 block'>
                    Special Delivery & Handling Instructions
                  </span>
                  <p className='text-xs text-amber-950 whitespace-pre-wrap leading-relaxed'>
                    {data.notes}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Packing slip dispatch checklist */
            <div className='rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-2 text-xs'>
              <div className='flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700'>
                <CheckSquare className='h-4 w-4 text-blue-600' />
                Warehouse Fulfillment Checklist
              </div>
              <ul className='space-y-1.5 text-slate-600'>
                <li className='flex items-center gap-2'>
                  <span className='h-3.5 w-3.5 border border-slate-400 rounded-xs inline-block' />
                  <span>Inspect product seals and expiry dates before packaging.</span>
                </li>
                <li className='flex items-center gap-2'>
                  <span className='h-3.5 w-3.5 border border-slate-400 rounded-xs inline-block' />
                  <span>Verify total unit count against picking slip ({totalQuantity} units).</span>
                </li>
                <li className='flex items-center gap-2'>
                  <span className='h-3.5 w-3.5 border border-slate-400 rounded-xs inline-block' />
                  <span>Affix shipping label and fragile indicators if required.</span>
                </li>
              </ul>
            </div>
          )}

          {/* Scannable Verification QR Code with description */}
          <div className='flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-white'>
            <div className='p-1 bg-white border border-slate-200 rounded'>
              <QRCodeSVG
                value={qrVerificationPayload}
                size={58}
                level='M'
                includeMargin={false}
              />
            </div>
            <div className='text-xs space-y-0.5'>
              <p className='font-bold text-slate-800 text-[11px] uppercase tracking-wider'>
                Digital Audit Verification
              </p>
              <p className='text-[10px] text-slate-500 leading-snug'>
                Scan with handheld warehouse terminals or mobile camera to instantly verify order integrity and commercial status.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Calculations & Totals (Commercial Mode) */}
        {!isPackingSlip ? (
          <div className='md:col-span-5'>
            <div className='rounded-lg border-2 border-slate-200 bg-slate-50/80 p-4 space-y-2.5'>
              <div className='flex justify-between text-xs text-slate-600'>
                <span>Subtotal ({totalQuantity} units):</span>
                <span className='font-mono font-semibold text-slate-900'>
                  {data.currencySymbol}{data.subtotal.toFixed(2)}
                </span>
              </div>

              {data.discountAmount > 0 && (
                <div className='flex justify-between text-xs text-rose-600'>
                  <span>Tier / Promotional Discount:</span>
                  <span className='font-mono font-semibold'>
                    -{data.currencySymbol}{data.discountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              {data.taxAmount > 0 && (
                <div className='flex justify-between text-xs text-slate-600'>
                  <span>Applicable Sales Tax / VAT:</span>
                  <span className='font-mono font-semibold text-slate-900'>
                    +{data.currencySymbol}{data.taxAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className='border-t-2 border-slate-300 pt-2.5 flex justify-between items-baseline'>
                <div>
                  <span className='text-sm font-black uppercase tracking-wider text-slate-900 block'>
                    Total Amount Due
                  </span>
                  <span className='text-[10px] text-slate-500 font-medium'>
                    Currency: {data.currency}
                  </span>
                </div>
                <div className='text-right'>
                  <span className='font-mono text-2xl font-black text-blue-700 tracking-tight'>
                    {data.currencySymbol}{data.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className='md:col-span-5 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs'>
            <div className='font-bold uppercase tracking-wider text-slate-700'>
              Package Overview
            </div>
            <div className='flex justify-between py-1 border-b border-slate-200'>
              <span className='text-slate-500'>Total Items:</span>
              <span className='font-bold'>{data.items.length} Lines</span>
            </div>
            <div className='flex justify-between py-1 border-b border-slate-200'>
              <span className='text-slate-500'>Total Units:</span>
              <span className='font-bold'>{totalQuantity} Pieces</span>
            </div>
            <div className='flex justify-between py-1'>
              <span className='text-slate-500'>Carrier / Dispatch:</span>
              <span className='font-semibold'>Standard Ground Logistics</span>
            </div>
          </div>
        )}
      </div>

      {/* Official Signatures & Acceptance */}
      <div className='page-break-inside-avoid grid grid-cols-2 gap-10 pt-10 pb-4'>
        <div>
          <div className='border-t border-slate-400 pt-2 space-y-0.5'>
            <p className='font-bold text-xs text-slate-900 uppercase tracking-wider'>
              Authorized Sales Representative
            </p>
            <p className='text-[10px] text-slate-500'>
              Authorized Signature & Corporate Seal
            </p>
            <div className='h-8' />
            <p className='text-[10px] font-mono text-slate-400'>
              Date: __________________________
            </p>
          </div>
        </div>

        <div>
          <div className='border-t border-slate-400 pt-2 space-y-0.5'>
            <p className='font-bold text-xs text-slate-900 uppercase tracking-wider'>
              Customer Acceptance / Consignee
            </p>
            <p className='text-[10px] text-slate-500'>
              Received In Good Order & Condition
            </p>
            <div className='h-8' />
            <p className='text-[10px] font-mono text-slate-400'>
              Date: __________________________
            </p>
          </div>
        </div>
      </div>

      {/* Document Footer & Notice */}
      <div className='pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400 space-y-0.5'>
        <p className='font-medium text-slate-500'>
          Thank you for choosing {data.store.name || 'our enterprise services'}!
        </p>
        <p>
          This is an official computer-generated document. For queries or fulfillment tracking, contact{' '}
          {data.store.email || 'support@inventory.com'}.
        </p>
        <p className='font-mono text-[9px] pt-1'>
          SYS-DOC-ID: SO-{data.orderNumber}-{new Date().getFullYear()} · PAGE 1 OF 1
        </p>
      </div>
    </div>
  )
}
