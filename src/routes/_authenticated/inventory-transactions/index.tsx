import { createFileRoute } from '@tanstack/react-router'
import { InventoryTransactions } from '@/features/inventory-transactions'

export const Route = createFileRoute('/_authenticated/inventory-transactions/')({
  component: InventoryTransactions,
})
