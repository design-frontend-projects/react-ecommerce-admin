import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type SortingState,
  type VisibilityState,
  type Updater,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, X, Building2, CheckCircle2, RotateCcw } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTablePagination } from '@/components/data-table/pagination'
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options'
import { useStoreOptions } from '@/hooks/use-inventory-lookups'
import type { ReorderRulesSortBy, RuleListItem } from '../data/schema'
import { getColumns } from './columns'

const ALL = '__all__'

export interface ReorderRulesTableProps {
  data: RuleListItem[]
  total?: number
  page?: number
  pageSize?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  search?: string
  onSearchChange?: (search: string) => void
  storeId?: string
  onStoreChange?: (storeId: string | undefined) => void
  isActive?: boolean | undefined
  onIsActiveChange?: (isActive: boolean | undefined) => void
  sortBy?: ReorderRulesSortBy
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (sortBy?: ReorderRulesSortBy, sortOrder?: 'asc' | 'desc') => void
  isLoading?: boolean
}

export function ReorderRulesTable({
  data,
  total = data.length,
  page = 1,
  pageSize = 20,
  totalPages = Math.ceil(total / pageSize) || 1,
  onPageChange,
  onPageSizeChange,
  search = '',
  onSearchChange,
  storeId,
  onStoreChange,
  isActive,
  onIsActiveChange,
  sortBy = 'created_at',
  sortOrder = 'desc',
  onSortChange,
  isLoading = false,
}: ReorderRulesTableProps) {
  const { t } = useTranslation()
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [searchInput, setSearchInput] = useState(search)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  const { data: stores = [] } = useStoreOptions()

  // Keep local search input synchronized if prop changes from outside
  useEffect(() => {
    setSearchInput(search)
  }, [search])

  const handleSearchInputChange = (val: string) => {
    setSearchInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onSearchChange?.(val)
    }, 300)
  }

  const handleResetFilters = () => {
    setSearchInput('')
    onSearchChange?.('')
    onStoreChange?.(undefined)
    onIsActiveChange?.(undefined)
    onSortChange?.('created_at', 'desc')
  }

  const isFiltered = Boolean(
    searchInput || storeId || isActive !== undefined || sortBy !== 'created_at'
  )

  const [sorting, setSorting] = useState<SortingState>(() => [
    { id: sortBy, desc: sortOrder === 'desc' },
  ])

  useEffect(() => {
    setSorting([{ id: sortBy, desc: sortOrder === 'desc' }])
  }, [sortBy, sortOrder])

  const handleSortingChange = (updater: Updater<SortingState>) => {
    const nextSorting = typeof updater === 'function' ? updater(sorting) : updater
    setSorting(nextSorting)
    if (nextSorting && nextSorting.length > 0) {
      onSortChange?.(
        nextSorting[0].id as ReorderRulesSortBy,
        nextSorting[0].desc ? 'desc' : 'asc'
      )
    } else {
      onSortChange?.('created_at', 'desc')
    }
  }

  const columns = useMemo(() => getColumns(t), [t])

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
      columnVisibility,
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: Math.max(0, page - 1), pageSize })
          : updater
      if (next.pageIndex !== page - 1 && onPageChange) {
        onPageChange(next.pageIndex + 1)
      }
      if (next.pageSize !== pageSize && onPageSizeChange) {
        onPageSizeChange(next.pageSize)
      }
    },
    onSortingChange: handleSortingChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  })

  const rows = table.getRowModel().rows

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 8,
    initialRect: { width: 1000, height: 600 },
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start ?? 0 : 0
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0

  return (
    <div className='flex flex-1 flex-col gap-4'>
      {/* Faceted Filter Toolbar */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-1 flex-wrap items-center gap-2'>
          {/* Search Input */}
          <div className='relative w-full sm:w-64 lg:w-72'>
            <Search className='absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder={t(
                'reorderRules.table.searchPlaceholder',
                'Search SKU, product, store...'
              )}
              value={searchInput}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              className='ps-9 pe-8'
            />
            {searchInput ? (
              <button
                type='button'
                onClick={() => handleSearchInputChange('')}
                className='absolute end-2.5 top-2.5 text-muted-foreground hover:text-foreground'
                aria-label={t('common.clear', 'Clear')}
              >
                <X className='h-4 w-4' />
              </button>
            ) : null}
          </div>

          {/* Store Filter */}
          <div className='w-full sm:w-48'>
            <Select
              value={storeId ?? ALL}
              onValueChange={(val) => onStoreChange?.(val === ALL ? undefined : val)}
            >
              <SelectTrigger className='h-9'>
                <Building2 className='me-2 h-4 w-4 text-muted-foreground' />
                <SelectValue
                  placeholder={t('reorderRules.filters.allStores', 'All Stores')}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>
                  {t('reorderRules.filters.allStores', 'All Stores')}
                </SelectItem>
                {stores.map((s) => (
                  <SelectItem key={s.store_id} value={s.store_id}>
                    {s.name ?? s.store_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className='w-full sm:w-36'>
            <Select
              value={
                isActive === true
                  ? 'true'
                  : isActive === false
                    ? 'false'
                    : ALL
              }
              onValueChange={(val) =>
                onIsActiveChange?.(
                  val === 'true' ? true : val === 'false' ? false : undefined
                )
              }
            >
              <SelectTrigger className='h-9'>
                <CheckCircle2 className='me-2 h-4 w-4 text-muted-foreground' />
                <SelectValue
                  placeholder={t('reorderRules.filters.allStatuses', 'All Statuses')}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>
                  {t('reorderRules.filters.allStatuses', 'All Statuses')}
                </SelectItem>
                <SelectItem value='true'>
                  {t('reorderRules.columns.active', 'Active')}
                </SelectItem>
                <SelectItem value='false'>
                  {t('reorderRules.columns.inactive', 'Inactive')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters */}
          {isFiltered ? (
            <Button
              variant='ghost'
              size='sm'
              onClick={handleResetFilters}
              className='h-9 px-2.5 text-muted-foreground hover:text-foreground'
            >
              <RotateCcw className='me-1.5 h-3.5 w-3.5' />
              {t('common.reset', 'Reset')}
            </Button>
          ) : null}
        </div>

        <DataTableViewOptions table={table} />
      </div>

      {/* Virtualized Table Viewport */}
      <div
        ref={parentRef}
        className='max-h-[620px] overflow-auto rounded-lg border bg-card shadow-2xs'
      >
        <Table>
          <TableHeader className='sticky top-0 z-10 bg-muted/90 backdrop-blur-xs'>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className='whitespace-nowrap font-semibold'>
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
                  {columns.map((_, colIdx) => (
                    <TableCell key={`skeleton-cell-${colIdx}`} className='py-3'>
                      <Skeleton className='h-5 w-full max-w-[120px]' />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length > 0 ? (
              <>
                {paddingTop > 0 && (
                  <tr>
                    <td colSpan={columns.length} style={{ height: `${paddingTop}px` }} />
                  </tr>
                )}
                {virtualRows.map((virtualRow) => {
                  const row = rows[virtualRow.index]
                  return (
                    <TableRow
                      key={row.id}
                      data-index={virtualRow.index}
                      className='transition-colors hover:bg-muted/40'
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
                  )
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      style={{ height: `${paddingBottom}px` }}
                    />
                  </tr>
                )}
              </>
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-36 text-center text-muted-foreground'
                >
                  <div className='flex flex-col items-center justify-center gap-2'>
                    <p className='text-sm font-medium'>
                      {t('reorderRules.table.noRules', 'No reorder rules found.')}
                    </p>
                    {isFiltered ? (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={handleResetFilters}
                      >
                        {t('reorderRules.table.clearFilters', 'Clear active filters')}
                      </Button>
                    ) : null}
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
