import { createFileRoute } from '@tanstack/react-router'
import { ButtonsPage } from '@/features/access-control/pages/buttons-page'

export const Route = createFileRoute('/_authenticated/access-control/buttons')({
  component: ButtonsPage,
})
