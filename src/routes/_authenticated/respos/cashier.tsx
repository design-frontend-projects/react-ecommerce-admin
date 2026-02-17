import { createFileRoute } from '@tanstack/react-router'
import CashierCheckout from '@/features/respos/pages/cashier-checkout'

export const Route = createFileRoute('/_authenticated/respos/cashier')({
  component: CashierCheckout,
})
