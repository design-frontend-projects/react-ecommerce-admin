import { createFileRoute } from '@tanstack/react-router'
import { SalesInvoiceDetailPage } from '@/features/sales-invoices/pages/sales-invoice-detail-page'

export const Route = createFileRoute('/_authenticated/sales-invoices/$invoiceId')({
  component: SalesInvoiceDetailPage,
})
