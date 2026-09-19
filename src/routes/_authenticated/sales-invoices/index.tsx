import { createFileRoute } from '@tanstack/react-router'
import { SalesInvoicesPage } from '@/features/sales-invoices/pages/sales-invoices-page'

export const Route = createFileRoute('/_authenticated/sales-invoices/')({
  component: SalesInvoicesPage,
})
