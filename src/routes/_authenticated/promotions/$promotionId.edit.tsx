import { createFileRoute } from '@tanstack/react-router'
import { PromotionWizardPage } from '@/features/promotions'

export const Route = createFileRoute(
  '/_authenticated/promotions/$promotionId/edit',
)({
  component: PromotionWizardPage,
})
