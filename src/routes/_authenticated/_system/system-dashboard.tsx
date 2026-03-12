import { createFileRoute } from '@tanstack/react-router'
import { SystemDashboard } from '@/features/system/dashboard/components/system-dashboard'

export const Route = createFileRoute('/_authenticated/_system/system-dashboard')({
  component: SystemDashboardRoute,
})

function SystemDashboardRoute() {
  return <SystemDashboard />
}
