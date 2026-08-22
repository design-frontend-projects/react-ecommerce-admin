import { createFileRoute } from '@tanstack/react-router'
import { CustomerReturns } from '@/features/customer-returns'

export const Route = createFileRoute('/_authenticated/customer-returns/')({
  component: CustomerReturns,
})
