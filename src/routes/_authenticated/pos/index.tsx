import { createFileRoute } from '@tanstack/react-router'
import { POS } from '@/features/pos'

export const Route = createFileRoute('/_authenticated/pos/')({
  component: POS,
})
