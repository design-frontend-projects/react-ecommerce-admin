import { createFileRoute } from '@tanstack/react-router'
import { StockCounts } from '@/features/stock-counts'

export const Route = createFileRoute('/_authenticated/stock-counts/')({
  component: StockCounts,
})
