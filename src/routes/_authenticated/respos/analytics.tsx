import { createFileRoute } from '@tanstack/react-router'
import { RequirePermission } from '@/components/rbac/require-permission'
import { Analytics } from '@/features/respos/pages/analytics'

function GuardedAnalytics() {
  return (
    <RequirePermission role={['admin', 'super_admin']}>
      <Analytics />
    </RequirePermission>
  )
}

export const Route = createFileRoute('/_authenticated/respos/analytics')({
  component: GuardedAnalytics,
})
