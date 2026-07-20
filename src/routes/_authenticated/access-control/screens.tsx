import { createFileRoute } from '@tanstack/react-router'
import { ScreensRegistryPage } from '@/features/access-control/pages/screens-registry-page'

export const Route = createFileRoute('/_authenticated/access-control/screens')({
  component: ScreensRegistryPage,
})
