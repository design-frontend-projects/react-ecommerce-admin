import { createFileRoute } from '@tanstack/react-router'
import Areas from '@/features/areas'

export const Route = createFileRoute('/_authenticated/areas')({
  component: Areas,
})
