import { createFileRoute } from '@tanstack/react-router'
import { StockTransfers } from '@/features/stock-transfers'

export const Route = createFileRoute('/_authenticated/stock-transfers/')({
  component: StockTransfers,
})
