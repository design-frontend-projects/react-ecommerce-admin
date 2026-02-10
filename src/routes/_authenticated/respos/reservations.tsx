import { createFileRoute } from '@tanstack/react-router'
import { Reservations } from '@/features/respos/pages/reservations'

export const Route = createFileRoute('/_authenticated/respos/reservations')({
  component: Reservations,
})
