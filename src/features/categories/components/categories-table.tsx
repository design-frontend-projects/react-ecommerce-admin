import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type SortingState,
  type VisibilityState,
  type ColumnFiltersState,
  type FilterFn,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { FolderTree, Layers, Search, X } from 'lucide-react'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTablePagination } from '@/components/data-table/data-table-pagination'
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options'
import { type Category } from '../hooks/use-categories'
import { getColumns } from './categories-columns'

interface CategoriesTableProps {
  data: Category[]
}

type HierarchyFilter = 'all' | 'root' | 'sub'

export function CategoriesTable({ data }: CategoriesTableProps) {
  const { t } = useTranslation()
  const columns = useMemo(() => getColumns(t), [t])
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [hierarchyFilter, setHierarchyFilter] = useState<HierarchyFilter>('all')

  // Calculate statistics for header chips
  const totalCount = data.length
  const rootCount = useMemo(() => data.filter((c) => !c.parent_id).length, [data])
  const subCount = useMemo(() => data.filter((c) => !!c.parent_id).length, [data])

  // Filter data by hierarchy tab
  const filteredByLevel = useMemo(() => {
    if (hierarchyFilter === 'root') {
      return data.filter((c) => !c.parent_id)
    }
    if (hierarchyFilter === 'sub') {
      return data.filter((c) => !!c.parent_id)
    }
    return data
  }, [data, hierarchyFilter])

  // Custom global search matching English name, Arabic name, parent name, and description
  const globalFilterFn: FilterFn<Category> = (row, _columnId, filterValue) => {
    const search = String(filterValue || '').toLowerCase().trim()
    if (!search) return true

    const name = (row.original.name || '').toLowerCase()
    const nameAr = (row.original.name_ar || '').toLowerCase()
    const parentName = (row.original.parent?.name || '').toLowerCase()
    const parentNameAr = (row.original.parent?.name_ar || '').toLowerCase()
    const desc = (row.original.description || '').toLowerCase()

    return (
      name.includes(search) ||
      nameAr.includes(search) ||
      parentName.includes(search) ||
      parentNameAr.includes(search) ||
      desc.includes(search)
    )
  }

  const table = useReactTable({
    data: filteredByLevel,
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      columnFilters,
      globalFilter,
    },
    globalFilterFn,
    onGlobalFilterChange: setGlobalFilter,
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
      {/* Top Controls: Hierarchy Tabs + Search + View Options */}
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-2 w-full sm:w-auto'>
          <Tabs
            value={hierarchyFilter}
            onValueChange={(val) => setHierarchyFilter(val as HierarchyFilter)}
            className='w-full sm:w-auto'
          >
            <TabsList className='grid grid-cols-3 h-9'>
              <TabsTrigger value='all' className='text-xs flex items-center gap-1.5 px-3'>
                <Layers className='h-3.5 w-3.5' />
                <span>{t('categories.filter.all', { defaultValue: 'All' })}</span>
                <span className='ml-1 rounded-full bg-muted-foreground/20 px-1.5 py-0.2 text-[10px] font-semibold'>
                  {totalCount}
                </span>
              </TabsTrigger>
              <TabsTrigger value='root' className='text-xs flex items-center gap-1.5 px-3'>
                <span>{t('categories.filter.rootOnly', { defaultValue: 'Departments' })}</span>
                <span className='ml-1 rounded-full bg-muted-foreground/20 px-1.5 py-0.2 text-[10px] font-semibold'>
                  {rootCount}
                </span>
              </TabsTrigger>
              <TabsTrigger value='sub' className='text-xs flex items-center gap-1.5 px-3'>
                <FolderTree className='h-3.5 w-3.5' />
                <span>{t('categories.filter.subOnly', { defaultValue: 'Subcategories' })}</span>
                <span className='ml-1 rounded-full bg-muted-foreground/20 px-1.5 py-0.2 text-[10px] font-semibold'>
                  {subCount}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Dual-language search input */}
          <div className='relative flex-1 sm:w-[260px]'>
            <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder={t('categories.table.filterPlaceholder', {
                defaultValue: 'Search English or Arabic names...',
              })}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className='pl-8 pr-8 h-9 text-xs'
            />
            {globalFilter && (
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setGlobalFilter('')}
                className='absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-foreground'
              >
                <X className='h-3.5 w-3.5' />
              </Button>
            )}
          </div>
        </div>

        <div className='flex items-center gap-2 self-end sm:self-auto'>
          <DataTableViewOptions table={table} />
        </div>
      </div>

      {/* Table Container */}
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
                  {t('categories.table.noResults', {
                    defaultValue: 'No categories found matching your filter.',
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
