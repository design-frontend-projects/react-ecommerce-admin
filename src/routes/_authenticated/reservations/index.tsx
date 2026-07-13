import { createFileRoute } from '@tanstack/react-router'
import { StockReservations } from '@/features/reservations'

export const Route = createFileRoute('/_authenticated/reservations/')({
  component: StockReservations,
})
