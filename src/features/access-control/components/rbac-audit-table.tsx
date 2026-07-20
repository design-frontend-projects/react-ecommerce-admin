import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useRbacAudit } from '../hooks/use-rbac-audit'

/**
 * Read-only view of the RBAC change log (`rbac_audit`). Shows who changed roles, permissions,
 * screens, and per-user overrides, when, and a summary diff. Empty (rather than erroring) when
 * the `rbac_audit` migration has not yet been applied.
 */
export function RbacAuditTable() {
  const auditQuery = useRbacAudit({ limit: 50, offset: 0 })

  if (auditQuery.isLoading) {
    return (
      <div className='flex flex-col gap-2'>
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className='h-10 w-full' />
        ))}
      </div>
    )
  }

  const rows = auditQuery.data?.entries ?? []

  if (rows.length === 0) {
    return (
      <p className='py-8 text-center text-sm text-muted-foreground'>
        No RBAC changes recorded yet.
      </p>
    )
  }

  return (
    <div className='overflow-x-auto rounded-lg border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className='whitespace-nowrap text-sm text-muted-foreground'>
                {new Date(row.created_at).toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge variant='outline'>{row.action}</Badge>
              </TableCell>
              <TableCell className='text-sm'>
                <span className='text-muted-foreground'>{row.target_type}</span>{' '}
                <span className='font-mono text-xs'>{row.target_id}</span>
              </TableCell>
              <TableCell className='max-w-md'>
                <code className='block truncate text-xs text-muted-foreground'>
                  {row.diff ? JSON.stringify(row.diff) : '—'}
                </code>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
