import { createFileRoute } from '@tanstack/react-router'
import { KitchenDisplay } from '@/features/respos/pages/kitchen'

export const Route = createFileRoute('/_authenticated/respos/kitchen')({
  component: KitchenDisplay,
})
