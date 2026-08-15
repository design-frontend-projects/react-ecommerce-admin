'use client'

import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type AuditLog, useAuditLogs, useActivityTypes } from '../queries'
import { AuditLogDetailsDialog } from './audit-log-details-dialog'

export function AuditLogsTable() {
  const { t } = useTranslation()
  const [filters, setFilters] = React.useState({
    entityType: '',
    activityTypeId: '',
  })

  const { data: logs, isLoading } = useAuditLogs(filters)
  const { data: activityTypes } = useActivityTypes()

  const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null)

  const columns: ColumnDef<AuditLog>[] = React.useMemo(
    () => [
      {
        accessorKey: 'created_at',
        header: t('system.auditLogs.table.time'),
        cell: ({ row }) => (
          <span className='text-sm'>
            {format(new Date(row.original.created_at), 'MMM d, HH:mm:ss')}
          </span>
        ),
      },
      {
        accessorKey: 'tenant_users.email',
        header: t('system.auditLogs.table.user'),
        cell: ({ row }) => (
          <div className='flex flex-col'>
            <span className='font-medium'>
              {[
                row.original.tenant_users?.first_name,
                row.original.tenant_users?.last_name,
              ]
                .filter(Boolean)
                .join(' ') || t('common.unknown', 'Unknown')}
            </span>
            <span className='text-xs text-muted-foreground'>
              {row.original.tenant_users?.email ?? row.original.user_id}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'activity_types.name',
        header: t('system.auditLogs.table.activity'),
        cell: ({ row }) => (
          <Badge variant='outline'>{row.original.activity_types?.name}</Badge>
        ),
      },
      {
        accessorKey: 'action',
        header: t('system.auditLogs.table.action'),
      },
      {
        accessorKey: 'entity_type',
        header: t('system.auditLogs.table.entity'),
        cell: ({ row }) => (
          <Badge variant='secondary'>{row.original.entity_type}</Badge>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <Button
            variant='ghost'
            size='icon'
            onClick={() => setSelectedLog(row.original)}
          >
            <Eye className='h-4 w-4' />
          </Button>
        ),
      },
    ],
    [t]
  )

  const table = useReactTable({
    data: logs || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap gap-4'>
        <div className='min-w-[200px] flex-1'>
          <Input
            placeholder={t('system.auditLogs.table.filterEntityPlaceholder')}
            value={filters.entityType}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, entityType: e.target.value }))
            }
          />
        </div>
        <div className='w-[200px]'>
          <Select
            value={filters.activityTypeId}
            onValueChange={(val) =>
              setFilters((prev) => ({
                ...prev,
                activityTypeId: val === 'all' ? '' : val,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t('system.auditLogs.table.activityType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>{t('system.auditLogs.table.allTypes')}</SelectItem>
              {activityTypes?.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center'
                >
                  {t('system.auditLogs.table.loading')}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center'
                >
                  {t('system.auditLogs.table.noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className='flex items-center justify-end space-x-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {t('system.auditLogs.table.previous')}
        </Button>
        <Button
          variant='outline'
          size='sm'
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {t('system.auditLogs.table.next')}
        </Button>
      </div>

      <AuditLogDetailsDialog
        log={selectedLog}
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      />
    </div>
  )
}
