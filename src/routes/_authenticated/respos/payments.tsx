import { createFileRoute } from '@tanstack/react-router'
import { Payments } from '@/features/respos/pages/payments'

export const Route = createFileRoute('/_authenticated/respos/payments')({
  component: Payments,
})
