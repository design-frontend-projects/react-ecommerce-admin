import { createFileRoute } from '@tanstack/react-router'
import { TaxRates } from '@/features/tax-rates'

export const Route = createFileRoute('/_authenticated/tax-rates')({
  component: TaxRates,
})
