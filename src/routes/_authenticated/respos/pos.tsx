import { createFileRoute } from '@tanstack/react-router'
import { POSScreen } from '@/features/respos/pages/pos'

export const Route = createFileRoute('/_authenticated/respos/pos')({
  component: POSScreen,
})
