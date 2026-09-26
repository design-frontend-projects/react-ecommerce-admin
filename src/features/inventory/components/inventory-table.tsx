import { useTranslation } from 'react-i18next'
import { useState, useMemo, useEffect, useRef } from 'react'
import {
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  type ColumnFiltersState,
  type PaginationState,
  type Updater,
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
  Download,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { Can } from '@/components/rbac/Can'
import { type Inventory } from '../data/schema'
import { getColumns } from './inventory-columns'
import { useInventoryContext } from './inventory-provider'
import { useWarehouses } from '../hooks/use-inventory'

export interface InventoryTableProps {
  data: Inventory[]
  totalCount?: number
  totalPages?: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  search?: string
  onSearchChange?: (search: string) => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (sortBy?: string, sortOrder?: 'asc' | 'desc') => void
  status?: string
  onStatusChange?: (status?: string) => void
  trackingType?: string
  onTrackingTypeChange?: (tracking?: string) => void
  warehouse?: string
  onWarehouseChange?: (warehouse?: string) => void
  isLoading?: boolean
  isServer?: boolean
}

export function InventoryTable({
  data,
  totalCount,
  totalPages,
  page = 1,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  search = '',
  onSearchChange,
  sortBy = 'created_at',
  sortOrder = 'desc',
  onSortChange,
  status,
  onStatusChange,
  trackingType,
  onTrackingTypeChange,
  warehouse,
  onWarehouseChange,
  isLoading = false,
  isServer = true,
}: InventoryTableProps) {
  const { t } = useTranslation()
  const { openDetail, openCreate, filterStatus } = useInventoryContext()
  const { data: allWarehouses = [] } = useWarehouses()

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>(() => [
    { id: sortBy || 'created_at', desc: sortOrder === 'desc' },
  ])

  // Initialize internal column filters
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
    const init: ColumnFiltersState = []
    if (search) init.push({ id: 'product_name', value: search })
    const activeStat = status || (filterStatus && filterStatus !== 'all' ? filterStatus : undefined)
    if (activeStat) init.push({ id: 'status', value: [activeStat] })
    if (trackingType) init.push({ id: 'tracking_type', value: [trackingType] })
    if (warehouse) init.push({ id: 'warehouse', value: [warehouse] })
    return init
  })

  // Synchronize KPI card clicks and external status prop
  useEffect(() => {
    const effStatus = status !== undefined ? status : filterStatus
    setColumnFilters((prev) => {
      const next = prev.filter((f) => f.id !== 'status')
      if (effStatus && effStatus !== 'all') {
        next.push({ id: 'status', value: [effStatus] })
      }
      return next
    })
  }, [filterStatus, status])

  // Synchronize external search prop
  useEffect(() => {
    setColumnFilters((prev) => {
      const next = prev.filter((f) => f.id !== 'product_name')
      if (search) {
        next.push({ id: 'product_name', value: search })
      }
      return next
    })
  }, [search])

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  const handleColumnFiltersChange = (updater: Updater<ColumnFiltersState>) => {
    const nextFilters =
      typeof updater === 'function' ? updater(columnFilters) : updater
    setColumnFilters(nextFilters)

    if (isServer) {
      // 1. Search filter with 300ms debounce
      const searchVal =
        (nextFilters.find((f) => f.id === 'product_name')?.value as string) ?? ''
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = setTimeout(() => {
        onSearchChange?.(searchVal)
      }, 300)

      // 2. Status filter
      const statVals = nextFilters.find((f) => f.id === 'status')?.value as
        | string[]
        | undefined
      const selectedStat = statVals && statVals.length > 0 ? statVals[0] : undefined
      onStatusChange?.(selectedStat)

      // 3. Tracking type filter
      const trackVals = nextFilters.find((f) => f.id === 'tracking_type')?.value as
        | string[]
        | undefined
      const selectedTrack =
        trackVals && trackVals.length > 0 ? trackVals[0] : undefined
      onTrackingTypeChange?.(selectedTrack)

      // 4. Warehouse filter
      const whVals = nextFilters.find((f) => f.id === 'warehouse')?.value as
        | string[]
        | undefined
      const selectedWh = whVals && whVals.length > 0 ? whVals[0] : undefined
      onWarehouseChange?.(selectedWh)
    }
  }

  const handleSortingChange = (updater: Updater<SortingState>) => {
    const nextSorting = typeof updater === 'function' ? updater(sorting) : updater
    setSorting(nextSorting)
    if (isServer && onSortChange) {
      if (nextSorting && nextSorting.length > 0) {
        onSortChange(nextSorting[0].id, nextSorting[0].desc ? 'desc' : 'asc')
      } else {
        onSortChange(undefined, undefined)
      }
    }
  }

  const columns = useMemo(
    () =>
      getColumns(t, {
        onOpenDetail: (item) => openDetail(item),
      }),
    [t, openDetail]
  )

  const pageIndex = Math.max(0, page - 1)

  const handlePaginationChange = (updater: Updater<PaginationState>) => {
    const nextPagination =
      typeof updater === 'function'
        ? updater({ pageIndex, pageSize })
        : updater
    if (nextPagination.pageIndex !== pageIndex && onPageChange) {
      onPageChange(nextPagination.pageIndex + 1)
    }
    if (nextPagination.pageSize !== pageSize && onPageSizeChange) {
      onPageSizeChange(nextPagination.pageSize)
    }
  }

  const calculatedPageCount =
    totalPages ?? Math.max(1, Math.ceil((totalCount ?? data.length) / pageSize))

  const table = useReactTable({
    data,
    columns,
    pageCount: isServer ? calculatedPageCount : undefined,
    manualPagination: isServer,
    manualSorting: isServer,
    manualFiltering: isServer,
    state: {
      pagination: isServer
        ? {
            pageIndex,
            pageSize,
          }
        : undefined,
      sorting,
      rowSelection,
      columnVisibility,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onPaginationChange: isServer ? handlePaginationChange : undefined,
    onColumnVisibilityChange: setColumnVisibility,
    getPaginationRowModel: getPaginationRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: isServer ? undefined : getFilteredRowModel(),
    getSortedRowModel: isServer ? undefined : getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  // Export current rows to CSV
  const handleExportCsv = () => {
    const rows = table.getRowModel().rows
    const headers = [
      'Inventory ID',
      'Product Name',
      'Product SKU',
      'Variant SKU',
      'Warehouse Code',
      'Warehouse Name',
      'Location Code',
      'Location Path',
      'Store Name',
      'On Hand Qty',
      'Available Qty',
      'Reserved Qty',
      'Condition',
      'Reorder Point',
      'Max Stock',
      'Unit Avg Cost',
      'Total Value',
      'Last Count Date',
    ]

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => {
        const item = r.original
        const qty = Number(item.qty_on_hand ?? item.quantity ?? 0)
        const avail = Number(item.qty_available ?? qty)
        const rsvd = Number(item.qty_reserved ?? 0)
        const cost = Number(item.avg_cost ?? 0)
        const total = qty * cost

        return [
          item.id || item.inventory_id,
          `"${(item.products?.name ?? '').replace(/"/g, '""')}"`,
          `"${item.products?.sku ?? ''}"`,
          `"${item.product_variants?.sku ?? ''}"`,
          `"${item.warehouses?.code ?? ''}"`,
          `"${(item.warehouses?.name ?? '').replace(/"/g, '""')}"`,
          `"${item.warehouse_locations?.code ?? ''}"`,
          `"${item.warehouse_locations?.path ?? ''}"`,
          `"${(item.stores?.name ?? '').replace(/"/g, '""')}"`,
          qty,
          avail,
          rsvd,
          `"${item.condition || 'good'}"`,
          item.reorder_point ?? item.min_quantity ?? 0,
          item.max_quantity ?? '',
          cost.toFixed(2),
          total.toFixed(2),
          item.last_count_date ? item.last_count_date.slice(0, 10) : '',
        ].join(',')
      }),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Unique facet filter options for status
  const statusFilterOptions = [
    {
      label: t('inventory.status.inStock', 'In Stock'),
      value: 'in_stock',
      icon: CheckCircle2,
    },
    {
      label: t('inventory.status.lowStock', 'Low Stock'),
      value: 'low_stock',
      icon: AlertTriangle,
    },
    {
      label: t('inventory.status.outOfStock', 'Out of Stock'),
      value: 'out_of_stock',
      icon: XCircle,
    },
    {
      label: t('inventory.status.overstocked', 'Overstocked'),
      value: 'overstocked',
      icon: Package,
    },
  ]

  // Unique facet filter options for warehouses
  const warehouseFilterOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const wh of allWarehouses) {
      if (wh.name) map.set(wh.name, wh.name)
    }
    for (const item of data) {
      const name = item.warehouses?.name || item.warehouses?.code
      if (name) {
        map.set(name, name)
      }
    }
    return Array.from(map.values()).map((name) => ({
      label: name,
      value: name,
    }))
  }, [allWarehouses, data])

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <DataTableToolbar
          table={table}
          searchPlaceholder={t(
            'inventory.table.filterPlaceholder',
            'Search product name, SKU, variant...'
          )}
          searchKey='product_name'
          filters={[
            {
              columnId: 'status',
              title: t('inventory.columns.status', 'Status'),
              options: statusFilterOptions,
            },
            {
              columnId: 'tracking_type',
              title: t('inventory.columns.tracking', 'Tracking'),
              options: [
                { label: 'Standard', value: 'NONE' },
                { label: 'Lot / Batch', value: 'LOT' },
                { label: 'Serial #', value: 'SERIAL' },
                { label: 'Lot & Serial', value: 'LOT_AND_SERIAL' },
              ],
            },
            ...(warehouseFilterOptions.length > 0
              ? [
                  {
                    columnId: 'warehouse',
                    title: t('inventory.columns.warehouse', 'Warehouse'),
                    options: warehouseFilterOptions,
                  },
                ]
              : []),
          ]}
        />

        <div className='flex items-center gap-2 ms-auto'>
          {isLoading && data.length > 0 && (
            <div className='flex items-center gap-1.5 text-xs text-muted-foreground me-2'>
              <Loader2 className='h-3.5 w-3.5 animate-spin text-primary' />
              <span>{t('common.updating', 'Updating...')}</span>
            </div>
          )}

          <Button
            variant='outline'
            size='sm'
            onClick={handleExportCsv}
            className='gap-1.5 h-9 text-xs'
          >
            <Download className='h-3.5 w-3.5' />
            {t('common.exportCsv', 'Export CSV')}
          </Button>

          <Can permission='inventory.manage'>
            <Button
              size='sm'
              onClick={openCreate}
              className='gap-1.5 h-9 text-xs shadow-xs'
            >
              <Plus className='h-3.5 w-3.5' />
              {t('inventory.addInventory', 'Assign Product')}
            </Button>
          </Can>
        </div>
      </div>

      <div className='overflow-hidden rounded-xl border bg-card shadow-2xs'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='bg-muted/40 hover:bg-muted/40'>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className='py-3 font-semibold text-xs text-foreground'>
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
            {isLoading && data.length === 0 ? (
              Array.from({ length: 6 }).map((_, rIdx) => (
                <TableRow key={`skeleton-row-${rIdx}`} className='hover:bg-transparent'>
                  {columns.map((_, cIdx) => (
                    <TableCell key={`skeleton-cell-${rIdx}-${cIdx}`} className='py-3.5'>
                      <Skeleton className='h-5 w-full max-w-[140px]' />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className='hover:bg-muted/30 transition-colors'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className='py-3'>
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
                  className='h-32 text-center text-muted-foreground text-sm'
                >
                  <div className='flex flex-col items-center justify-center gap-2'>
                    <Package className='h-8 w-8 text-muted-foreground/50' />
                    <span>
                      {t('inventory.table.noResults', 'No inventory records found.')}
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
