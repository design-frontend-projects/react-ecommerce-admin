import { formatCurrency } from '@/lib/utils'

interface ReceiptData {
  transactionNumber: string
  date: Date
  items: Array<{
    name: string
    quantity: number
    price: number
    total: number
  }>
  subtotal: number
  discount?: number
  tax: number
  total: number
}

export function printReceipt(data: ReceiptData) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const itemsHtml = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 4px 0;">${item.name} x ${item.quantity}</td>
      <td style="text-align: right; padding: 4px 0;">${formatCurrency(item.total)}</td>
    </tr>
  `
    )
    .join('')

  const html = `
    <html>
      <head>
        <title>Receipt ${data.transactionNumber}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; width: 80mm; padding: 10px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; }
          .total { font-weight: bold; font-size: 14px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 0;">RESTAURANT POS</h2>
          <p style="margin: 5px 0;">Receipt: ${data.transactionNumber}</p>
          <p style="margin: 5px 0;">${data.date.toLocaleString()}</p>
        </div>
        <div class="divider"></div>
        <table>
          ${itemsHtml}
        </table>
        <div class="divider"></div>
        <table>
          <tr>
            <td>Subtotal</td>
            <td style="text-align: right;">${formatCurrency(data.subtotal)}</td>
          </tr>
          ${
            data.discount
              ? `
          <tr>
            <td>Discount</td>
            <td style="text-align: right;">-${formatCurrency(data.discount)}</td>
          </tr>
          `
              : ''
          }
          <tr>
            <td>Tax</td>
            <td style="text-align: right;">${formatCurrency(data.tax)}</td>
          </tr>
          <tr class="total">
            <td style="padding-top: 10px;">TOTAL</td>
            <td style="text-align: right; padding-top: 10px;">${formatCurrency(data.total)}</td>
          </tr>
        </table>
        <div class="divider"></div>
        <div class="footer">
          <p>Thank you for your visit!</p>
          <p>Please come again.</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); }
          }
        </script>
      </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
}
