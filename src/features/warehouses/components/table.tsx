import { useTranslation } from 'react-i18next'
import { useState, useMemo } from 'react'
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
import { Warehouse, Plus } from 'lucide-react'
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
  const { setCurrentRow, setOpen } = useWarehousesContext()

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const columns = useMemo(
    () =>
      getColumns(t, {
        onOpenLocations: (warehouse) => {
          setCurrentRow(warehouse)
          setOpen('locations')
        },
      }),
    [t, setCurrentRow, setOpen]
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

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <DataTableToolbar
        table={table}
        searchPlaceholder={t(
          'warehouses.table.filterPlaceholder',
          'Filter warehouses by name...'
        )}
        searchKey='name'
      />
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
                  className='hover:bg-muted/50'
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
                      onClick={() => {
                        setCurrentRow(null)
                        setOpen('create')
                      }}
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
