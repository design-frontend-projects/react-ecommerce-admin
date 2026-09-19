import { createFileRoute } from '@tanstack/react-router'
import { PromotionsDashboardPage } from '@/features/promotions'

export const Route = createFileRoute('/_authenticated/promotions/')({
  component: PromotionsDashboardPage,
})
