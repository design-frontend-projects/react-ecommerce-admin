import { createFileRoute } from '@tanstack/react-router'
import { InventoryMovements } from '@/features/inventory-movements'

export const Route = createFileRoute('/_authenticated/inventory-movements/')({
  component: InventoryMovements,
})
