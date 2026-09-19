import { createFileRoute } from '@tanstack/react-router'
import { PromotionWizardPage } from '@/features/promotions'

export const Route = createFileRoute('/_authenticated/promotions/new')({
  component: PromotionWizardPage,
})
