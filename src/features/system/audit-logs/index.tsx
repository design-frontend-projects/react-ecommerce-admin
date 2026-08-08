'use client'

import { useTranslation } from 'react-i18next'
import { RbacAuditTable } from '@/features/access-control/components/rbac-audit-table'
import { AuditLogsTable } from './components/audit-logs-table'

export default function AuditLogsPage() {
  const { t } = useTranslation()

  return (
    <div className='container mx-auto space-y-6 py-6'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>{t('system.auditLogs.title')}</h1>
        <p className='text-muted-foreground'>
          {t('system.auditLogs.subtitle')}
        </p>
      </div>

      <div className='rounded-lg border bg-card p-6'>
        <AuditLogsTable />
      </div>

      <div className='bg-card rounded-lg border p-6 space-y-4'>
        <div>
          <h2 className='text-xl font-semibold tracking-tight'>{t('system.auditLogs.accessControlTitle')}</h2>
          <p className='text-muted-foreground text-sm'>
            {t('system.auditLogs.accessControlSubtitle')}
          </p>
        </div>
        <RbacAuditTable />
      </div>
    </div>
  )
}
