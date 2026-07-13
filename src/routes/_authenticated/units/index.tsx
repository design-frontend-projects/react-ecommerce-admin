import { createFileRoute } from '@tanstack/react-router'
import { Units } from '@/features/units'

export const Route = createFileRoute('/_authenticated/units/')({
  component: Units,
})
