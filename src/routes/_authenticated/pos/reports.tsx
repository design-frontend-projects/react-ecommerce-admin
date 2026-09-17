import { createFileRoute } from '@tanstack/react-router'
import { PosReportsPage } from '@/features/pos/pages/pos-reports-page'

export const Route = createFileRoute('/_authenticated/pos/reports')({
  component: PosReportsPage,
})
