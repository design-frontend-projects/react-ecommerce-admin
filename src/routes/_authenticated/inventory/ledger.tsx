import { createFileRoute } from '@tanstack/react-router'
import { StockLedgerPage } from '@/features/inventory/pages/stock-ledger'

export const Route = createFileRoute('/_authenticated/inventory/ledger')({
  component: StockLedgerPage,
})
