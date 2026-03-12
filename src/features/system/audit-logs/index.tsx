'use client';

import { AuditLogsTable } from './components/audit-logs-table';

export default function AuditLogsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          Track system activities, changes, and user actions.
        </p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <AuditLogsTable />
      </div>
    </div>
  );
}
