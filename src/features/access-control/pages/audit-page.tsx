import { useState } from 'react'
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

const TARGET_TYPES = [
  { value: ALL_TARGETS, label: 'All targets' },
  { value: 'role', label: 'Roles' },
  { value: 'role_permissions', label: 'Role permissions' },
  { value: 'user_roles', label: 'User roles' },
  { value: 'user_permissions', label: 'User overrides' },
  { value: 'permission', label: 'Permissions' },
]

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
  const [offset, setOffset] = useState(0)
  const [targetType, setTargetType] = useState<string>(ALL_TARGETS)

  const auditQuery = useRbacAudit({
    limit: PAGE_SIZE,
    offset,
    targetType: targetType === ALL_TARGETS ? undefined : targetType,
  })

  if (auditQuery.isUnauthorized) {
    return (
      <Main className='flex flex-1 items-center justify-center'>
        <Alert className='max-w-xl'>
          <AlertTitle>Access restricted</AlertTitle>
          <AlertDescription>
            Your account does not have permission to view the RBAC audit trail.
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
              Access control
            </p>
            <h1 className='truncate text-lg font-semibold'>Audit trail</h1>
          </div>
          <Select
            value={targetType}
            onValueChange={(value) => {
              setTargetType(value)
              setOffset(0)
            }}
          >
            <SelectTrigger className='w-52'>
              <SelectValue placeholder='Filter by target' />
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
          Every role, permission, and override change in your tenant, newest
          first. Entries are append-only and cannot be edited or removed.
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
            <AlertTitle>Failed to load the audit trail</AlertTitle>
            <AlertDescription>
              {auditQuery.error instanceof Error
                ? auditQuery.error.message
                : 'Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        {!auditQuery.isLoading && !auditQuery.isError && (
          <>
            <div className='overflow-hidden rounded-xl border border-border/70'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-48'>When</TableHead>
                    <TableHead className='w-56'>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead className='w-64'>Actor</TableHead>
                    <TableHead className='w-24 text-right'>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className='py-12 text-center text-sm text-muted-foreground'
                      >
                        No audit entries recorded yet.
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
                                  View
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
                  ? 'No entries'
                  : `Showing ${offset + 1}–${pageEnd} of ${total}`}
              </p>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(offset - PAGE_SIZE, 0))}
                >
                  Previous
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={pageEnd >= total}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Main>
    </>
  )
}
