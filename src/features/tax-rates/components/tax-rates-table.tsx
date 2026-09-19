import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
import {
  Percent,
  CheckCircle2,
  XCircle,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/pagination'
import { DataTableViewOptions } from '@/components/data-table/view-options'
import type { TaxRate } from '../types'
import { getTaxRateColumns } from './tax-rates-columns'
import { useBulkToggleTaxRates } from '../hooks/use-tax-rates'
import { useTaxContext } from './tax-rates-provider'

interface TaxTableProps {
  data: TaxRate[]
}

export function TaxTable({ data }: TaxTableProps) {
  const { t } = useTranslation()
  const { setSelectedRows, setOpen } = useTaxContext()
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'rate', desc: false },
  ])

  const bulkToggleMutation = useBulkToggleTaxRates()
  const tableColumns = useMemo(() => getTaxRateColumns(t), [t])

  const table = useReactTable({
    data,
    columns: tableColumns,
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
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  // Selected rows derived directly from table state
  const selectedRowsList = table
    .getFilteredSelectedRowModel()
    .rows.map((r) => r.original)

  const handleBulkStatus = async (isActive: boolean) => {
    const ids = selectedRowsList.map((r) => r.id)
    if (ids.length === 0) return
    try {
      await bulkToggleMutation.mutateAsync({ ids, isActive })
      toast.success(
        isActive
          ? t('taxRates.table.activatedSuccess', {
              count: ids.length,
              defaultValue: `Activated ${ids.length} tax rates`,
            })
          : t('taxRates.table.deactivatedSuccess', {
              count: ids.length,
              defaultValue: `Deactivated ${ids.length} tax rates`,
            })
      )
      table.resetRowSelection()
    } catch {
      toast.error(
        t('taxRates.table.updateStatusError', {
          defaultValue: 'Failed to update status for selected rates',
        })
      )
    }
  }

  const handleOpenBulkDelete = () => {
    setSelectedRows(selectedRowsList)
    setOpen('bulk-delete')
  }

  const selectedCount = selectedRowsList.length

  return (
    <div className='space-y-4'>
      {/* Table Toolbar & View Options */}
      <div className='flex items-center justify-between'>
        {selectedCount > 0 ? (
          <div className='flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-lg border border-border/80 text-xs animate-in fade-in-50 duration-200'>
            <span className='font-semibold text-foreground'>
              {t('taxRates.table.selectedCount', {
                count: selectedCount,
                defaultValue: `${selectedCount} selected`,
              })}
            </span>
            <div className='h-4 w-[1px] bg-border mx-1' />
            <Button
              variant='outline'
              size='sm'
              className='h-7 text-xs gap-1'
              onClick={() => handleBulkStatus(true)}
              disabled={bulkToggleMutation.isPending}
            >
              <CheckCircle2 className='h-3.5 w-3.5 text-emerald-600' />
              {t('taxRates.actions.activate', { defaultValue: 'Activate' })}
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='h-7 text-xs gap-1'
              onClick={() => handleBulkStatus(false)}
              disabled={bulkToggleMutation.isPending}
            >
              <XCircle className='h-3.5 w-3.5 text-amber-600' />
              {t('taxRates.actions.deactivate', { defaultValue: 'Deactivate' })}
            </Button>
            <Button
              variant='destructive'
              size='sm'
              className='h-7 text-xs gap-1'
              onClick={handleOpenBulkDelete}
            >
              <Trash2 className='h-3.5 w-3.5' />
              {t('taxRates.actions.delete', { defaultValue: 'Delete' })}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              className='h-7 text-xs px-2'
              onClick={() => table.resetRowSelection()}
            >
              <X className='h-3.5 w-3.5 mr-1' />
              {t('taxRates.table.clearSelection', { defaultValue: 'Clear' })}
            </Button>
          </div>
        ) : (
          <div className='text-xs text-muted-foreground'>
            {t('taxRates.table.totalConfigured', {
              count: data.length,
              defaultValue: `Total ${data.length} rates configured`,
            })}
          </div>
        )}

        <DataTableViewOptions table={table} />
      </div>

      {/* Main Table */}
      <div className='rounded-xl border bg-card shadow-2xs overflow-hidden'>
        <Table>
          <TableHeader className='bg-muted/40'>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
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
                  colSpan={tableColumns.length}
                  className='h-48 text-center'
                >
                  <div className='flex flex-col items-center justify-center gap-2 text-muted-foreground'>
                    <div className='h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground/60'>
                      <Percent className='h-6 w-6' />
                    </div>
                    <p className='text-sm font-semibold text-foreground'>
                      {t('taxRates.table.noResults', {
                        defaultValue: 'No tax rates found',
                      })}
                    </p>
                    <p className='text-xs max-w-sm text-muted-foreground'>
                      {t('taxRates.table.noResultsDesc', {
                        defaultValue:
                          'Try adjusting your search criteria or create a new tax rate using the quick presets above.',
                      })}
                    </p>
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
