import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { SalesOrderPrintPage } from '@/features/sales-orders/pages/sales-order-print-page'

const printSearchSchema = z.object({
  template: z.enum(['commercial', 'packing_slip']).optional().default('commercial'),
  autoPrint: z.union([z.boolean(), z.string()]).optional(),
})

export const Route = createFileRoute('/_authenticated/sales-orders/$orderId/print')({
  validateSearch: printSearchSchema,
  component: SalesOrderPrintPage,
})
