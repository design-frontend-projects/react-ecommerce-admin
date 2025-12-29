import { createFileRoute } from '@tanstack/react-router'
import { Promotions } from '@/features/promotions'

export const Route = createFileRoute('/_authenticated/promotions')({
  component: Promotions,
})
