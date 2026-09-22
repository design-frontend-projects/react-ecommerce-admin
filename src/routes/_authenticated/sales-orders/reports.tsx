import { createFileRoute } from '@tanstack/react-router'
import { SalesOrderReportsPage } from '@/features/sales-orders/pages/sales-order-reports-page'

export const Route = createFileRoute('/_authenticated/sales-orders/reports')({
  component: SalesOrderReportsPage,
})
