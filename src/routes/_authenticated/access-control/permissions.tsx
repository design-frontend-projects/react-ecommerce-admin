import { createFileRoute } from '@tanstack/react-router'
import { PermissionsPage } from '@/features/access-control/pages/permissions-page'

export const Route = createFileRoute(
  '/_authenticated/access-control/permissions'
)({
  component: PermissionsPage,
})
