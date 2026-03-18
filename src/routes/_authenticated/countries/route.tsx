import { createFileRoute } from '@tanstack/react-router'
import { Countries } from '@/features/countries'

export const Route = createFileRoute('/_authenticated/countries')({
  component: Countries,
})
