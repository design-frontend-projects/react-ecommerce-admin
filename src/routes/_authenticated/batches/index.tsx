import { createFileRoute } from '@tanstack/react-router'
import { Batches } from '@/features/batches'

export const Route = createFileRoute('/_authenticated/batches/')({
  component: Batches,
})
