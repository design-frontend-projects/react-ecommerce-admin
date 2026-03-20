import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Cities } from '@/features/cities'

const citySearchSchema = z.object({
  page: z.coerce.number().min(1).catch(1),
  perPage: z.coerce.number().min(1).catch(10),
  sort: z.string().optional(),
  filter: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/cities')({
  component: Cities,
  validateSearch: citySearchSchema,
})
