import { useTranslation } from 'react-i18next'
import { useState, useMemo, useEffect } from 'react'
import {
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
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
import { Download, Plus, CheckCircle2, AlertTriangle, XCircle, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

interface Props {
  data: Inventory[]
}

export function InventoryTable({ data }: Props) {
  const { t } = useTranslation()
  const { openDetail, openCreate, filterStatus } = useInventoryContext()

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'product_name', desc: false },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  // Synchronize KPI card clicks with table column filter
  useEffect(() => {
    if (!filterStatus || filterStatus === 'all') {
      setColumnFilters((prev) => prev.filter((f) => f.id !== 'status'))
    } else {
      setColumnFilters((prev) => [
        ...prev.filter((f) => f.id !== 'status'),
        { id: 'status', value: [filterStatus] },
      ])
    }
  }, [filterStatus])

  const columns = useMemo(
    () =>
      getColumns(t, {
        onOpenDetail: (item) => openDetail(item),
      }),
    [t, openDetail]
  )

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

  // Export current rows to CSV
  const handleExportCsv = () => {
    const rows = table.getFilteredRowModel().rows
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
  }, [data])

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
            {table.getRowModel().rows?.length ? (
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
