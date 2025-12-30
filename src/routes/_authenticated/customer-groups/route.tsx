import { createFileRoute } from '@tanstack/react-router'
import CustomerGroups from '@/features/customer-groups'

export const Route = createFileRoute('/_authenticated/customer-groups')({
  component: CustomerGroups,
})
