import { createFileRoute } from '@tanstack/react-router'
import { RolesPage } from '@/features/access-control/pages/roles-page'

export const Route = createFileRoute('/_authenticated/access-control/roles')({
  component: RolesPage,
})
