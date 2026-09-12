import { useState, useMemo, useEffect } from 'react'
import {
  type ColumnFiltersState,
  type FilterFn,
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
import { useTranslation } from 'react-i18next'
import {
  ArrowUpDown,
  Download,
  PackageSearch,
  RotateCcw,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { type Product } from '../data/schema'
import { computeTotalStock, getColumns } from './products-columns'
import { ProductsBulkActions } from './products-bulk-actions'
import { useProductsContext } from './products-provider'

interface Props {
  data: Product[]
}

const globalFilterFn: FilterFn<Product> = (row, _columnId, filterValue) => {
  const query = String(filterValue || '').toLowerCase().trim()
  if (!query) return true

  const p = row.original
  const name = (p.name || '').toLowerCase()
  const sku = (p.sku || '').toLowerCase()
  const barcode = (p.barcode || '').toLowerCase()
  const category = (p.categories?.name || '').toLowerCase()
  const brand = (p.brands?.name || '').toLowerCase()
  const supplier = (p.suppliers?.name || '').toLowerCase()
  const pType = (p.product_type || '').toLowerCase()

  const variantMatches = (p.product_variants || []).some(
    (v) =>
      (v.sku && v.sku.toLowerCase().includes(query)) ||
      (v.barcode && v.barcode.toLowerCase().includes(query)) ||
      (v.name && v.name.toLowerCase().includes(query))
  )

  return (
    name.includes(query) ||
    sku.includes(query) ||
    barcode.includes(query) ||
    category.includes(query) ||
    brand.includes(query) ||
    supplier.includes(query) ||
    pType.includes(query) ||
    variantMatches
  )
}

export function ProductsTable({ data }: Props) {
  const { t } = useTranslation()
  const { quickFilter, setQuickFilter } = useProductsContext()

  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    base_uom: false,
    stock_status: false,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'created_at', desc: true },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columns = useMemo(() => getColumns(t), [t])

  // Sync quickFilter changes to columnFilters
  useEffect(() => {
    setColumnFilters((prev) => {
      // Remove previous quickFilter-driven filters
      const next = prev.filter(
        (f) => f.id !== 'stock_status' && f.id !== 'is_active'
      )

      if (quickFilter === 'in_stock') {
        next.push({
          id: 'stock_status',
          value: ['in_stock', 'low_stock'],
        })
      } else if (quickFilter === 'low_stock') {
        next.push({
          id: 'stock_status',
          value: ['low_stock'],
        })
      } else if (quickFilter === 'out_of_stock') {
        next.push({
          id: 'stock_status',
          value: ['out_of_stock'],
        })
      } else if (quickFilter === 'inactive') {
        next.push({
          id: 'is_active',
          value: ['false'],
        })
      }

      return next
    })
  }, [quickFilter])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      columnFilters,
      globalFilter,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    getPaginationRowModel: getPaginationRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  // Calculate quick stats counts
  const statsCounts = useMemo(() => {
    let inStock = 0
    let lowStock = 0
    let outOfStock = 0
    let inactive = 0

    for (const p of data) {
      const stock = computeTotalStock(p)
      const reorderLevel = Number(p.reorder_level) || 0

      if (stock <= 0) {
        outOfStock++
      } else {
        inStock++
        if (reorderLevel > 0 && stock <= reorderLevel) {
          lowStock++
        }
      }

      if (!p.is_active) {
        inactive++
      }
    }

    return { inStock, lowStock, outOfStock, inactive }
  }, [data])

  // Faceted filter options
  const categoryFilterOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of data) {
      const name = item.categories?.name
      if (name) map.set(name, name)
    }
    return Array.from(map.values())
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ label: name, value: name }))
  }, [data])

  const brandFilterOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of data) {
      const name = item.brands?.name
      if (name) map.set(name, name)
    }
    return Array.from(map.values())
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ label: name, value: name }))
  }, [data])

  const productTypeFilterOptions = useMemo(
    () => [
      {
        label: t('products.enums.productType.simple', { defaultValue: 'Simple' }),
        value: 'simple',
      },
      {
        label: t('products.enums.productType.variant', { defaultValue: 'Variant' }),
        value: 'variant',
      },
      {
        label: t('products.enums.productType.bundle', { defaultValue: 'Bundle' }),
        value: 'bundle',
      },
      {
        label: t('products.enums.productType.service', { defaultValue: 'Service' }),
        value: 'service',
      },
      {
        label: t('products.enums.productType.composite', {
          defaultValue: 'Composite',
        }),
        value: 'composite',
      },
    ],
    [t]
  )

  const stockStatusFilterOptions = useMemo(
    () => [
      {
        label: t('products.stockStatus.inStock', { defaultValue: 'In Stock' }),
        value: 'in_stock',
      },
      {
        label: t('products.stockStatus.lowStock', { defaultValue: 'Low Stock' }),
        value: 'low_stock',
      },
      {
        label: t('products.stockStatus.outOfStock', {
          defaultValue: 'Out of Stock',
        }),
        value: 'out_of_stock',
      },
    ],
    [t]
  )

  const statusFilterOptions = useMemo(
    () => [
      {
        label: t('common.active', { defaultValue: 'Active' }),
        value: 'true',
      },
      {
        label: t('common.inactive', { defaultValue: 'Inactive' }),
        value: 'false',
      },
    ],
    [t]
  )

  // Quick sort presets
  const sortPresets = useMemo(
    () => [
      {
        value: 'newest',
        label: t('products.sort.newest', { defaultValue: 'Newest First' }),
        sort: [{ id: 'created_at', desc: true }],
      },
      {
        value: 'oldest',
        label: t('products.sort.oldest', { defaultValue: 'Oldest First' }),
        sort: [{ id: 'created_at', desc: false }],
      },
      {
        value: 'name_asc',
        label: t('products.sort.nameAsc', { defaultValue: 'Name (A → Z)' }),
        sort: [{ id: 'name', desc: false }],
      },
      {
        value: 'name_desc',
        label: t('products.sort.nameDesc', { defaultValue: 'Name (Z → A)' }),
        sort: [{ id: 'name', desc: true }],
      },
      {
        value: 'stock_desc',
        label: t('products.sort.stockDesc', {
          defaultValue: 'Stock: High → Low',
        }),
        sort: [{ id: 'stock', desc: true }],
      },
      {
        value: 'stock_asc',
        label: t('products.sort.stockAsc', {
          defaultValue: 'Stock: Low → High',
        }),
        sort: [{ id: 'stock', desc: false }],
      },
      {
        value: 'sku_asc',
        label: t('products.sort.skuAsc', { defaultValue: 'SKU (A → Z)' }),
        sort: [{ id: 'sku', desc: false }],
      },
      {
        value: 'category_asc',
        label: t('products.sort.categoryAsc', {
          defaultValue: 'Category (A → Z)',
        }),
        sort: [{ id: 'category', desc: false }],
      },
    ],
    [t]
  )

  // Current active sort value
  const currentSortValue = useMemo(() => {
    if (!sorting.length) return 'newest'
    const match = sortPresets.find(
      (p) =>
        p.sort[0].id === sorting[0]?.id && p.sort[0].desc === sorting[0]?.desc
    )
    return match ? match.value : 'custom'
  }, [sorting, sortPresets])

  const handleSortChange = (val: string) => {
    const preset = sortPresets.find((p) => p.value === val)
    if (preset) {
      setSorting(preset.sort)
    }
  }

  // Export filtered products to CSV
  const handleExportCsv = () => {
    const filteredProducts = table
      .getFilteredRowModel()
      .rows.map((r) => r.original)
    if (!filteredProducts.length) {
      toast.error(
        t('products.table.noRowsToExport', {
          defaultValue: 'No products to export',
        })
      )
      return
    }

    const headers = [
      'ID',
      'Name',
      'SKU',
      'Barcode',
      'Category',
      'Brand',
      'Product Type',
      'Stock',
      'Reorder Level',
      'Status',
      'Created At',
    ]

    const csvRows = filteredProducts.map((p) => [
      `"${p.id || ''}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.sku || '').replace(/"/g, '""')}"`,
      `"${(p.barcode || '').replace(/"/g, '""')}"`,
      `"${(p.categories?.name || '').replace(/"/g, '""')}"`,
      `"${(p.brands?.name || '').replace(/"/g, '""')}"`,
      `"${p.product_type || 'simple'}"`,
      computeTotalStock(p),
      Number(p.reorder_level || 0),
      p.is_active ? 'Active' : 'Inactive',
      `"${p.created_at || ''}"`,
    ])

    const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join(
      '\n'
    )
    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `products_catalog_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(
      t('products.table.exportSuccess', {
        defaultValue: `Exported ${filteredProducts.length} products to CSV`,
        count: filteredProducts.length,
      })
    )
  }

  const handleResetFilters = () => {
    table.resetColumnFilters()
    setGlobalFilter('')
    setQuickFilter(null)
  }

  const isFiltered =
    columnFilters.length > 0 || globalFilter !== '' || quickFilter !== null

  return (
    <div className='flex flex-1 flex-col gap-4'>
      {/* Quick Filter Status Pills */}
      <div className='flex flex-wrap items-center gap-1.5 sm:gap-2'>
        <Button
          variant={quickFilter === null || quickFilter === 'all' ? 'default' : 'outline'}
          size='sm'
          onClick={() => setQuickFilter(null)}
          className='h-7 text-xs rounded-full px-3 gap-1.5'
        >
          <span>{t('products.filters.all', { defaultValue: 'All' })}</span>
          <Badge
            variant={quickFilter === null || quickFilter === 'all' ? 'secondary' : 'outline'}
            className='h-4 px-1 text-[10px] font-mono'
          >
            {data.length}
          </Badge>
        </Button>

        <Button
          variant={quickFilter === 'in_stock' ? 'default' : 'outline'}
          size='sm'
          onClick={() =>
            setQuickFilter(quickFilter === 'in_stock' ? null : 'in_stock')
          }
          className='h-7 text-xs rounded-full px-3 gap-1.5'
        >
          <span className='h-1.5 w-1.5 rounded-full bg-emerald-500' />
          <span>{t('products.filters.inStock', { defaultValue: 'In Stock' })}</span>
          <Badge
            variant={quickFilter === 'in_stock' ? 'secondary' : 'outline'}
            className='h-4 px-1 text-[10px] font-mono'
          >
            {statsCounts.inStock}
          </Badge>
        </Button>

        <Button
          variant={quickFilter === 'low_stock' ? 'default' : 'outline'}
          size='sm'
          onClick={() =>
            setQuickFilter(quickFilter === 'low_stock' ? null : 'low_stock')
          }
          className='h-7 text-xs rounded-full px-3 gap-1.5'
        >
          <span className='h-1.5 w-1.5 rounded-full bg-amber-500' />
          <span>{t('products.filters.lowStock', { defaultValue: 'Low Stock' })}</span>
          <Badge
            variant={quickFilter === 'low_stock' ? 'secondary' : 'outline'}
            className='h-4 px-1 text-[10px] font-mono'
          >
            {statsCounts.lowStock}
          </Badge>
        </Button>

        <Button
          variant={quickFilter === 'out_of_stock' ? 'default' : 'outline'}
          size='sm'
          onClick={() =>
            setQuickFilter(quickFilter === 'out_of_stock' ? null : 'out_of_stock')
          }
          className='h-7 text-xs rounded-full px-3 gap-1.5'
        >
          <span className='h-1.5 w-1.5 rounded-full bg-rose-500' />
          <span>{t('products.filters.outOfStock', { defaultValue: 'Out of Stock' })}</span>
          <Badge
            variant={quickFilter === 'out_of_stock' ? 'secondary' : 'outline'}
            className='h-4 px-1 text-[10px] font-mono'
          >
            {statsCounts.outOfStock}
          </Badge>
        </Button>

        <Button
          variant={quickFilter === 'inactive' ? 'default' : 'outline'}
          size='sm'
          onClick={() =>
            setQuickFilter(quickFilter === 'inactive' ? null : 'inactive')
          }
          className='h-7 text-xs rounded-full px-3 gap-1.5'
        >
          <span className='h-1.5 w-1.5 rounded-full bg-muted-foreground' />
          <span>{t('products.filters.inactive', { defaultValue: 'Inactive' })}</span>
          <Badge
            variant={quickFilter === 'inactive' ? 'secondary' : 'outline'}
            className='h-4 px-1 text-[10px] font-mono'
          >
            {statsCounts.inactive}
          </Badge>
        </Button>
      </div>

      {/* Main DataTable Toolbar with Faceted Filters and Sort Selector */}
      <DataTableToolbar
        table={table}
        searchPlaceholder={t('products.table.searchPlaceholder', {
          defaultValue: 'Search by name, SKU, barcode, brand...',
        })}
        filters={[
          ...(categoryFilterOptions.length > 0
            ? [
                {
                  columnId: 'category',
                  title: t('products.columns.category', {
                    defaultValue: 'Category',
                  }),
                  options: categoryFilterOptions,
                },
              ]
            : []),
          ...(brandFilterOptions.length > 0
            ? [
                {
                  columnId: 'brand',
                  title: t('products.columns.brand', { defaultValue: 'Brand' }),
                  options: brandFilterOptions,
                },
              ]
            : []),
          {
            columnId: 'product_type',
            title: t('products.columns.productType', { defaultValue: 'Type' }),
            options: productTypeFilterOptions,
          },
          {
            columnId: 'stock_status',
            title: t('products.columns.stock', { defaultValue: 'Stock' }),
            options: stockStatusFilterOptions,
          },
          {
            columnId: 'is_active',
            title: t('products.columns.status', { defaultValue: 'Status' }),
            options: statusFilterOptions,
          },
        ]}
        toolbarActions={
          <div className='flex items-center gap-2'>
            {/* Quick Sort Dropdown */}
            <Select value={currentSortValue} onValueChange={handleSortChange}>
              <SelectTrigger className='h-8 w-[145px] sm:w-[170px] text-xs'>
                <ArrowUpDown className='h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0' />
                <SelectValue
                  placeholder={t('products.sort.placeholder', {
                    defaultValue: 'Sort by...',
                  })}
                />
              </SelectTrigger>
              <SelectContent align='end'>
                {sortPresets.map((preset) => (
                  <SelectItem
                    key={preset.value}
                    value={preset.value}
                    className='text-xs'
                  >
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Export CSV Button */}
            <Button
              variant='outline'
              size='sm'
              onClick={handleExportCsv}
              className='h-8 text-xs gap-1.5 px-2 sm:px-3'
              title={t('common.exportCsv', { defaultValue: 'Export CSV' })}
            >
              <Download className='h-3.5 w-3.5' />
              <span className='hidden sm:inline'>
                {t('common.exportCsv', { defaultValue: 'Export' })}
              </span>
            </Button>
          </div>
        }
      />

      {/* Products Table Grid */}
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
                  className='h-48 text-center'
                >
                  <div className='flex flex-col items-center justify-center gap-2 text-muted-foreground'>
                    <div className='rounded-full bg-muted/60 p-3'>
                      <PackageSearch className='h-6 w-6' />
                    </div>
                    <p className='font-medium text-sm'>
                      {t('products.table.noResults', {
                        defaultValue: 'No products found',
                      })}
                    </p>
                    <p className='text-xs text-muted-foreground max-w-sm'>
                      {isFiltered
                        ? t('products.table.noResultsFiltered', {
                            defaultValue:
                              'Try adjusting or resetting your search and filters to find products.',
                          })
                        : t('products.table.noProductsYet', {
                            defaultValue:
                              'No products in this inventory catalog yet.',
                          })}
                    </p>
                    {isFiltered && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={handleResetFilters}
                        className='mt-2 h-8 text-xs gap-1.5'
                      >
                        <RotateCcw className='h-3.5 w-3.5' />
                        {t('dataTable.reset', { defaultValue: 'Reset Filters' })}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <DataTablePagination table={table} className='mt-auto' />

      {/* Bulk Actions Floating Toolbar */}
      <ProductsBulkActions table={table} />
    </div>
  )
}

export default ProductsTable
