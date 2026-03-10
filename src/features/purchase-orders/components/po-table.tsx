import { useState } from 'react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type PurchaseOrder } from '../hooks/use-purchase-orders'
import { poColumns } from './po-columns'

interface POTableProps {
  data: PurchaseOrder[]
}

export function POTable({ data }: POTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredData =
    statusFilter === 'all'
      ? data
      : data.filter((po) => po.status === statusFilter)

  const table = useReactTable({
    data: filteredData,
    columns: poColumns,
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
          placeholder='Search by supplier...'
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
            <SelectValue placeholder='Status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Statuses</SelectItem>
            <SelectItem value='pending'>Pending</SelectItem>
            <SelectItem value='partial'>Partial</SelectItem>
            <SelectItem value='received'>Received</SelectItem>
            <SelectItem value='cancelled'>Cancelled</SelectItem>
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
                  colSpan={poColumns.length}
                  className='h-24 text-center'
                >
                  No purchase orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className='flex items-center justify-between'>
        <p className='text-sm text-muted-foreground'>
          {table.getFilteredRowModel().rows.length} purchase order(s)
        </p>
        <div className='flex items-center space-x-2'>
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
      </div>
    </div>
  )
}
