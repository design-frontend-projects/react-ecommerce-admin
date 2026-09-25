import { useTranslation } from 'react-i18next'
import { useState, useMemo, useEffect, useRef } from 'react'
import {
  type SortingState,
  type VisibilityState,
  type ColumnFiltersState,
  type Updater,
  flexRender,
  getCoreRowModel,
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
import { Skeleton } from '@/components/ui/skeleton'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import type { StockBalanceRow } from '../data/schema'
import { getColumns } from './stock-balances-columns'

interface Props {
  data: StockBalanceRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  search: string
  onSearchChange: (search: string) => void
  condition?: string
  onConditionChange?: (condition: string | undefined) => void
  stockStatus?: string
  onStockStatusChange?: (status: string | undefined) => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange: (sortBy?: string, sortOrder?: 'asc' | 'desc') => void
  isLoading?: boolean
}

export function StockBalancesTable({
  data,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  search,
  onSearchChange,
  condition,
  onConditionChange,
  stockStatus,
  onStockStatusChange,
  sortBy,
  sortOrder,
  onSortChange,
  isLoading = false,
}: Props) {
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
  const [internalFilters, setInternalFilters] = useState<ColumnFiltersState>(() => {
    const init: ColumnFiltersState = []
    if (search) init.push({ id: 'product_name', value: search })
    if (condition) init.push({ id: 'condition', value: [condition] })
    if (stockStatus) init.push({ id: 'status', value: [stockStatus] })
    return init
  })

  // Debounced search dispatch
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleColumnFiltersChange = (updater: Updater<ColumnFiltersState>) => {
    const nextFilters =
      typeof updater === 'function' ? updater(internalFilters) : updater
    setInternalFilters(nextFilters)

    const searchVal =
      (nextFilters.find((f) => f.id === 'product_name')?.value as string) ?? ''
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      onSearchChange(searchVal)
    }, 300)

    const condVals = nextFilters.find((f) => f.id === 'condition')?.value as
      | string[]
      | undefined
    const selectedCond = condVals && condVals.length > 0 ? condVals[0] : undefined
    if (selectedCond !== condition && onConditionChange) {
      onConditionChange(selectedCond)
    }

    const statVals = nextFilters.find((f) => f.id === 'status')?.value as
      | string[]
      | undefined
    const selectedStat = statVals && statVals.length > 0 ? statVals[0] : undefined
    if (selectedStat !== stockStatus && onStockStatusChange) {
      onStockStatusChange(selectedStat)
    }
  }

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  const [sorting, setSorting] = useState<SortingState>(() => {
    if (sortBy) {
      return [{ id: sortBy, desc: sortOrder === 'desc' }]
    }
    return [{ id: 'updated_at', desc: true }]
  })

  const handleSortingChange = (updater: Updater<SortingState>) => {
    const nextSorting = typeof updater === 'function' ? updater(sorting) : updater
    setSorting(nextSorting)
    if (nextSorting && nextSorting.length > 0) {
      onSortChange(nextSorting[0].id, nextSorting[0].desc ? 'desc' : 'asc')
    } else {
      onSortChange(undefined, undefined)
    }
  }

  const table = useReactTable({
    data,
    columns,
    pageCount: totalPages,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    state: {
      pagination: {
        pageIndex: Math.max(0, page - 1),
        pageSize,
      },
      sorting,
      rowSelection,
      columnVisibility,
      columnFilters: internalFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (updater) => {
      const nextPagination =
        typeof updater === 'function'
          ? updater({ pageIndex: Math.max(0, page - 1), pageSize })
          : updater
      if (nextPagination.pageIndex !== page - 1) {
        onPageChange(nextPagination.pageIndex + 1)
      }
      if (nextPagination.pageSize !== pageSize) {
        onPageSizeChange(nextPagination.pageSize)
      }
    },
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
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
            {isLoading ? (
              Array.from({ length: Math.min(pageSize, 8) }).map((_, idx) => (
                <TableRow key={`skeleton-row-${idx}`} className='hover:bg-transparent'>
                  {columns.map((_, colIdx) => (
                    <TableCell key={`skeleton-cell-${colIdx}`} className='py-3'>
                      <Skeleton className='h-4 w-full max-w-[120px]' />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
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
