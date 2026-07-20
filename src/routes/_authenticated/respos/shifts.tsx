import { createFileRoute } from '@tanstack/react-router'
import { RequirePermission } from '@/components/rbac/require-permission'
import { ShiftManagement } from '@/features/respos/pages/shifts'

function GuardedShiftManagement() {
  return (
    <RequirePermission
      role={['admin', 'super_admin', 'manager']}
      permission={['shifts.view', 'shifts.manage']}
    >
      <ShiftManagement />
    </RequirePermission>
  )
}

export const Route = createFileRoute('/_authenticated/respos/shifts')({
  component: GuardedShiftManagement,
})
