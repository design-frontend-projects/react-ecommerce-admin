import { createFileRoute } from '@tanstack/react-router'
import { SalesShipments } from '@/features/sales-shipments'

export const Route = createFileRoute('/_authenticated/sales-shipments/')({
  component: SalesShipments,
})
