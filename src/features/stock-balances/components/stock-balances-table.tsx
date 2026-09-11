import { useTranslation } from 'react-i18next'
import { useState, useMemo } from 'react'
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
import { getColumns } from './stock-balances-columns'

interface Props {
  data: StockBalanceRow[]
}

export function StockBalancesTable({ data }: Props) {
  const { t } = useTranslation()
  const columns = useMemo(() => getColumns(t), [t])

  const conditionFilterOptions = useMemo(
    () => [
      { label: t('stockBalances.conditions.good', 'Good'), value: 'good' },
      { label: t('stockBalances.conditions.damaged', 'Damaged'), value: 'damaged' },
      {
        label: t('stockBalances.conditions.refurbished', 'Refurbished'),
        value: 'refurbished',
      },
      { label: t('stockBalances.conditions.returned', 'Returned'), value: 'returned' },
    ],
    [t]
  )

  const statusFilterOptions = useMemo(
    () => [
      { label: t('stockBalances.statuses.inStock', 'In Stock'), value: 'in_stock' },
      { label: t('stockBalances.statuses.lowStock', 'Low Stock'), value: 'low_stock' },
      {
        label: t('stockBalances.statuses.outOfStock', 'Out of Stock'),
        value: 'out_of_stock',
      },
    ],
    [t]
  )

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
            title: t('stockBalances.table.conditionFilter', 'Condition'),
            options: conditionFilterOptions,
          },
          {
            columnId: 'status',
            title: t('stockBalances.table.statusFilter', 'Stock Status'),
            options: statusFilterOptions,
          },
        ]}
      />

      <div className='overflow-hidden rounded-lg border bg-card shadow-2xs'>
        <Table>
          <TableHeader className='bg-muted/40'>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className='py-3 text-xs font-semibold'
                  >
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
                    <span className='font-medium text-sm'>
                      {t('stockBalances.table.noResults', 'No stock balances found')}
                    </span>
                    <span className='text-xs text-muted-foreground/80'>
                      {t(
                        'stockBalances.table.noResultsDesc',
                        'No inventory records matched your filters or warehouse selection.'
                      )}
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

