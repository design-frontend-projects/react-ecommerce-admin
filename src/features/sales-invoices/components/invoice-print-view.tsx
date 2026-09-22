import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { InvoiceStatusBadge, PaymentStatusBadge, InvoiceTypeBadge } from './invoice-status-badge'
import type { SalesInvoice } from '../types'
import { Printer, X, Phone, Mail, CreditCard } from 'lucide-react'

interface InvoicePrintViewProps {
  invoice: SalesInvoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const InvoicePrintView: React.FC<InvoicePrintViewProps> = ({
  invoice,
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation()
  if (!invoice) return null

  const handlePrint = () => {
    window.print()
  }

  const customerName = invoice.customers
    ? invoice.customers.company_name ||
      [invoice.customers.first_name, invoice.customers.last_name].filter(Boolean).join(' ') ||
      t('salesInvoices.table.retailCustomer', 'Retail Customer')
    : t('salesInvoices.table.walkInCustomer', 'Walk-in Customer')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Top action bar (hidden on print) */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/40 print:hidden">
          <DialogTitle className="text-base font-semibold">
            {t('salesInvoices.print.previewTitle', 'Print Preview — {{invoiceNo}}', {
              invoiceNo: invoice.invoice_no,
            })}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              size="sm"
              className="gap-1.5 bg-primary text-primary-foreground font-medium"
            >
              <Printer className="w-4 h-4" />
              {t('salesInvoices.print.printInvoice', 'Print Invoice')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="overflow-y-auto p-8 bg-white text-slate-900 font-sans print:p-0 print:overflow-visible">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  E
                </div>
                <span className="text-2xl font-black tracking-tight text-slate-900">COMMERCE ERP</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {t('salesInvoices.print.companySub', 'Commercial Invoicing & Financial Operations')}
              </p>
              <div className="text-xs text-slate-600 space-y-0.5 pt-2">
                <div>{t('salesInvoices.print.taxId', 'Tax ID: TR-89201948291')}</div>
                <div>{t('salesInvoices.print.contactInfo', 'support@enterprise-erp.local | +1 (800) 555-0199')}</div>
              </div>
            </div>

            <div className="text-right space-y-2">
              <div className="flex items-center justify-end gap-2">
                <InvoiceTypeBadge type={invoice.invoice_type} />
                <InvoiceStatusBadge status={invoice.status} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                {t('salesInvoices.print.invoiceTitle', 'INVOICE')}
              </h1>
              <div className="text-sm font-semibold text-slate-700">{invoice.invoice_no}</div>
            </div>
          </div>

          {/* Details & Customer Grid */}
          <div className="grid grid-cols-2 gap-6 py-6 border-b border-slate-200 text-xs">
            {/* Bill To */}
            <div className="space-y-1">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                {t('salesInvoices.print.billedTo', 'Billed To')}
              </span>
              <div className="text-sm font-bold text-slate-900">{customerName}</div>
              {invoice.customers?.email && (
                <div className="text-slate-600 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  {invoice.customers.email}
                </div>
              )}
              {invoice.customers?.phone && (
                <div className="text-slate-600 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {invoice.customers.phone}
                </div>
              )}
              <div className="pt-1 text-slate-500">
                {t('salesInvoices.print.sourceChannel', 'Source Channel:')}{' '}
                <strong className="text-slate-700">
                  {invoice.source_type} ({invoice.channels?.name || 'Counter'})
                </strong>
              </div>
            </div>

            {/* Dates & Logistics */}
            <div className="space-y-2 text-right">
              <div className="space-y-0.5">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  {t('salesInvoices.print.invoiceDetails', 'Invoice Details')}
                </span>
                <div className="text-slate-700">
                  {t('salesInvoices.print.date', 'Date:')}{' '}
                  <strong className="text-slate-900">{new Date(invoice.invoice_date).toLocaleDateString()}</strong>
                </div>
                {invoice.due_date && (
                  <div className="text-slate-700">
                    {t('salesInvoices.print.dueDate', 'Due Date:')}{' '}
                    <strong className="text-slate-900">{new Date(invoice.due_date).toLocaleDateString()}</strong>
                  </div>
                )}
                {invoice.warehouses && (
                  <div className="text-slate-600">
                    {t('salesInvoices.print.fulfillment', 'Fulfillment:')}{' '}
                    <strong>{invoice.warehouses.name}</strong>
                  </div>
                )}
              </div>
              <div className="pt-2 flex justify-end">
                <PaymentStatusBadge status={invoice.payment_status} />
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 w-8">{t('salesInvoices.detail.lineNo', '#')}</th>
                  <th className="py-2.5">{t('salesInvoices.print.itemDescription', 'Item Description')}</th>
                  <th className="py-2.5 text-right w-16">{t('salesInvoices.detail.qty', 'Qty')}</th>
                  <th className="py-2.5 text-right w-24">{t('salesInvoices.detail.unitPrice', 'Unit Price')}</th>
                  <th className="py-2.5 text-right w-20">{t('salesInvoices.detail.discount', 'Discount')}</th>
                  <th className="py-2.5 text-right w-20">{t('salesInvoices.detail.tax', 'Tax')}</th>
                  <th className="py-2.5 text-right w-24">{t('salesInvoices.print.total', 'Total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(invoice.sales_invoice_items || []).map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-3 text-slate-400">{item.line_no || idx + 1}</td>
                    <td className="py-3 pr-2">
                      <div className="font-semibold text-slate-900">
                        {item.product_name_snapshot ||
                          item.description ||
                          t('salesInvoices.detail.productItemFallback', 'Product Item')}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        {item.sku_snapshot && <span>SKU: {item.sku_snapshot}</span>}
                        {item.variant_name_snapshot && <span>• {item.variant_name_snapshot}</span>}
                      </div>
                    </td>
                    <td className="py-3 text-right font-medium">{item.quantity}</td>
                    <td className="py-3 text-right font-medium">${item.unit_price.toFixed(2)}</td>
                    <td className="py-3 text-right text-slate-500">
                      {item.discount_amount > 0 ? `-$${item.discount_amount.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 text-right text-slate-500">
                      {item.tax_amount > 0 ? `$${item.tax_amount.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 text-right font-bold text-slate-900">
                      ${item.line_total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Summary */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{t('salesInvoices.print.subtotal', 'Subtotal')}</span>
                <span className="font-medium text-slate-900">${invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>{t('salesInvoices.print.totalDiscount', 'Total Discount')}</span>
                  <span className="font-medium">-${invoice.discount_amount.toFixed(2)}</span>
                </div>
              )}
              {invoice.tax_amount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>{t('salesInvoices.print.taxVat', 'Tax / VAT')}</span>
                  <span className="font-medium text-slate-900">${invoice.tax_amount.toFixed(2)}</span>
                </div>
              )}
              {invoice.shipping_amount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>{t('salesInvoices.print.shipping', 'Shipping')}</span>
                  <span className="font-medium text-slate-900">${invoice.shipping_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t-2 border-slate-800 text-sm font-black text-slate-900">
                <span>{t('salesInvoices.print.totalUpper', 'TOTAL')}</span>
                <span>${invoice.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-emerald-600 pt-1">
                <span>{t('salesInvoices.print.amountPaid', 'Amount Paid')}</span>
                <span className="font-bold">${invoice.paid_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-amber-700 font-bold bg-amber-50 p-1.5 rounded">
                <span>{t('salesInvoices.print.balanceDueUpper', 'BALANCE DUE')}</span>
                <span>${invoice.due_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payments Record Section */}
          {invoice.sales_invoice_payments && invoice.sales_invoice_payments.length > 0 && (
            <div className="mt-8 pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                {t('salesInvoices.print.paymentHistory', 'Payment History')}
              </h4>
              <div className="space-y-1.5">
                {invoice.sales_invoice_payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded border border-slate-100"
                  >
                    <div className="flex items-center gap-2 text-slate-700">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span className="capitalize font-medium">
                        {t(
                          `salesInvoices.dialogs.recordPayment.methods.${p.payment_method}`,
                          p.payment_method.replace('_', ' ')
                        )}
                      </span>
                      {p.reference_number && (
                        <span className="text-slate-400 font-mono text-[10px]">({p.reference_number})</span>
                      )}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {new Date(p.payment_date).toLocaleString()}
                    </div>
                    <div className="font-bold text-emerald-700">${p.amount.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer & Terms */}
          <div className="mt-10 pt-6 border-t border-slate-200 flex justify-between items-end text-slate-500 text-[11px]">
            <div className="space-y-1 max-w-md">
              <span className="font-semibold text-slate-700">
                {t('salesInvoices.print.termsAndConditions', 'Terms & Conditions:')}
              </span>
              <p>
                {invoice.terms ||
                  t(
                    'salesInvoices.print.defaultTerms',
                    'Payment is due according to agreed billing credit terms. All returns subject to store policy.'
                  )}
              </p>
              {invoice.notes && (
                <p className="text-slate-600 italic">
                  {t('salesInvoices.print.note', 'Note:')} {invoice.notes}
                </p>
              )}
            </div>
            <div className="text-right space-y-10">
              <div className="w-40 border-b border-slate-300"></div>
              <div className="text-slate-400 text-[10px]">
                {t('salesInvoices.print.authorizedSignatory', 'Authorized Commercial Signatory')}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
