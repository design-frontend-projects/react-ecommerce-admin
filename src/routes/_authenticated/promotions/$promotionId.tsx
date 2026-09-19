import { createFileRoute } from '@tanstack/react-router'
import { PromotionDetailPage } from '@/features/promotions'

export const Route = createFileRoute('/_authenticated/promotions/$promotionId')({
  component: PromotionDetailPage,
})
