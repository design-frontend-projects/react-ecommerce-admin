import { createFileRoute } from '@tanstack/react-router'
import { PurchaseRequisitions } from '@/features/purchase-requisitions'

export const Route = createFileRoute('/_authenticated/purchase-requisitions/')({
  component: PurchaseRequisitions,
})
