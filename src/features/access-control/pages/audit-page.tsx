import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { useRbacAudit } from '../hooks/use-rbac-audit'

const PAGE_SIZE = 25
const ALL_TARGETS = 'all'

/** Colour-code destructive vs additive actions at a glance. */
function actionVariant(action: string) {
  if (action.includes('delete') || action.includes('revoke')) {
    return 'destructive' as const
  }
  if (action.includes('create') || action.includes('grant')) {
    return 'default' as const
  }
  return 'secondary' as const
}

function formatTimestamp(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

export function AuditPage() {
  const { t } = useTranslation()
  const [offset, setOffset] = useState(0)
  const [targetType, setTargetType] = useState<string>(ALL_TARGETS)

  const TARGET_TYPES = [
    { value: ALL_TARGETS, label: t('accessControl.auditPage.allTargets') },
    { value: 'role', label: t('accessControl.auditPage.targetRoles') },
    { value: 'role_permissions', label: t('accessControl.auditPage.targetRolePermissions') },
    { value: 'user_roles', label: t('accessControl.auditPage.targetUserRoles') },
    { value: 'user_permissions', label: t('accessControl.auditPage.targetUserOverrides') },
    { value: 'permission', label: t('accessControl.auditPage.targetPermissions') },
  ]

  const auditQuery = useRbacAudit({
    limit: PAGE_SIZE,
    offset,
    targetType: targetType === ALL_TARGETS ? undefined : targetType,
  })

  if (auditQuery.isUnauthorized) {
    return (
      <Main className='flex flex-1 items-center justify-center'>
        <Alert className='max-w-xl'>
          <AlertTitle>{t('accessControl.auditPage.restrictedTitle')}</AlertTitle>
          <AlertDescription>
            {t('accessControl.auditPage.restrictedDesc')}
          </AlertDescription>
        </Alert>
      </Main>
    )
  }

  const payload = auditQuery.data
  const entries = payload?.entries ?? []
  const total = payload?.total ?? 0
  const pageEnd = Math.min(offset + PAGE_SIZE, total)

  return (
    <>
      <Header fixed>
        <div className='flex min-w-0 flex-1 items-center justify-between gap-4'>
          <div className='flex min-w-0 flex-col gap-1'>
            <p className='text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase'>
              {t('accessControl.auditPage.category')}
            </p>
            <h1 className='truncate text-lg font-semibold'>{t('accessControl.auditPage.title')}</h1>
          </div>
          <Select
            value={targetType}
            onValueChange={(value) => {
              setTargetType(value)
              setOffset(0)
            }}
          >
            <SelectTrigger className='w-52'>
              <SelectValue placeholder={t('accessControl.auditPage.filterPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {TARGET_TYPES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-6'>
        <p className='max-w-3xl text-sm text-muted-foreground'>
          {t('accessControl.auditPage.subtitle')}
        </p>

        {auditQuery.isLoading && (
          <div className='flex flex-col gap-3'>
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
          </div>
        )}

        {auditQuery.isError && (
          <Alert variant='destructive'>
            <AlertTitle>{t('accessControl.auditPage.failedLoadTitle')}</AlertTitle>
            <AlertDescription>
              {auditQuery.error instanceof Error
                ? auditQuery.error.message
                : t('accessControl.auditPage.pleaseTryAgain')}
            </AlertDescription>
          </Alert>
        )}

        {!auditQuery.isLoading && !auditQuery.isError && (
          <>
            <div className='overflow-hidden rounded-xl border border-border/70'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-48'>{t('accessControl.auditPage.when')}</TableHead>
                    <TableHead className='w-56'>{t('accessControl.auditPage.action')}</TableHead>
                    <TableHead>{t('accessControl.auditPage.target')}</TableHead>
                    <TableHead className='w-64'>{t('accessControl.auditPage.actor')}</TableHead>
                    <TableHead className='w-24 text-right'>{t('accessControl.auditPage.details')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className='py-12 text-center text-sm text-muted-foreground'
                      >
                        {t('accessControl.auditPage.noEntries')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className='text-sm text-muted-foreground'>
                          {formatTimestamp(entry.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={actionVariant(entry.action)}>
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-sm'>
                          <span className='text-muted-foreground'>
                            {entry.target_type}
                          </span>{' '}
                          <span className='font-mono text-xs'>
                            {entry.target_id}
                          </span>
                        </TableCell>
                        <TableCell className='font-mono text-xs text-muted-foreground'>
                          {entry.actor_auth_user_id ?? 'system'}
                        </TableCell>
                        <TableCell className='text-right'>
                          {entry.diff ? (
                            <Collapsible>
                              <CollapsibleTrigger asChild>
                                <Button variant='ghost' size='sm'>
                                  {t('accessControl.auditPage.view')}
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <pre className='mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-left text-xs'>
                                  {JSON.stringify(entry.diff, null, 2)}
                                </pre>
                              </CollapsibleContent>
                            </Collapsible>
                          ) : (
                            <span className='text-xs text-muted-foreground'>
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className='flex items-center justify-between gap-4'>
              <p className='text-sm text-muted-foreground'>
                {total === 0
                  ? t('accessControl.auditPage.noEntriesCount')
                  : t('accessControl.auditPage.showingRange', { start: offset + 1, end: pageEnd, total })}
              </p>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(offset - PAGE_SIZE, 0))}
                >
                  {t('accessControl.auditPage.previous')}
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={pageEnd >= total}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  {t('accessControl.auditPage.next')}
                </Button>
              </div>
            </div>
          </>
        )}
      </Main>
    </>
  )
}
