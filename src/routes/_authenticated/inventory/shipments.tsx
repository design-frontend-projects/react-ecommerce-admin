import { createFileRoute } from '@tanstack/react-router'
import { InventoryShipments } from '@/features/inventory/shipments'

export const Route = createFileRoute('/_authenticated/inventory/shipments')({
  component: InventoryShipments,
})
