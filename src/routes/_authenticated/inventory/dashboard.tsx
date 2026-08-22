import { createFileRoute } from '@tanstack/react-router'
import { InventoryDashboard } from '@/features/inventory/pages/inventory-dashboard'

export const Route = createFileRoute('/_authenticated/inventory/dashboard')({
  component: InventoryDashboard,
})
