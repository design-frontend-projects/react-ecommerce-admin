import { createFileRoute } from '@tanstack/react-router'
import { Serials } from '@/features/serials'

export const Route = createFileRoute('/_authenticated/serials/')({
  component: Serials,
})
