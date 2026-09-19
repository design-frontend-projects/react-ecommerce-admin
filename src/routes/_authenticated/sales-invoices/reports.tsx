import { createFileRoute } from '@tanstack/react-router'
import { SalesInvoiceReportsPage } from '@/features/sales-invoices/pages/sales-invoice-reports-page'

export const Route = createFileRoute('/_authenticated/sales-invoices/reports')({
  component: SalesInvoiceReportsPage,
})
