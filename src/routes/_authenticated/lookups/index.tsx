import { createFileRoute } from '@tanstack/react-router'
import { Lookups } from '@/features/lookups'

export const Route = createFileRoute('/_authenticated/lookups/')({
  component: Lookups,
})
