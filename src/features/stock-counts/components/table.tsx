import { useTranslation } from 'react-i18next'
import { useState, useMemo } from 'react'
import {
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Filter } from 'lucide-react'
import type { CountListItem } from '../data/schema'
import { getColumns } from './columns'
import { useCountsContext } from './provider'

export function CountsTable({ data }: { data: CountListItem[] }) {
  const { t } = useTranslation()
  const { statusFilter, setStatusFilter } = useCountsContext()
  const columns = useMemo(() => getColumns(t), [t])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])

  const filteredData = useMemo(() => {
    if (statusFilter === 'all') return data
    return data.filter((c) => c.status === statusFilter)
  }, [data, statusFilter])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getPaginationRowModel: getPaginationRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex-1 min-w-[240px]'>
          <DataTableToolbar
            table={table}
            searchPlaceholder={t('stockCounts.table.filterPlaceholder', { defaultValue: 'Filter by count #...' })}
            searchKey='count_number'
          />
        </div>

        {statusFilter !== 'all' && (
          <div className='flex items-center gap-1.5'>
            <Badge variant='outline' className='text-xs py-1 px-2.5 flex items-center gap-1 border-primary/40 bg-primary/5'>
              <Filter className='h-3 w-3 text-primary' />
              <span>Status: <strong className='capitalize'>{statusFilter}</strong></span>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => setStatusFilter('all')}
                className='h-4 w-4 p-0 ml-1 hover:bg-transparent text-muted-foreground hover:text-foreground'
              >
                <X className='h-3 w-3' />
              </Button>
            </Badge>
          </div>
        )}
      </div>

      <div className='overflow-hidden rounded-xl border bg-card shadow-2xs'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='bg-muted/30'>
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className='hover:bg-muted/40 transition-colors'
                >
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
                  className='h-32 text-center text-muted-foreground text-xs'
                >
                  <p className='font-medium'>
                    {statusFilter !== 'all'
                      ? t('stockCounts.table.noFilteredResults', 'No stock counts found with status: {{status}}', { status: statusFilter })
                      : t('stockCounts.table.noResults', 'No stock counts created yet.')}
                  </p>
                  {statusFilter !== 'all' && (
                    <Button
                      variant='link'
                      size='sm'
                      onClick={() => setStatusFilter('all')}
                      className='mt-1 text-xs'
                    >
                      {t('stockCounts.table.clearFilter', 'Clear status filter')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} className='mt-auto' />
    </div>
  )
}
