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
import {
  Warehouse,
  Plus,
  Download,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'
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
import type { WarehouseListItem } from '../data/schema'
import { getColumns } from './columns'
import { useWarehousesContext } from './provider'

export function WarehousesTable({ data }: { data: WarehouseListItem[] }) {
  const { t } = useTranslation()
  const { openDetail, openLocations, openCreate, filterStatus } =
    useWarehousesContext()

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'code', desc: false },
  ])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  // Synchronize KPI card filter clicks with table columnFilters
  useEffect(() => {
    if (!filterStatus || filterStatus === 'all') {
      setColumnFilters((prev) => prev.filter((f) => f.id !== 'status'))
    } else if (filterStatus === 'active') {
      setColumnFilters((prev) => [
        ...prev.filter((f) => f.id !== 'status'),
        { id: 'status', value: ['active'] },
      ])
    } else if (filterStatus === 'inactive') {
      setColumnFilters((prev) => [
        ...prev.filter((f) => f.id !== 'status'),
        { id: 'status', value: ['inactive'] },
      ])
    }
  }, [filterStatus])

  const columns = useMemo(
    () =>
      getColumns(t, {
        onOpenLocations: (warehouse) => {
          openLocations(warehouse)
        },
        onOpenDetail: (warehouse) => {
          openDetail(warehouse)
        },
      }),
    [t, openLocations, openDetail]
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
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

  // Export current filtered rows to CSV
  const handleExportCsv = () => {
    const rows = table.getFilteredRowModel().rows
    const headers = [
      'Code',
      'Name',
      'Country',
      'City',
      'Branch',
      'Store',
      'Locations',
      'Stock Items',
      'Policy',
      'Status',
    ]

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => {
        const item = r.original
        return [
          `"${item.code}"`,
          `"${item.name.replace(/"/g, '""')}"`,
          `"${item.countries?.name ?? ''}"`,
          `"${item.cities?.name ?? ''}"`,
          `"${item.branches?.name ?? ''}"`,
          `"${item.stores?.name ?? ''}"`,
          item._count?.warehouse_locations ?? 0,
          item._count?.stock_balances ?? 0,
          item.allow_negative_stock ? 'Allow Negative' : 'Strict Stock',
          item.is_active ? 'Active' : 'Inactive',
        ].join(',')
      }),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `warehouses-export-${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const tableFilters = useMemo(
    () => [
      {
        columnId: 'status',
        title: t('warehouses.columns.status', 'Status'),
        options: [
          {
            label: t('warehouses.columns.active', 'Active'),
            value: 'active',
            icon: CheckCircle2,
          },
          {
            label: t('warehouses.columns.inactive', 'Inactive'),
            value: 'inactive',
            icon: XCircle,
          },
        ],
      },
      {
        columnId: 'policy',
        title: t('warehouses.columns.policy', 'Stock Policy'),
        options: [
          {
            label: t('warehouses.columns.strictStock', 'Strict Stock'),
            value: 'strict',
            icon: ShieldCheck,
          },
          {
            label: t('warehouses.columns.allowNegative', 'Allow Negative'),
            value: 'allow_negative',
            icon: ShieldAlert,
          },
        ],
      },
    ],
    [t]
  )

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex-1'>
          <DataTableToolbar
            table={table}
            searchPlaceholder={t(
              'warehouses.table.filterPlaceholder',
              'Filter warehouses by name...'
            )}
            searchKey='name'
            filters={tableFilters}
          />
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={handleExportCsv}
          className='h-8 gap-1.5 text-xs'
        >
          <Download className='h-3.5 w-3.5' />
          {t('warehouses.exportCsv', 'Export CSV')}
        </Button>
      </div>

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
                  onClick={() => openDetail(row.original)}
                  className='hover:bg-muted/50 cursor-pointer transition-colors'
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
                  className='h-48 text-center'
                >
                  <div className='flex flex-col items-center justify-center gap-2'>
                    <div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted'>
                      <Warehouse className='h-6 w-6 text-muted-foreground' />
                    </div>
                    <p className='font-medium text-sm text-foreground'>
                      {t('warehouses.table.noResults', 'No warehouses found.')}
                    </p>
                    <p className='text-xs text-muted-foreground max-w-sm'>
                      {t(
                        'warehouses.description',
                        'Physical storage facilities and their zone → rack → shelf → bin locations.'
                      )}
                    </p>
                    <Button
                      size='sm'
                      variant='outline'
                      className='mt-2'
                      onClick={openCreate}
                    >
                      <Plus className='me-1 h-4 w-4' />
                      {t('warehouses.createWarehouse', 'Create Warehouse')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  )
}

