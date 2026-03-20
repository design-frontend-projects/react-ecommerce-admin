import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Users } from '@/features/users'

const userSearchSchema = z.object({
  page: z.coerce.number().min(1).catch(1),
  perPage: z.coerce.number().min(1).catch(10),
  sort: z.string().optional(),
  filter: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/users')({
  component: Users,
  validateSearch: userSearchSchema,
})
