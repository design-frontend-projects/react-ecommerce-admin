import { createFileRoute } from '@tanstack/react-router'
import AuditLogsPage from '@/features/system/audit-logs'

export const Route = createFileRoute('/_authenticated/_system/audit-logs')({
  component: AuditLogsPageRoute,
})

function AuditLogsPageRoute() {
  return <AuditLogsPage />
}
