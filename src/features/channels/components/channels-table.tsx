import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type ColumnFiltersState,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import type { Channel } from '../data/schema'
import { columns } from './channels-columns'

interface ChannelsTableProps {
  data: Channel[]
}

export function ChannelsTable({ data }: ChannelsTableProps) {
  const { t } = useTranslation()
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'name', desc: false },
  ])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getPaginationRowModel: getPaginationRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const statusFilterValue =
    (table.getColumn('is_active')?.getFilterValue() as string) || 'all'

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <DataTableToolbar
        table={table}
        searchKey='name'
        searchPlaceholder={t('channels.table.filterPlaceholder', {
          defaultValue: 'Filter by channel name...',
        })}
        toolbarActions={
          <div className='flex items-center gap-2'>
            <Select
              value={statusFilterValue}
              onValueChange={(val) => {
                table
                  .getColumn('is_active')
                  ?.setFilterValue(val === 'all' ? undefined : val)
              }}
            >
              <SelectTrigger className='h-8 w-[130px]'>
                <SelectValue placeholder={t('common.status', { defaultValue: 'Status' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>
                  {t('common.allStatus', { defaultValue: 'All Status' })}
                </SelectItem>
                <SelectItem value='true'>
                  {t('common.active', { defaultValue: 'Active' })}
                </SelectItem>
                <SelectItem value='false'>
                  {t('common.inactive', { defaultValue: 'Inactive' })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className='overflow-hidden rounded-md border bg-card'>
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
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
                  className='h-32 text-center text-muted-foreground'
                >
                  {t('channels.table.noResults', {
                    defaultValue: 'No sales channels found.',
                  })}
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
