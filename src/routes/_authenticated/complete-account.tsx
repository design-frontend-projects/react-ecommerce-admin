import { createFileRoute } from '@tanstack/react-router'
import { CompleteAccountFeature } from '@/features/auth/complete-account'

export const Route = createFileRoute('/_authenticated/complete-account')({
  component: CompleteAccountFeature,
})
