import { createFileRoute } from '@tanstack/react-router'
import CaptainDashboard from '@/features/respos/pages/captain'

export const Route = createFileRoute('/_authenticated/respos/captain')({
  component: RouteComponent,
})

function RouteComponent() {
  return <CaptainDashboard />
}
