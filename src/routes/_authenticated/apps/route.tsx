import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Apps } from '@/features/apps'

const appsSearchSchema = z.object({
  filter: z.string().optional(),
  type: z.enum(['all', 'connected', 'notConnected']).optional(),
  sort: z.enum(['asc', 'desc']).optional(),
})

export const Route = createFileRoute('/_authenticated/apps')({
  component: Apps,
  validateSearch: (search) => appsSearchSchema.parse(search),
})
