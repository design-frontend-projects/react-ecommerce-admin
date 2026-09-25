import { useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type PaginationState,
} from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTablePagination } from '@/components/data-table'
import type { MovementRow } from '../data/schema'
import { getMovementColumns } from './inventory-movements-columns'

export interface InventoryMovementsTableProps {
  movements: MovementRow[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  isLoading?: boolean
  onPageChange: (newPage: number) => void
  onPageSizeChange: (newPageSize: number) => void
  onRowClick?: (movement: MovementRow) => void
}

export function InventoryMovementsTable({
  movements,
  totalCount,
  page,
  pageSize,
  totalPages,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  onRowClick,
}: InventoryMovementsTableProps) {
  const { t } = useTranslation()

  const columns = useMemo(
    () =>
      getMovementColumns({
        onInspect: onRowClick,
        t,
      }),
    [onRowClick, t]
  )

  const pagination: PaginationState = useMemo(
    () => ({
      pageIndex: Math.max(0, page - 1),
      pageSize,
    }),
    [page, pageSize]
  )

  const table = useReactTable({
    data: movements,
    columns,
    pageCount: totalPages,
    state: {
      pagination,
    },
    manualPagination: true,
    onPaginationChange: (updater) => {
      const nextState =
        typeof updater === 'function' ? updater(pagination) : updater
      if (nextState.pageIndex !== pagination.pageIndex) {
        onPageChange(nextState.pageIndex + 1)
      }
      if (nextState.pageSize !== pagination.pageSize) {
        onPageSizeChange(nextState.pageSize)
      }
    },
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className='flex flex-col gap-4'>
      <div className='rounded-md border bg-card shadow-xs overflow-hidden'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader className='bg-muted/40'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className='whitespace-nowrap font-semibold text-xs tracking-wider uppercase py-3'
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
                  <TableRow key={`skeleton-row-${idx}`}>
                    <TableCell>
                      <Skeleton className='h-5 w-24' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-5 w-20 rounded-full' />
                    </TableCell>
                    <TableCell>
                      <div className='flex flex-col gap-1'>
                        <Skeleton className='h-4 w-28' />
                        <Skeleton className='h-3 w-36' />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-24' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-12 ms-auto' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-12 ms-auto' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-14 ms-auto' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-20' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-6 w-6 ms-auto rounded-md' />
                    </TableCell>
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className='cursor-pointer transition-colors hover:bg-muted/50'
                    onClick={() => onRowClick?.(row.original)}
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
                    className='h-32 text-center text-muted-foreground'
                  >
                    <div className='flex flex-col items-center justify-center gap-1'>
                      <p className='font-medium text-sm text-foreground'>
                        {t('inventoryMovements.empty.noMovements', 'No movements found.')}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {t(
                          'inventoryMovements.empty.adjustFilters',
                          'Try adjusting your search criteria or resetting filters.'
                        )}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className='flex flex-col sm:flex-row items-center justify-between gap-2 px-1'>
        <div className='text-xs text-muted-foreground'>
          {t('common.totalCount', {
            count: totalCount,
            defaultValue: `Total: ${totalCount.toLocaleString()} movements`,
          })}
        </div>
        <DataTablePagination table={table} />
      </div>
    </div>
  )
}
