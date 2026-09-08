import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import {
  type SortingState,
  type VisibilityState,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { PackageOpen } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import type { StockBalanceRow } from '../data/schema'
import { columns } from './stock-balances-columns'

interface Props {
  data: StockBalanceRow[]
}

const CONDITION_FILTER_OPTIONS = [
  { label: 'Good', value: 'good' },
  { label: 'Damaged', value: 'damaged' },
  { label: 'Refurbished', value: 'refurbished' },
  { label: 'Returned', value: 'returned' },
]

const STATUS_FILTER_OPTIONS = [
  { label: 'In Stock', value: 'in_stock' },
  { label: 'Low Stock', value: 'low_stock' },
  { label: 'Out of Stock', value: 'out_of_stock' },
]

export function StockBalancesTable({ data }: Props) {
  const { t } = useTranslation()
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'qty_on_hand', desc: true },
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

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <DataTableToolbar
        table={table}
        searchPlaceholder={t(
          'stockBalances.table.filterPlaceholder',
          'Search by SKU, product name, barcode...'
        )}
        searchKey='product_name'
        filters={[
          {
            columnId: 'condition',
            title: 'Condition',
            options: CONDITION_FILTER_OPTIONS,
          },
          {
            columnId: 'status',
            title: 'Stock Status',
            options: STATUS_FILTER_OPTIONS,
          },
        ]}
      />

      <div className='overflow-hidden rounded-lg border bg-card shadow-2xs'>
        <Table>
          <TableHeader className='bg-muted/40'>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className='py-3 text-xs font-semibold'>
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
                  className='transition-colors hover:bg-muted/30'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className='py-2.5'>
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
                  className='h-36 text-center text-muted-foreground'
                >
                  <div className='flex flex-col items-center justify-center gap-1'>
                    <PackageOpen className='h-8 w-8 stroke-1 text-muted-foreground/50' />
                    <span className='font-medium text-sm'>No stock balances found</span>
                    <span className='text-xs text-muted-foreground/80'>
                      No inventory records matched your filters or warehouse selection.
                    </span>
                  </div>
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
