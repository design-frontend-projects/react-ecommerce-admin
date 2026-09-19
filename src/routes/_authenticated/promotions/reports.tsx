import { createFileRoute } from '@tanstack/react-router'
import { DiscountReportsPage } from '@/features/promotions'

export const Route = createFileRoute('/_authenticated/promotions/reports')({
  component: DiscountReportsPage,
})
