import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'

interface InvoiceDetailViewProps {
  invoice: any // Will be properly typed based on returned router data
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvoiceDetailView({ invoice, open, onOpenChange }: InvoiceDetailViewProps) {
  if (!invoice) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invoice Details - {invoice.invoice_no}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{new Date(invoice.invoice_date).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{invoice.status}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cashier ID</p>
              <p className="font-medium truncate">{invoice.clerk_user_id}</p>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">Line Items</h4>
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              <ul className="space-y-3">
                {invoice.sales_invoice_items?.map((item: any) => (
                  <li key={item.id} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium">Item ID: {item.product_variant_id}</p>
                      <p className="text-muted-foreground">
                        {item.quantity} x {formatCurrency(Number(item.unit_price))}
                      </p>
                    </div>
                    <div className="font-medium">
                      {formatCurrency(Number(item.line_total))}
                    </div>
                  </li>
                ))}
                {(!invoice.sales_invoice_items || invoice.sales_invoice_items.length === 0) && (
                  <p className="text-muted-foreground text-center">No items found.</p>
                )}
              </ul>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(Number(invoice.subtotal))}</span>
            </div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Discount</span>
                <span>-{formatCurrency(Number(invoice.discount_amount))}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(Number(invoice.tax_amount))}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(Number(invoice.total_amount))}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
