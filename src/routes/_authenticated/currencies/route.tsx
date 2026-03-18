import { createFileRoute } from '@tanstack/react-router'
import { Currencies } from '@/features/currencies'

export const Route = createFileRoute('/_authenticated/currencies')({
  component: Currencies,
})
