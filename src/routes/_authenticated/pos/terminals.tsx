import { createFileRoute } from '@tanstack/react-router'
import { PosTerminalsPage } from '@/features/pos/pages/pos-terminals-page'

export const Route = createFileRoute('/_authenticated/pos/terminals')({
  component: PosTerminalsPage,
})
