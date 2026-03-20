import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Tasks } from '@/features/tasks'

const taskSearchSchema = z.object({
  page: z.coerce.number().min(1).catch(1),
  perPage: z.coerce.number().min(1).catch(10),
  filter: z.string().optional(),
  status: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),
})

export const Route = createFileRoute('/_authenticated/tasks')({
  component: Tasks,
  validateSearch: taskSearchSchema,
})
