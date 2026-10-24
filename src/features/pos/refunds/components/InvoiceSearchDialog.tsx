import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Receipt, Calendar, User, ArrowRight, Loader2 } from 'lucide-react'
import { useSearchInvoicesForRefund } from '../hooks/useRefunds'

interface InvoiceSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectInvoice: (invoiceId: string) => void
}

export function InvoiceSearchDialog({
  open,
  onOpenChange,
  onSelectInvoice,
}: InvoiceSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setDebouncedSearch(searchTerm)
  }

  const { data, isLoading } = useSearchInvoicesForRefund({
    invoiceNo: debouncedSearch || undefined,
    pageSize: 10,
    enabled: open,
  })

  const invoices = data?.items ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Lookup Sales Invoice for Refund
          </DialogTitle>
          <DialogDescription>
            Search by invoice number, receipt, or customer name to initiate a refund.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSearchSubmit} className="flex gap-2 my-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoice number (e.g. INV-2026-000001)..."
              className="pl-9 text-sm"
              autoFocus
            />
          </div>
          <Button type="submit" disabled={isLoading} className="gap-1.5 shrink-0">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </Button>
        </form>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[250px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs">Searching sales invoices...</span>
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2 border border-dashed rounded-lg">
              <Receipt className="w-8 h-8 opacity-40" />
              <p className="text-sm font-medium">No refundable invoices found</p>
              <p className="text-xs max-w-xs">
                Try searching with a specific invoice number or check that the invoice is in posted/paid status.
              </p>
            </div>
          ) : (
            invoices.map((inv) => {
              const formattedDate = new Date(inv.invoice_date).toLocaleDateString()
              const totalAmount = Number(inv.total_amount).toFixed(2)

              return (
                <div
                  key={inv.id}
                  onClick={() => {
                    onSelectInvoice(inv.id)
                    onOpenChange(false)
                  }}
                  className="group p-3.5 border rounded-lg hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {inv.invoice_no}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-normal py-0">
                        {inv.status}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] font-normal py-0">
                        {inv.payment_status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formattedDate}
                      </span>
                      {inv.customers?.name && (
                        <span className="flex items-center gap-1 truncate">
                          <User className="w-3.5 h-3.5" />
                          {inv.customers.name}
                        </span>
                      )}
                      <span>
                        {inv.sales_invoice_items.length} item(s)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-base font-bold text-foreground block">
                        ${totalAmount}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Total Amount
                      </span>
                    </div>

                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
