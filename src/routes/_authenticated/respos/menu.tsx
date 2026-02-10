import { createFileRoute } from '@tanstack/react-router'
import { MenuManagement } from '@/features/respos/pages/menu-management'

export const Route = createFileRoute('/_authenticated/respos/menu')({
  component: MenuManagement,
})
