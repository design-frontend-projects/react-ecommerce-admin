import { createFileRoute } from '@tanstack/react-router'
import { Replenishment } from '@/features/replenishment'

export const Route = createFileRoute('/_authenticated/replenishment/')({
  component: Replenishment,
})
