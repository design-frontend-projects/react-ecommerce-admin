import { useState, useMemo } from 'react'
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
import { useTranslation } from 'react-i18next'
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
import { DataTablePagination } from '@/components/data-table'
import type { RequisitionListItem } from '../data/schema'
import { getColumns } from './columns'

interface RequisitionsTableProps {
  data: RequisitionListItem[]
}

export function RequisitionsTable({ data }: RequisitionsTableProps) {
  const { t } = useTranslation()
  const tableColumns = useMemo(() => getColumns(t), [t])
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'created_at', desc: true },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredData =
    statusFilter === 'all'
      ? data
      : data.filter((req) => req.status === statusFilter)

  const table = useReactTable({
    data: filteredData,
    columns: tableColumns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <div className='space-y-4 flex flex-1 flex-col'>
      {/* Filters Toolbar */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-3'>
          <Input
            placeholder={t('purchaseRequisitions.table.searchPlaceholder', 'Search requisition number...')}
            value={
              (table
                .getColumn('requisition_number')
                ?.getFilterValue() as string) ?? ''
            }
            onChange={(event) =>
              table
                .getColumn('requisition_number')
                ?.setFilterValue(event.target.value)
            }
            className='h-9 w-64'
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className='h-9 w-[160px]'>
              <SelectValue placeholder={t('purchaseRequisitions.table.allStatuses', 'All Statuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>{t('purchaseRequisitions.table.allStatuses', 'All Statuses')}</SelectItem>
              <SelectItem value='draft'>{t('purchaseRequisitions.status.draft', 'Draft')}</SelectItem>
              <SelectItem value='submitted'>{t('purchaseRequisitions.status.submitted', 'Submitted')}</SelectItem>
              <SelectItem value='approved'>{t('purchaseRequisitions.status.approved', 'Approved')}</SelectItem>
              <SelectItem value='rejected'>{t('purchaseRequisitions.status.rejected', 'Rejected')}</SelectItem>
              <SelectItem value='converted'>{t('purchaseRequisitions.status.converted', 'Converted to PO')}</SelectItem>
              <SelectItem value='cancelled'>{t('purchaseRequisitions.status.cancelled', 'Cancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='text-xs text-muted-foreground'>
          {t('purchaseRequisitions.table.showingCount', 'Showing {{filtered}} of {{total}} requisition(s)', {
            filtered: filteredData.length,
            total: data.length,
          })}
        </div>
      </div>

      {/* Table */}
      <div className='rounded-md border overflow-x-auto bg-card'>
        <Table className='min-w-[800px]'>
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
                  colSpan={tableColumns.length}
                  className='h-24 text-center text-sm text-muted-foreground'
                >
                  {t('purchaseRequisitions.table.noResults', 'No purchase requisitions found.')}
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
