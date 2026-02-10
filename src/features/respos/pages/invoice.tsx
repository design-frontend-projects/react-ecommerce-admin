// Invoice Viewer - Print-friendly order receipt
import { useRef } from 'react'
import { format } from 'date-fns'
import { useParams, Link } from '@tanstack/react-router'
import { ArrowLeft, Download, Loader2, Printer, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useOrder } from '../api/queries'
import { formatCurrency } from '../lib/formatters'
import type { ResOrderItemWithDetails } from '../types'

export function InvoiceViewer() {
  const { orderId } = useParams({
    from: '/_authenticated/respos/invoice/$orderId',
  })
  const { data: order, isLoading } = useOrder(orderId)
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // In production, this would generate a PDF
    window.print()
  }

  if (isLoading) {
    return (
      <>
        <Header>
          <div className='flex items-center gap-2'>
            <Receipt className='h-5 w-5 text-orange-500' />
            <h1 className='text-lg font-semibold'>Invoice</h1>
          </div>
        </Header>
        <Main>
          <div className='flex h-[50vh] items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        </Main>
      </>
    )
  }

  if (!order) {
    return (
      <>
        <Header>
          <div className='flex items-center gap-2'>
            <Receipt className='h-5 w-5 text-orange-500' />
            <h1 className='text-lg font-semibold'>Invoice</h1>
          </div>
        </Header>
        <Main>
          <div className='flex h-[50vh] flex-col items-center justify-center'>
            <Receipt className='h-12 w-12 text-muted-foreground' />
            <p className='mt-4 text-lg'>Order not found</p>
            <Button asChild className='mt-4'>
              <Link to='/respos'>Back to Dashboard</Link>
            </Button>
          </div>
        </Main>
      </>
    )
  }

  const subtotal =
    order.items?.reduce(
      (sum: number, orderItem: ResOrderItemWithDetails) =>
        sum + orderItem.unit_price * orderItem.quantity,
      0
    ) ?? 0
  const tax = subtotal * 0.14 // 14% VAT
  const total = subtotal + tax

  return (
    <>
      {/* Screen Header (hidden on print) */}
      <Header className='print:hidden'>
        <div className='flex items-center gap-2'>
          <Button variant='ghost' size='icon' asChild>
            <Link to='/respos/pos'>
              <ArrowLeft className='h-4 w-4' />
            </Link>
          </Button>
          <Receipt className='h-5 w-5 text-orange-500' />
          <h1 className='text-lg font-semibold'>
            Invoice #{order.order_number}
          </h1>
        </div>
        <div className='ml-auto flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={handleDownload}>
            <Download className='mr-2 h-4 w-4' />
            Download
          </Button>
          <Button size='sm' onClick={handlePrint}>
            <Printer className='mr-2 h-4 w-4' />
            Print
          </Button>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='print:p-0'>
        <div className='mx-auto max-w-2xl'>
          {/* Invoice Card */}
          <Card ref={printRef} className='print:border-none print:shadow-none'>
            <CardHeader className='border-b pb-6 text-center'>
              {/* Restaurant Logo/Name */}
              <div className='flex flex-col items-center'>
                <div className='flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-r from-orange-500 to-red-500 text-white print:bg-orange-500'>
                  <Receipt className='h-8 w-8' />
                </div>
                <h2 className='mt-4 text-2xl font-bold'>Restaurant Name</h2>
                <p className='text-sm text-muted-foreground'>
                  123 Main Street, City, Country
                </p>
                <p className='text-sm text-muted-foreground'>
                  Tel: +1 234 567 890
                </p>
              </div>

              {/* Invoice Info */}
              <div className='mt-6 rounded-lg bg-muted p-4 text-left print:bg-gray-100'>
                <div className='grid grid-cols-2 gap-2 text-sm'>
                  <div>
                    <span className='text-muted-foreground'>Invoice #:</span>
                    <span className='ml-2 font-medium'>
                      {order.order_number}
                    </span>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>Date:</span>
                    <span className='ml-2 font-medium'>
                      {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>Table:</span>
                    <span className='ml-2 font-medium'>
                      {order.table?.table_number ?? 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>Status:</span>
                    <span className='ml-2 font-medium capitalize'>
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className='pt-6'>
              {/* Order Items */}
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b'>
                    <th className='pb-2 text-left font-medium'>Item</th>
                    <th className='pb-2 text-center font-medium'>Qty</th>
                    <th className='pb-2 text-right font-medium'>Price</th>
                    <th className='pb-2 text-right font-medium'>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((orderItem) => (
                    <tr key={orderItem.id} className='border-b border-dashed'>
                      <td className='py-3'>
                        <p className='font-medium'>
                          {orderItem.item?.name ?? 'Unknown Item'}
                        </p>
                        {orderItem.notes && (
                          <p className='text-xs text-muted-foreground'>
                            Note: {orderItem.notes}
                          </p>
                        )}
                      </td>
                      <td className='py-3 text-center'>{orderItem.quantity}</td>
                      <td className='py-3 text-right'>
                        {formatCurrency(orderItem.unit_price)}
                      </td>
                      <td className='py-3 text-right font-medium'>
                        {formatCurrency(
                          orderItem.unit_price * orderItem.quantity
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <Separator className='my-4' />

              {/* Totals */}
              <div className='space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span className='text-muted-foreground'>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-muted-foreground'>VAT (14%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                {order.discount_amount && order.discount_amount > 0 && (
                  <div className='flex justify-between text-sm text-green-600'>
                    <span>Discount</span>
                    <span>-{formatCurrency(order.discount_amount)}</span>
                  </div>
                )}
                <Separator />
                <div className='flex justify-between text-lg font-bold'>
                  <span>Total</span>
                  <span className='text-orange-500'>
                    {formatCurrency(order.total_amount ?? total)}
                  </span>
                </div>
              </div>

              {/* Payment Info */}
              {order.payment_method && (
                <div className='mt-6 rounded-lg bg-muted p-3 text-center print:bg-gray-100'>
                  <p className='text-sm text-muted-foreground'>
                    Paid via{' '}
                    <span className='font-medium'>{order.payment_method}</span>
                  </p>
                </div>
              )}

              {/* Footer */}
              <div className='mt-8 text-center text-sm text-muted-foreground'>
                <p className='font-medium'>Thank you for dining with us!</p>
                <p className='mt-1'>We hope to see you again soon.</p>
                <div className='mt-4 flex justify-center'>
                  <div className='h-8 w-32 bg-[repeating-linear-gradient(90deg,#000,#000_2px,#fff_2px,#fff_4px)] print:bg-[repeating-linear-gradient(90deg,#000,#000_2px,#fff_2px,#fff_4px)]' />
                </div>
                <p className='mt-2 text-xs'>Order #{order.order_number}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          [data-slot="main"] {
            padding: 0 !important;
            margin: 0 !important;
          }
          [data-print-content], [data-print-content] * {
            visibility: visible;
          }
          [data-print-content] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </>
  )
}
