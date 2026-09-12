import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
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
import { type PurchaseOrder } from '../hooks/use-purchase-orders'
import { getPOColumns } from './po-columns'

interface POTableProps {
  data: PurchaseOrder[]
}

export function POTable({ data }: POTableProps) {
  const { t } = useTranslation()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const columns = useMemo(() => getPOColumns(t), [t])

  const filteredData =
    statusFilter === 'all'
      ? data
      : data.filter((po) => po.status === statusFilter)

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <div className='space-y-4'>
      {/* Filters */}
      <div className='flex flex-wrap items-center gap-3'>
        <Input
          placeholder={t('purchaseOrders.searchBySupplier', 'Search by supplier...')}
          value={
            (table.getColumn('suppliers')?.getFilterValue() as string) ?? ''
          }
          onChange={(event) =>
            table.getColumn('suppliers')?.setFilterValue(event.target.value)
          }
          className='max-w-xs'
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className='w-[150px]'>
            <SelectValue placeholder={t('purchaseOrders.columns.status', 'Status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{t('purchaseOrders.allStatuses', 'All Statuses')}</SelectItem>
            <SelectItem value='pending'>{t('purchaseOrders.status.pending', 'Pending')}</SelectItem>
            <SelectItem value='partial'>{t('purchaseOrders.status.partial', 'Partial')}</SelectItem>
            <SelectItem value='received'>{t('purchaseOrders.status.received', 'Received')}</SelectItem>
            <SelectItem value='cancelled'>{t('purchaseOrders.status.cancelled', 'Cancelled')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
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
                  {t('purchaseOrders.noOrdersFound', 'No purchase orders found.')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className='flex items-center justify-between'>
        <p className='text-sm text-muted-foreground'>
          {t('purchaseOrders.orderCount', '{{count}} purchase order(s)', { count: table.getFilteredRowModel().rows.length })}
        </p>
        <div className='flex items-center space-x-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {t('common.previous', 'Previous')}
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t('common.next', 'Next')}
          </Button>
        </div>
      </div>
    </div>
  )
}
