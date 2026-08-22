import { createFileRoute } from '@tanstack/react-router'
import { InventoryAlertsPage } from '@/features/inventory/pages/inventory-alerts'

export const Route = createFileRoute('/_authenticated/inventory/alerts')({
  component: InventoryAlertsPage,
})
