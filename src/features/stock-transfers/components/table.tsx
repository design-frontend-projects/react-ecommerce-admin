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
import type { TransferListItem } from '../data/schema'
import { getColumns } from './columns'

export function TransfersTable({ data }: { data: TransferListItem[] }) {
  const { t } = useTranslation()
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo(() => getColumns(t), [t])

  const table = useReactTable({
    data,
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

  const statusFilterOptions = useMemo(
    () => [
      { label: t('stockTransfers.status.draft', 'Draft'), value: 'draft' },
      {
        label: t('stockTransfers.status.approved', 'Approved'),
        value: 'approved',
      },
      { label: t('stockTransfers.status.picked', 'Picked'), value: 'picked' },
      {
        label: t('stockTransfers.status.in_transit', 'In Transit'),
        value: 'in_transit',
      },
      {
        label: t('stockTransfers.status.received', 'Received'),
        value: 'received',
      },
      {
        label: t('stockTransfers.status.completed', 'Completed'),
        value: 'completed',
      },
      {
        label: t('stockTransfers.status.cancelled', 'Cancelled'),
        value: 'cancelled',
      },
    ],
    [t]
  )

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <DataTableToolbar
        table={table}
        searchPlaceholder={t('stockTransfers.table.filterPlaceholder', {
          defaultValue: 'Filter stock transfers...',
        })}
        searchKey='reference_no'
        filters={[
          {
            columnId: 'status',
            title: t('stockTransfers.columns.status', 'Status'),
            options: statusFilterOptions,
          },
        ]}
      />
      <div className='overflow-hidden rounded-md border'>
        <Table className='min-w-[760px]'>
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
                  colSpan={columns.length}
                  className='h-24 text-center'
                >
                  {t('stockTransfers.table.noResults', 'No transfers yet.')}
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
