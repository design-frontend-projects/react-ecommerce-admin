import { useRef } from 'react'
import { Printer, CheckCircle2, Download } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

export interface ReceiptData {
  orderNumber: string
  invoiceNumber?: string
  receiptNumber?: string
  date: Date | string
  storeName?: string
  storeAddress?: string
  storePhone?: string
  taxNumber?: string
  cashierName?: string
  terminalCode?: string
  items: Array<{
    name: string
    sku?: string
    quantity: number
    unitPrice: number
    discountAmount?: number
    taxAmount?: number
    total: number
  }>
  subtotal: number
  discountTotal?: number
  taxTotal: number
  totalAmount: number
  payments: Array<{
    method: string
    amount: number
    referenceNumber?: string
  }>
  changeGiven?: number
  notes?: string
}

interface PosReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  receipt: ReceiptData | null
}

export function PosReceiptDialog({
  open,
  onOpenChange,
  receipt,
}: PosReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  if (!receipt) return null

  const formattedDate = new Date(receipt.date).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const itemsHtml = receipt.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 4px 0; vertical-align: top;">
            <div style="font-weight: 600;">${item.name}</div>
            ${item.sku ? `<div style="font-size: 10px; color: #555;">SKU: ${item.sku}</div>` : ''}
            <div style="font-size: 11px;">${item.quantity} x ${formatCurrency(item.unitPrice)}</div>
          </td>
          <td style="text-align: right; padding: 4px 0; vertical-align: top; font-weight: 600;">
            ${formatCurrency(item.total)}
          </td>
        </tr>
      `
      )
      .join('')

    const paymentsHtml = receipt.payments
      .map(
        (p) => `
        <tr>
          <td style="padding: 2px 0; text-transform: uppercase;">${p.method}</td>
          <td style="text-align: right; padding: 2px 0; font-weight: 500;">${formatCurrency(p.amount)}</td>
        </tr>
      `
      )
      .join('')

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receipt.orderNumber}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace, system-ui;
              width: 78mm;
              margin: 0 auto;
              padding: 10px;
              font-size: 12px;
              color: #000;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #444; margin: 8px 0; }
            .double-divider { border-top: 2px solid #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            .grand-total { font-size: 15px; font-weight: bold; }
            .footer { text-align: center; margin-top: 15px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="center">
            <h2 style="margin: 0; font-size: 18px;">${receipt.storeName || 'Bluewave Retail Store'}</h2>
            ${receipt.storeAddress ? `<p style="margin: 2px 0; font-size: 11px;">${receipt.storeAddress}</p>` : ''}
            ${receipt.storePhone ? `<p style="margin: 2px 0; font-size: 11px;">Tel: ${receipt.storePhone}</p>` : ''}
            ${receipt.taxNumber ? `<p style="margin: 2px 0; font-size: 10px;">Tax Reg: ${receipt.taxNumber}</p>` : ''}
          </div>

          <div class="divider"></div>

          <table style="font-size: 11px;">
            <tr>
              <td>Order: <strong>${receipt.orderNumber}</strong></td>
              <td style="text-align: right;">${formattedDate}</td>
            </tr>
            <tr>
              <td>Terminal: ${receipt.terminalCode || 'MAIN'}</td>
              <td style="text-align: right;">Cashier: ${receipt.cashierName || 'Cashier'}</td>
            </tr>
          </table>

          <div class="divider"></div>

          <table>
            <thead>
              <tr style="border-bottom: 1px solid #ddd; font-size: 11px;">
                <th style="text-align: left; padding-bottom: 4px;">Item</th>
                <th style="text-align: right; padding-bottom: 4px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="divider"></div>

          <table style="font-size: 12px;">
            <tr>
              <td>Subtotal</td>
              <td style="text-align: right;">${formatCurrency(receipt.subtotal)}</td>
            </tr>
            ${
              receipt.discountTotal && receipt.discountTotal > 0
                ? `<tr>
                    <td>Discounts</td>
                    <td style="text-align: right; color: #b00;">-${formatCurrency(receipt.discountTotal)}</td>
                  </tr>`
                : ''
            }
            <tr>
              <td>Tax</td>
              <td style="text-align: right;">${formatCurrency(receipt.taxTotal)}</td>
            </tr>
            <tr class="grand-total">
              <td style="padding-top: 6px;">TOTAL</td>
              <td style="text-align: right; padding-top: 6px;">${formatCurrency(receipt.totalAmount)}</td>
            </tr>
          </table>

          <div class="double-divider"></div>

          <div style="font-size: 11px; margin-bottom: 4px; font-weight: bold;">PAYMENT DETAILS:</div>
          <table style="font-size: 11px;">
            ${paymentsHtml}
            ${
              receipt.changeGiven && receipt.changeGiven > 0
                ? `<tr>
                    <td style="padding: 2px 0;">Change Due</td>
                    <td style="text-align: right; font-weight: bold;">${formatCurrency(receipt.changeGiven)}</td>
                  </tr>`
                : ''
            }
          </table>

          <div class="divider"></div>

          <div class="footer">
            <p style="margin: 3px 0;">Thank you for your business!</p>
            <p style="margin: 3px 0;">Please retain this receipt for returns & exchanges.</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-md'>
        <DialogHeader>
          <div className='flex items-center justify-center gap-2 text-primary'>
            <CheckCircle2 className='h-6 w-6 text-emerald-500' />
            <DialogTitle className='text-xl font-bold'>Sale Completed</DialogTitle>
          </div>
        </DialogHeader>

        {/* Receipt paper view */}
        <div
          ref={receiptRef}
          className='rounded-md border bg-card p-4 font-mono text-xs shadow-inner space-y-3'
        >
          <div className='text-center space-y-0.5'>
            <h3 className='font-bold text-sm font-sans tracking-tight'>
              {receipt.storeName || 'Bluewave Retail Store'}
            </h3>
            {receipt.storeAddress && (
              <p className='text-muted-foreground'>{receipt.storeAddress}</p>
            )}
            {receipt.storePhone && (
              <p className='text-muted-foreground'>Tel: {receipt.storePhone}</p>
            )}
            {receipt.taxNumber && (
              <p className='text-muted-foreground text-[10px]'>
                Tax ID: {receipt.taxNumber}
              </p>
            )}
          </div>

          <Separator className='border-dashed' />

          <div className='flex justify-between text-[11px]'>
            <div>
              <p>Order: <span className='font-bold'>{receipt.orderNumber}</span></p>
              <p>Terminal: {receipt.terminalCode || 'POS-01'}</p>
            </div>
            <div className='text-right'>
              <p>{formattedDate}</p>
              <p>Cashier: {receipt.cashierName || 'Cashier'}</p>
            </div>
          </div>

          <Separator className='border-dashed' />

          {/* Line items */}
          <div className='space-y-1.5'>
            {receipt.items.map((item, idx) => (
              <div key={idx} className='flex justify-between items-start'>
                <div className='flex-1 pr-2'>
                  <p className='font-medium line-clamp-1'>{item.name}</p>
                  <p className='text-[10px] text-muted-foreground'>
                    {item.quantity} x {formatCurrency(item.unitPrice)}
                    {item.discountAmount && item.discountAmount > 0
                      ? ` (-${formatCurrency(item.discountAmount)})`
                      : ''}
                  </p>
                </div>
                <div className='font-semibold text-right'>
                  {formatCurrency(item.total)}
                </div>
              </div>
            ))}
          </div>

          <Separator className='border-dashed' />

          {/* Totals */}
          <div className='space-y-1'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Subtotal</span>
              <span>{formatCurrency(receipt.subtotal)}</span>
            </div>
            {receipt.discountTotal && receipt.discountTotal > 0 && (
              <div className='flex justify-between text-emerald-600 dark:text-emerald-400'>
                <span>Discount</span>
                <span>-{formatCurrency(receipt.discountTotal)}</span>
              </div>
            )}
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Taxes</span>
              <span>{formatCurrency(receipt.taxTotal)}</span>
            </div>
            <Separator />
            <div className='flex justify-between text-sm font-bold pt-1'>
              <span>GRAND TOTAL</span>
              <span className='text-primary'>{formatCurrency(receipt.totalAmount)}</span>
            </div>
          </div>

          <Separator className='border-dashed' />

          {/* Payments */}
          <div className='space-y-1 text-[11px]'>
            <p className='font-bold text-[10px] uppercase text-muted-foreground'>
              Payment Breakdown:
            </p>
            {receipt.payments.map((p, idx) => (
              <div key={idx} className='flex justify-between'>
                <span className='capitalize'>{p.method.replace('_', ' ')}</span>
                <span className='font-semibold'>{formatCurrency(p.amount)}</span>
              </div>
            ))}
            {receipt.changeGiven && receipt.changeGiven > 0 && (
              <div className='flex justify-between font-bold text-emerald-600 dark:text-emerald-400'>
                <span>Change Returned</span>
                <span>{formatCurrency(receipt.changeGiven)}</span>
              </div>
            )}
          </div>

          <div className='text-center pt-2 text-[10px] text-muted-foreground'>
            <p>Thank you for shopping with us!</p>
          </div>
        </div>

        <DialogFooter className='gap-2 sm:gap-0'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type='button'
            onClick={handlePrint}
            className='gap-2 bg-primary text-primary-foreground'
          >
            <Printer className='h-4 w-4' />
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
