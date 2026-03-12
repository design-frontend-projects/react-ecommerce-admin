'use client'

import * as React from 'react'
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
  const [filters, setFilters] = React.useState({
    entityType: '',
    activityTypeId: '',
  })

  const { data: logs, isLoading } = useAuditLogs(filters)
  const { data: activityTypes } = useActivityTypes()

  const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null)

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: 'created_at',
      header: 'Time',
      cell: ({ row }) => (
        <span className='text-sm'>
          {format(new Date(row.original.created_at), 'MMM d, HH:mm:ss')}
        </span>
      ),
    },
    {
      accessorKey: 'profiles.email',
      header: 'User',
      cell: ({ row }) => (
        <div className='flex flex-col'>
          <span className='font-medium'>
            {row.original.profiles?.first_name}{' '}
            {row.original.profiles?.last_name}
          </span>
          <span className='text-xs text-muted-foreground'>
            {row.original.profiles?.email}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'activity_types.name',
      header: 'Activity',
      cell: ({ row }) => (
        <Badge variant='outline'>{row.original.activity_types?.name}</Badge>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Action',
    },
    {
      accessorKey: 'entity_type',
      header: 'Entity',
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
  ]

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
            placeholder='Filter by entity type...'
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
              <SelectValue placeholder='Activity Type' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Types</SelectItem>
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
                  Loading...
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
                  No results.
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
          Previous
        </Button>
        <Button
          variant='outline'
          size='sm'
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
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
