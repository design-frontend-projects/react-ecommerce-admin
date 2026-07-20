'use client'

import { RbacAuditTable } from '@/features/access-control/components/rbac-audit-table';
import { AuditLogsTable } from './components/audit-logs-table';

export default function AuditLogsPage() {
  return (
    <div className='container mx-auto space-y-6 py-6'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Audit Logs</h1>
        <p className='text-muted-foreground'>
          Track system activities, changes, and user actions.
        </p>
      </div>

      <div className='rounded-lg border bg-card p-6'>
        <AuditLogsTable />
      </div>

      <div className="bg-card rounded-lg border p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Access control changes</h2>
          <p className="text-muted-foreground text-sm">
            Role, permission, screen, and per-user override changes.
          </p>
        </div>
        <RbacAuditTable />
      </div>
    </div>
  )
}
