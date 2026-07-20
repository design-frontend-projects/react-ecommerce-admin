import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { RequirePermission } from '@/components/rbac/require-permission'
import { Users } from '@/features/users'

const userSearchSchema = z.object({
  page: z.coerce.number().min(1).catch(1),
  perPage: z.coerce.number().min(1).catch(10),
  sort: z.string().optional(),
  filter: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
})

function GuardedUsers() {
  return (
    <RequirePermission
      role={['admin', 'super_admin']}
      permission={['users.view', 'users.manage']}
    >
      <Users />
    </RequirePermission>
  )
}

export const Route = createFileRoute('/_authenticated/users')({
  component: GuardedUsers,
  validateSearch: userSearchSchema,
})
