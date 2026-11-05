import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
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
import { Plus, Truck } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { Can } from '@/components/rbac/Can'
import { type Supplier } from '../hooks/use-suppliers'
import { getColumns } from './suppliers-columns'
import { useSuppliersContext } from './suppliers-provider'

interface SuppliersTableProps {
  data: Supplier[]
}

export function SuppliersTable({ data }: SuppliersTableProps) {
  const { t } = useTranslation()
  const { setOpen } = useSuppliersContext()
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo(() => getColumns(t), [t])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getPaginationRowModel: getPaginationRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  if (data.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center bg-card'>
        <div className='flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4'>
          <Truck className='h-7 w-7 text-primary' />
        </div>
        <h3 className='text-lg font-semibold tracking-tight'>
          {t('suppliers.table.emptyTitle', {
            defaultValue: 'No Suppliers Registered',
          })}
        </h3>
        <p className='text-sm text-muted-foreground max-w-sm mt-1.5 mb-5'>
          {t('suppliers.table.emptyDesc', {
            defaultValue:
              'Add your first vendor to begin tracking purchasing orders and product supplies.',
          })}
        </p>
        <Can permission='purchasing.manage'>
          <Button onClick={() => setOpen('create')} className='gap-2'>
            <Plus className='h-4 w-4' />
            <span>
              {t('suppliers.table.addFirst', {
                defaultValue: 'Add First Supplier',
              })}
            </span>
          </Button>
        </Can>
      </div>
    )
  }

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <DataTableToolbar
        table={table}
        searchPlaceholder={t('suppliers.table.filterPlaceholder', {
          defaultValue: 'Filter suppliers by name, code, contact...',
        })}
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
                  className='h-24 text-center text-muted-foreground'
                >
                  {t('suppliers.table.noResults', {
                    defaultValue: 'No suppliers found.',
                  })}
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
