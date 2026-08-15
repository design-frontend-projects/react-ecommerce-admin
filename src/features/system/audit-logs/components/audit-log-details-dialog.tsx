'use client'

import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { type AuditLog } from '../queries'

interface AuditLogDetailsDialogProps {
  log: AuditLog | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuditLogDetailsDialog({
  log,
  open,
  onOpenChange,
}: AuditLogDetailsDialogProps) {
  const { t } = useTranslation()

  if (!log) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[80vh] max-w-2xl flex-col'>
        <DialogHeader>
          <DialogTitle>{t('system.auditLogs.detailsDialog.title')}</DialogTitle>
        </DialogHeader>
        <ScrollArea className='flex-1 pr-4'>
          <div className='space-y-4 py-4'>
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div>
                <p className='text-muted-foreground'>{t('system.auditLogs.detailsDialog.activityType')}</p>
                <p className='font-medium'>{log.activity_types?.name}</p>
              </div>
              <div>
                <p className='text-muted-foreground'>{t('system.auditLogs.detailsDialog.action')}</p>
                <p className='font-medium'>{log.action}</p>
              </div>
              <div>
                <p className='text-muted-foreground'>{t('system.auditLogs.detailsDialog.entityType')}</p>
                <Badge variant='secondary'>{log.entity_type}</Badge>
              </div>
              <div>
                <p className='text-muted-foreground'>{t('system.auditLogs.detailsDialog.entityId')}</p>
                <code className='rounded bg-muted p-1 font-mono text-xs'>
                  {log.entity_id}
                </code>
              </div>
              <div>
                <p className='text-muted-foreground'>{t('system.auditLogs.detailsDialog.user')}</p>
                <p className='font-medium'>{log.tenant_users?.email ?? log.user_id}</p>
              </div>
              <div>
                <p className='text-muted-foreground'>{t('system.auditLogs.detailsDialog.timestamp')}</p>
                <p className='font-medium'>
                  {format(new Date(log.created_at), 'PPPPpppp')}
                </p>
              </div>
            </div>

            {log.old_values && (
              <div className='space-y-2'>
                <p className='text-sm font-medium text-muted-foreground'>
                  {t('system.auditLogs.detailsDialog.oldValues')}
                </p>
                <pre className='max-h-[200px] overflow-auto rounded-md bg-muted p-4 font-mono text-xs'>
                  {JSON.stringify(log.old_values, null, 2)}
                </pre>
              </div>
            )}

            {log.new_values && (
              <div className='space-y-2'>
                <p className='text-sm font-medium text-muted-foreground'>
                  {t('system.auditLogs.detailsDialog.newValues')}
                </p>
                <pre className='max-h-[200px] overflow-auto rounded-md bg-muted p-4 font-mono text-xs'>
                  {JSON.stringify(log.new_values, null, 2)}
                </pre>
              </div>
            )}

            {log.metadata && (
              <div className='space-y-2'>
                <p className='text-sm font-medium text-muted-foreground'>
                  {t('system.auditLogs.detailsDialog.metadata')}
                </p>
                <pre className='max-h-[200px] overflow-auto rounded-md bg-muted p-4 font-mono text-xs'>
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}

            {(log.ip_address || log.user_agent) && (
              <div className='space-y-1 border-t pt-4 text-xs text-muted-foreground'>
                {log.ip_address && <p>{t('system.auditLogs.detailsDialog.ipAddress')}: {log.ip_address}</p>}
                {log.user_agent && <p>{t('system.auditLogs.detailsDialog.userAgent')}: {log.user_agent}</p>}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
