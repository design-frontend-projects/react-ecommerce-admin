import { createFileRoute } from '@tanstack/react-router'
import { ForcePasswordChangeFeature } from '@/features/auth/force-password-change'

export const Route = createFileRoute('/_authenticated/force-password-change')({
  component: ForcePasswordChangeFeature,
})
