import { createFileRoute } from '@tanstack/react-router'
import { PurchaseOrders } from '@/features/purchase-orders'

export const Route = createFileRoute('/_authenticated/purchase-orders')({
  component: PurchaseOrders,
})
