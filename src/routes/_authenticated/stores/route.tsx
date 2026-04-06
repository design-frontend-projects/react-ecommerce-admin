import { createFileRoute } from '@tanstack/react-router'
import { Stores } from '@/features/stores'

export const Route = createFileRoute('/_authenticated/stores')({
  component: Stores,
})
