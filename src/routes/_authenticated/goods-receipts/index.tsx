import { createFileRoute } from '@tanstack/react-router'
import { GoodsReceipts } from '@/features/goods-receipts'

export const Route = createFileRoute('/_authenticated/goods-receipts/')({
  component: GoodsReceipts,
})
