import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { useFormatters } from '@/lib/formatters'
import type { BatchListItem } from '../data/schema'
import { createBatchColumns } from './columns'
import { BatchDetailsSheet } from './batch-details-sheet'
import { BatchEditDialog } from './batch-edit-dialog'

export function BatchesTable({ data }: { data: BatchListItem[] }) {
  const { t } = useTranslation()
  const { formatCurrency, formatDate } = useFormatters()

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    manufacture_date: false,
    unit_cost: true,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'expiry_date', desc: false },
  ])

  const [selectedBatch, setSelectedBatch] = useState<BatchListItem | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const handleViewDetails = (batch: BatchListItem) => {
    setSelectedBatch(batch)
    setDetailsOpen(true)
  }

  const handleEdit = (batch: BatchListItem) => {
    setSelectedBatch(batch)
    setEditOpen(true)
  }

  const columns = useMemo(
    () =>
      createBatchColumns({
        t,
        formatCurrency,
        formatDate,
        onViewDetails: handleViewDetails,
        onEdit: handleEdit,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, formatCurrency, formatDate]
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getPaginationRowModel: getPaginationRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const statusFilterOptions = [
    { label: t('batches.status.active', 'Active'), value: 'active' },
    { label: t('batches.status.blocked', 'Blocked'), value: 'blocked' },
    { label: t('batches.status.expired', 'Expired'), value: 'expired' },
    { label: t('batches.status.depleted', 'Depleted'), value: 'depleted' },
  ]

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <DataTableToolbar
        table={table}
        searchPlaceholder={t('batches.table.filterPlaceholder', 'Filter by batch #, SKU, product, supplier...')}
        searchKey='batch_number'
        filters={[
          {
            columnId: 'status',
            title: t('batches.filters.status', 'Status'),
            options: statusFilterOptions,
          },
        ]}
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
                  className='hover:bg-muted/50 transition-colors'
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
                  className='h-32 text-center text-muted-foreground'
                >
                  {t(
                    'batches.table.noResults',
                    'No batches yet. Batches are created automatically during goods receipt or manually registered here.'
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} className='mt-auto' />

      {/* Details Slide-Over Sheet */}
      <BatchDetailsSheet
        batch={selectedBatch}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      {/* Edit Batch Dialog */}
      <BatchEditDialog
        batch={selectedBatch}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  )
}
