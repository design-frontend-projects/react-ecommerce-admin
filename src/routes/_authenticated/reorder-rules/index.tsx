import { createFileRoute } from '@tanstack/react-router'
import { ReorderRules } from '@/features/reorder-rules'

export const Route = createFileRoute('/_authenticated/reorder-rules/')({
  component: ReorderRules,
})
