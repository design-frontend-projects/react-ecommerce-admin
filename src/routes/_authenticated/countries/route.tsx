import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Countries } from '@/features/countries'

const countriesSearchSchema = z.object({
  page: z.coerce.number().min(1).catch(1),
  perPage: z.coerce.number().min(1).catch(10),
  sort: z.string().optional(),
  filter: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/countries')({
  validateSearch: countriesSearchSchema,
  component: Countries,
})
