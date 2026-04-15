import { createFileRoute } from '@tanstack/react-router'
import { ShipmentsList } from '@/features/pos'

export const Route = createFileRoute('/_authenticated/pos/shipments')({
  component: ShipmentsList,
})
