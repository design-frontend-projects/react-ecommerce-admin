import { createFileRoute } from '@tanstack/react-router'
import { ResposProfile } from '@/features/respos/pages/profile'

export const Route = createFileRoute('/_authenticated/respos/profile')({
  component: ResposProfile,
})
