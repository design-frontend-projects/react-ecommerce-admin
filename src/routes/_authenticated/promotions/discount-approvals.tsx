import { createFileRoute } from '@tanstack/react-router'
import { DiscountApprovalsPage } from '@/features/promotions'

export const Route = createFileRoute('/_authenticated/promotions/discount-approvals')({
  component: DiscountApprovalsPage,
})
