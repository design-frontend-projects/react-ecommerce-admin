import { createFileRoute } from '@tanstack/react-router'
import { InventoryValuationPage } from '@/features/inventory/pages/inventory-valuation'

export const Route = createFileRoute('/_authenticated/inventory/valuation')({
  component: InventoryValuationPage,
})
