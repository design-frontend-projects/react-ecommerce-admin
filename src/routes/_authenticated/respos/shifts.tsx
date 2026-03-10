import { createFileRoute } from '@tanstack/react-router'
import { ShiftManagement } from '@/features/respos/pages/shifts'

export const Route = createFileRoute('/_authenticated/respos/shifts')({
  component: ShiftManagement,
})
