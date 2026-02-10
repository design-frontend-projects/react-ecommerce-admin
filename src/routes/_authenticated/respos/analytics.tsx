import { createFileRoute } from '@tanstack/react-router'
import { Analytics } from '@/features/respos/pages/analytics'

export const Route = createFileRoute('/_authenticated/respos/analytics')({
  component: Analytics,
})
