import { createFileRoute } from '@tanstack/react-router'
import { UserManagement } from '@/features/respos/pages/users'

export const Route = createFileRoute('/_authenticated/respos/users')({
  component: UserManagement,
})
