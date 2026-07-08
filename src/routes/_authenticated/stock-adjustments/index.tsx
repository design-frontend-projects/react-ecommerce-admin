import { createFileRoute } from '@tanstack/react-router'
import { StockAdjustments } from '@/features/stock-adjustments'

export const Route = createFileRoute('/_authenticated/stock-adjustments/')({
  component: StockAdjustments,
})
