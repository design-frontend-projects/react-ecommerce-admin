import { createFileRoute } from '@tanstack/react-router'
import { StockByLocation } from '@/features/stock-by-location'

export const Route = createFileRoute('/_authenticated/stock-by-location/')({
  component: StockByLocation,
})
