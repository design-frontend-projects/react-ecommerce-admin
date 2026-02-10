import { createFileRoute } from '@tanstack/react-router'
import { ResposDashboard } from '@/features/respos/pages/dashboard'

export const Route = createFileRoute('/_authenticated/respos/')({
  component: ResposDashboard,
})
