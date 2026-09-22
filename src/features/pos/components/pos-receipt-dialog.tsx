import { useRef, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Printer, CheckCircle2, Download, Mail, MessageCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { usePosStore } from '../store/use-pos-store'

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
  const { t } = useTranslation()
  const receiptRef = useRef<HTMLDivElement>(null)
  const { customer } = usePosStore()

  // Share state
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [emailAddress, setEmailAddress] = useState('')
  const [isWhatsappPopoverOpen, setIsWhatsappPopoverOpen] = useState(false)
  const [isEmailPopoverOpen, setIsEmailPopoverOpen] = useState(false)

  if (!receipt) return null

  // Generate receipt text for sharing
  const receiptText = useMemo(() => {
    if (!receipt) return ''
    const lines: string[] = []
    lines.push(`🧾 *${receipt.storeName || 'Receipt'}*`)
    lines.push(`Order: ${receipt.orderNumber}`)
    lines.push(
      `Date: ${new Date(receipt.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
    )
    lines.push('')
    lines.push('*Items:*')
    receipt.items.forEach((item) => {
      lines.push(
        `• ${item.name} x${item.quantity} — ${formatCurrency(item.total)}`
      )
    })
    lines.push('')
    lines.push(`Subtotal: ${formatCurrency(receipt.subtotal)}`)
    if (receipt.discountTotal && receipt.discountTotal > 0) {
      lines.push(`Discount: -${formatCurrency(receipt.discountTotal)}`)
    }
    lines.push(`Tax: ${formatCurrency(receipt.taxTotal)}`)
    lines.push(`*TOTAL: ${formatCurrency(receipt.totalAmount)}*`)
    lines.push('')
    lines.push('*Payments:*')
    receipt.payments.forEach((p) => {
      lines.push(
        `• ${p.method.replace('_', ' ').toUpperCase()}: ${formatCurrency(p.amount)}`
      )
    })
    if (receipt.changeGiven && receipt.changeGiven > 0) {
      lines.push(`Change: ${formatCurrency(receipt.changeGiven)}`)
    }
    lines.push('')
    lines.push('Thank you for your purchase! 🙏')
    return lines.join('\n')
  }, [receipt])

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
            ${
              receipt.invoiceNumber
                ? `<tr>
                    <td colspan="2">Invoice: <strong>${receipt.invoiceNumber}</strong></td>
                  </tr>`
                : ''
            }
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
            <DialogTitle className='text-xl font-bold'>
              {t('pos.receiptModal.saleCompleted', 'Sale Completed')}
            </DialogTitle>
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
              <p>
                {t('pos.receiptModal.order', 'Order')}:{' '}
                <span className='font-bold'>{receipt.orderNumber}</span>
              </p>
              {receipt.invoiceNumber && (
                <p>
                  {t('pos.receiptModal.invoice', 'Invoice')}:{' '}
                  <span className='font-bold text-primary'>{receipt.invoiceNumber}</span>
                </p>
              )}
              <p>
                {t('pos.receiptModal.terminal', 'Terminal')}: {receipt.terminalCode || 'POS-01'}
              </p>
            </div>
            <div className='text-right'>
              <p>{formattedDate}</p>
              <p>
                {t('pos.receiptModal.cashier', 'Cashier')}: {receipt.cashierName || 'Cashier'}
              </p>
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
              <span className='text-muted-foreground'>
                {t('pos.receiptModal.subtotal', 'Subtotal')}
              </span>
              <span>{formatCurrency(receipt.subtotal)}</span>
            </div>
            {receipt.discountTotal && receipt.discountTotal > 0 && (
              <div className='flex justify-between text-emerald-600 dark:text-emerald-400'>
                <span>{t('pos.receiptModal.discount', 'Discount')}</span>
                <span>-{formatCurrency(receipt.discountTotal)}</span>
              </div>
            )}
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>
                {t('pos.receiptModal.tax', 'Taxes')}
              </span>
              <span>{formatCurrency(receipt.taxTotal)}</span>
            </div>
            <Separator />
            <div className='flex justify-between text-sm font-bold pt-1'>
              <span>{t('pos.receiptModal.total', 'GRAND TOTAL')}</span>
              <span className='text-primary'>{formatCurrency(receipt.totalAmount)}</span>
            </div>
          </div>

          <Separator className='border-dashed' />

          {/* Payments */}
          <div className='space-y-1 text-[11px]'>
            <p className='font-bold text-[10px] uppercase text-muted-foreground'>
              {t('pos.receiptModal.paymentMethodsLabel', 'Payment Breakdown:')}
            </p>
            {receipt.payments.map((p, idx) => (
              <div key={idx} className='flex justify-between'>
                <span className='capitalize'>{p.method.replace('_', ' ')}</span>
                <span className='font-semibold'>{formatCurrency(p.amount)}</span>
              </div>
            ))}
            {receipt.changeGiven && receipt.changeGiven > 0 && (
              <div className='flex justify-between font-bold text-emerald-600 dark:text-emerald-400'>
                <span>{t('pos.receiptModal.change', 'Change Returned')}</span>
                <span>{formatCurrency(receipt.changeGiven)}</span>
              </div>
            )}
          </div>

          <div className='text-center pt-2 text-[10px] text-muted-foreground'>
            <p>{t('pos.receipt.thankYou', 'Thank you for shopping with us!')}</p>
          </div>
        </div>

        <DialogFooter className='flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
          >
            {t('pos.receiptModal.close', 'Close')}
          </Button>

          {/* WhatsApp share */}
          <Popover open={isWhatsappPopoverOpen} onOpenChange={setIsWhatsappPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400'
                onClick={() => {
                  const phone = customer?.phone?.replace(/\D/g, '')
                  if (phone) {
                    window.open(
                      `https://wa.me/${phone}?text=${encodeURIComponent(receiptText)}`,
                      '_blank'
                    )
                  } else {
                    setIsWhatsappPopoverOpen(true)
                  }
                }}
              >
                <MessageCircle className='h-4 w-4' />
                {t('pos.receiptModal.shareWhatsApp', 'WhatsApp')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-64 p-3 space-y-2' align='start'>
              <p className='text-xs font-semibold'>
                {t('pos.receiptModal.enterPhone', 'Enter phone number')}
              </p>
              <Input
                type='tel'
                placeholder='+1234567890'
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                className='h-8 text-xs'
                autoFocus
              />
              <Button
                size='sm'
                className='w-full h-7 text-xs gap-1'
                disabled={!whatsappPhone.trim()}
                onClick={() => {
                  const phone = whatsappPhone.replace(/\D/g, '')
                  if (phone) {
                    window.open(
                      `https://wa.me/${phone}?text=${encodeURIComponent(receiptText)}`,
                      '_blank'
                    )
                    setIsWhatsappPopoverOpen(false)
                    toast.success(
                      t('pos.receiptModal.openingWhatsApp', 'Opening WhatsApp...')
                    )
                  }
                }}
              >
                <Send className='h-3 w-3' /> {t('pos.receiptModal.send', 'Send')}
              </Button>
            </PopoverContent>
          </Popover>

          {/* Email share */}
          <Popover open={isEmailPopoverOpen} onOpenChange={setIsEmailPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='gap-1.5 border-blue-500/30 text-blue-700 hover:bg-blue-500/10 dark:text-blue-400'
                onClick={() => {
                  const email = customer?.email
                  if (email) {
                    window.open(
                      `mailto:${email}?subject=${encodeURIComponent(`Receipt - ${receipt.orderNumber}`)}&body=${encodeURIComponent(receiptText)}`,
                      '_blank'
                    )
                  } else {
                    setIsEmailPopoverOpen(true)
                  }
                }}
              >
                <Mail className='h-4 w-4' />
                {t('pos.receiptModal.shareEmail', 'Email')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-64 p-3 space-y-2' align='start'>
              <p className='text-xs font-semibold'>
                {t('pos.receiptModal.enterEmail', 'Enter email address')}
              </p>
              <Input
                type='email'
                placeholder='customer@example.com'
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className='h-8 text-xs'
                autoFocus
              />
              <Button
                size='sm'
                className='w-full h-7 text-xs gap-1'
                disabled={!emailAddress.trim()}
                onClick={() => {
                  if (emailAddress.trim()) {
                    window.open(
                      `mailto:${emailAddress.trim()}?subject=${encodeURIComponent(`Receipt - ${receipt.orderNumber}`)}&body=${encodeURIComponent(receiptText)}`,
                      '_blank'
                    )
                    setIsEmailPopoverOpen(false)
                    toast.success(
                      t('pos.receiptModal.openingEmail', 'Opening email client...')
                    )
                  }
                }}
              >
                <Send className='h-3 w-3' /> {t('pos.receiptModal.send', 'Send')}
              </Button>
            </PopoverContent>
          </Popover>

          <Button
            type='button'
            onClick={handlePrint}
            className='gap-2 bg-primary text-primary-foreground'
          >
            <Printer className='h-4 w-4' />
            {t('pos.receiptModal.print', 'Print Receipt')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
