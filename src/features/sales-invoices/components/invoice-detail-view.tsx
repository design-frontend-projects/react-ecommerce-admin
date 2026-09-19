import React, { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  InvoiceStatusBadge,
  PaymentStatusBadge,
  InvoiceTypeBadge,
} from './invoice-status-badge'
import { RecordPaymentDialog } from './record-payment-dialog'
import { CancelInvoiceDialog } from './cancel-invoice-dialog'
import { VoidInvoiceDialog } from './void-invoice-dialog'
import { CreditNoteDialog } from './credit-note-dialog'
import { InvoicePrintView } from './invoice-print-view'
import {
  useRecordPayment,
  useIssueInvoice,
  useCancelInvoice,
  useVoidInvoice,
  useCreateCreditNote,
} from '../hooks/use-sales-invoices'
import type { SalesInvoice } from '../types'
import {
  ArrowLeft,
  Printer,
  CreditCard,
  CheckCircle,
  XCircle,
  Ban,
  ArrowLeftRight,
  Receipt,
  User,
  Building,
  Calendar,
  Clock,
  DollarSign,
  Package,
  ShieldAlert,
} from 'lucide-react'

interface InvoiceDetailViewProps {
  invoice: SalesInvoice
}

export const InvoiceDetailView: React.FC<InvoiceDetailViewProps> = ({ invoice }) => {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showVoidDialog, setShowVoidDialog] = useState(false)
  const [showCreditNoteDialog, setShowCreditNoteDialog] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)

  const recordPayment = useRecordPayment()
  const issueInvoice = useIssueInvoice()
  const cancelInvoice = useCancelInvoice()
  const voidInvoice = useVoidInvoice()
  const createCreditNote = useCreateCreditNote()

  const isDraft = invoice.status === 'draft'
  const isPaid = invoice.status === 'paid' || invoice.payment_status === 'paid'
  const isVoidOrCancelled = invoice.status === 'void' || invoice.status === 'cancelled'

  const customerName = invoice.customers
    ? invoice.customers.company_name ||
      [invoice.customers.first_name, invoice.customers.last_name].filter(Boolean).join(' ') ||
      'Retail Customer'
    : 'Walk-in Customer'

  return (
    <div className="space-y-6 pb-12">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/sales-invoices">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Invoices
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Receipt className="w-6 h-6 text-primary" />
                {invoice.invoice_no}
              </h1>
              <InvoiceTypeBadge type={invoice.invoice_type} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Commercial invoice issued via {invoice.source_type} channel
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPrintModal(true)}
            className="gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Print / Receipt
          </Button>

          {isDraft && (
            <Button
              size="sm"
              onClick={() => issueInvoice.mutate(invoice.id)}
              disabled={issueInvoice.isPending}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CheckCircle className="w-4 h-4" />
              {issueInvoice.isPending ? 'Issuing...' : 'Issue Invoice'}
            </Button>
          )}

          {!isVoidOrCancelled && invoice.due_amount > 0 && (
            <Button
              size="sm"
              onClick={() => setShowPaymentDialog(true)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <CreditCard className="w-4 h-4" />
              Record Payment
            </Button>
          )}

          {!isVoidOrCancelled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreditNoteDialog(true)}
              className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Credit Note
            </Button>
          )}

          {!isPaid && !isVoidOrCancelled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelDialog(true)}
              className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </Button>
          )}

          {!isVoidOrCancelled && invoice.status !== 'draft' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVoidDialog(true)}
              className="gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20"
            >
              <Ban className="w-4 h-4" />
              Void
            </Button>
          )}
        </div>
      </div>

      {/* Overview Status Strip */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Invoice Status</span>
            <div>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
          <div className="space-y-1 pt-3 md:pt-0 md:pl-4">
            <span className="text-xs text-muted-foreground font-medium">Payment Status</span>
            <div>
              <PaymentStatusBadge status={invoice.payment_status} />
            </div>
          </div>
          <div className="space-y-1 pt-3 md:pt-0 md:pl-4">
            <span className="text-xs text-muted-foreground font-medium">Invoice Date</span>
            <div className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              {new Date(invoice.invoice_date).toLocaleDateString()}
            </div>
          </div>
          <div className="space-y-1 pt-3 md:pt-0 md:pl-4">
            <span className="text-xs text-muted-foreground font-medium">Due Date</span>
            <div className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Immediate'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2-Column Info: Customer & Commercial Context */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer / Bill To */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Customer / Bill-To
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5">
            <div className="text-sm font-bold text-foreground">{customerName}</div>
            {invoice.customers?.email && (
              <div className="text-muted-foreground">Email: {invoice.customers.email}</div>
            )}
            {invoice.customers?.phone && (
              <div className="text-muted-foreground">Phone: {invoice.customers.phone}</div>
            )}
            {invoice.customers?.customer_type && (
              <div className="text-muted-foreground capitalize">
                Type: {invoice.customers.customer_type}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commercial Context */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building className="w-4 h-4 text-primary" />
              Origin & Logistics
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5">
            <div>
              <span className="text-muted-foreground">Channel: </span>
              <strong className="text-foreground">{invoice.channels?.name || invoice.source_type}</strong>
            </div>
            {invoice.warehouses && (
              <div>
                <span className="text-muted-foreground">Fulfillment Warehouse: </span>
                <strong className="text-foreground">{invoice.warehouses.name} ({invoice.warehouses.code})</strong>
              </div>
            )}
            {invoice.source_id && (
              <div>
                <span className="text-muted-foreground">Source Ref ID: </span>
                <span className="font-mono text-[11px]">{invoice.source_id}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Created: </span>
              <span>{new Date(invoice.created_at).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items Table */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Invoice Items ({invoice.sales_invoice_items?.length || 0})
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground font-semibold uppercase tracking-wider text-[10px] border-y">
              <tr>
                <th className="py-3 px-4 w-10">#</th>
                <th className="py-3 px-4">Item & SKU Snapshot</th>
                <th className="py-3 px-4 text-right w-20">Qty</th>
                <th className="py-3 px-4 text-right w-28">Unit Price</th>
                <th className="py-3 px-4 text-right w-24">Discount</th>
                <th className="py-3 px-4 text-right w-24">Tax</th>
                <th className="py-3 px-4 text-right w-28">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y text-foreground">
              {(invoice.sales_invoice_items || []).map((item, idx) => (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3.5 px-4 text-muted-foreground">{item.line_no || idx + 1}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-foreground">
                      {item.product_name_snapshot || item.description || 'Product Item'}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      {item.sku_snapshot && <span className="font-mono">SKU: {item.sku_snapshot}</span>}
                      {item.variant_name_snapshot && <span>• {item.variant_name_snapshot}</span>}
                      {item.uom_snapshot && <span>• {item.uom_snapshot}</span>}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium">{item.quantity}</td>
                  <td className="py-3.5 px-4 text-right">${item.unit_price.toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400">
                    {item.discount_amount > 0 ? `-$${item.discount_amount.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right text-muted-foreground">
                    {item.tax_amount > 0 ? `$${item.tax_amount.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-foreground">
                    ${item.line_total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Financial Summary & Payments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Payments History */}
        <Card className="md:col-span-7 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Recorded Payments ({invoice.sales_invoice_payments?.length || 0})
              </span>
              {!isVoidOrCancelled && invoice.due_amount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPaymentDialog(true)}
                  className="h-7 text-xs text-emerald-600 border-emerald-300"
                >
                  + Add Payment
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {invoice.sales_invoice_payments && invoice.sales_invoice_payments.length > 0 ? (
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground border-y text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Method</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Reference</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.sales_invoice_payments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20">
                      <td className="py-2.5 px-4 capitalize font-medium flex items-center gap-1.5">
                        <CreditCard className="w-3 h-3 text-muted-foreground" />
                        {p.payment_method.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        {new Date(p.payment_date).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground">
                        {p.reference_number || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        ${p.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No payments have been recorded for this invoice yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calculation Total Summary */}
        <Card className="md:col-span-5 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Financial Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Gross Subtotal</span>
              <span className="font-medium text-foreground">${invoice.subtotal.toFixed(2)}</span>
            </div>

            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Total Discounts</span>
                <span>-${invoice.discount_amount.toFixed(2)}</span>
              </div>
            )}

            {invoice.tax_amount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax / VAT</span>
                <span className="font-medium text-foreground">${invoice.tax_amount.toFixed(2)}</span>
              </div>
            )}

            {invoice.shipping_amount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span className="font-medium text-foreground">${invoice.shipping_amount.toFixed(2)}</span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between text-base font-bold text-foreground pt-1">
              <span>Total Amount</span>
              <span>${invoice.total_amount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-xs text-emerald-600 pt-1 font-semibold">
              <span>Paid to Date</span>
              <span>${invoice.paid_amount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold text-sm">
              <span>Balance Due</span>
              <span>${invoice.due_amount.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Terms & Notes */}
      {(invoice.terms || invoice.notes) && (
        <Card className="shadow-xs">
          <CardContent className="p-4 space-y-2 text-xs">
            {invoice.terms && (
              <div>
                <span className="font-semibold text-foreground">Commercial Terms: </span>
                <span className="text-muted-foreground">{invoice.terms}</span>
              </div>
            )}
            {invoice.notes && (
              <div>
                <span className="font-semibold text-foreground">Internal Notes: </span>
                <span className="text-muted-foreground whitespace-pre-wrap">{invoice.notes}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Dialogs */}
      <RecordPaymentDialog
        invoice={invoice}
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        onSubmit={async (data) => {
          await recordPayment.mutateAsync({ invoiceId: invoice.id, payment: data })
        }}
        isSubmitting={recordPayment.isPending}
      />

      <CancelInvoiceDialog
        invoice={invoice}
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onSubmit={async (data) => {
          await cancelInvoice.mutateAsync({ id: invoice.id, payload: data })
        }}
        isSubmitting={cancelInvoice.isPending}
      />

      <VoidInvoiceDialog
        invoice={invoice}
        open={showVoidDialog}
        onOpenChange={setShowVoidDialog}
        onSubmit={async (data) => {
          await voidInvoice.mutateAsync({ id: invoice.id, payload: data })
        }}
        isSubmitting={voidInvoice.isPending}
      />

      <CreditNoteDialog
        invoice={invoice}
        open={showCreditNoteDialog}
        onOpenChange={setShowCreditNoteDialog}
        onSubmit={async (data) => {
          await createCreditNote.mutateAsync({ originalInvoiceId: invoice.id, payload: data })
        }}
        isSubmitting={createCreditNote.isPending}
      />

      <InvoicePrintView
        invoice={invoice}
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
      />
    </div>
  )
}
