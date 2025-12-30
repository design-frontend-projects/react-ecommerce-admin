import { createFileRoute } from '@tanstack/react-router'
import CustomerCards from '@/features/customer-cards'

export const Route = createFileRoute('/_authenticated/customer-cards')({
  component: CustomerCards,
})
