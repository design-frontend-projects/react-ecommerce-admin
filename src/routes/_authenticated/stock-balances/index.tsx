import { createFileRoute } from '@tanstack/react-router'
import { StockBalances } from '@/features/stock-balances'

export const Route = createFileRoute('/_authenticated/stock-balances/')({
  component: StockBalances,
})
