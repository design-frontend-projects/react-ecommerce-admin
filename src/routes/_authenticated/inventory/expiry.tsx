import { createFileRoute } from '@tanstack/react-router'
import { ExpiryManagementPage } from '@/features/inventory/pages/expiry-management'

export const Route = createFileRoute('/_authenticated/inventory/expiry')({
  component: ExpiryManagementPage,
})
