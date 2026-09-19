import { createFileRoute } from '@tanstack/react-router'
import { CouponsPage } from '@/features/promotions'

export const Route = createFileRoute('/_authenticated/promotions/coupons')({
  component: CouponsPage,
})
