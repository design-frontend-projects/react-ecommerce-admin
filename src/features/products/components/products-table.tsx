import { useState, useMemo, useEffect } from 'react'
import {
  type ColumnFiltersState,
  type FilterFn,
  type OnChangeFn,
  type PaginationState,
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
  LayoutGrid,
  LayoutList,
  Loader2,
  AlertCircle,
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
import { ProductsCardsGrid } from './products-cards-grid'
import { ProductsFilterDrawer } from './products-filter-drawer'
import {
  useCategoryOptions,
  useBrandOptions,
  useUomOptions,
  useSupplierOptions,
} from '../hooks/use-product-options'

export interface ProductsTableProps {
  data: Product[]
  totalCount?: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  search?: string
  onSearchChange?: (search: string) => void
  selectedCategory?: string | null
  onSelectCategory?: (id: string | null) => void
  selectedBrand?: string | null
  onSelectBrand?: (id: string | null) => void
  selectedUom?: string | null
  onSelectUom?: (id: string | null) => void
  selectedSupplier?: string | null
  onSelectSupplier?: (id: string | null) => void
  selectedProductType?: string | null
  onSelectProductType?: (type: string | null) => void
  selectedIsActive?: string | null
  onSelectIsActive?: (val: string | null) => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  isLoading?: boolean
  isFetching?: boolean
  error?: unknown
  onRetry?: () => void
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

export function ProductsTable({
  data,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  search,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  selectedBrand,
  onSelectBrand,
  selectedUom,
  onSelectUom,
  selectedSupplier,
  onSelectSupplier,
  selectedProductType,
  onSelectProductType,
  selectedIsActive,
  onSelectIsActive,
  sortBy,
  sortOrder,
  onSortChange,
  isLoading = false,
  isFetching = false,
  error,
  onRetry,
}: ProductsTableProps) {
  const { t } = useTranslation()
  const { quickFilter, setQuickFilter } = useProductsContext()

  const isServer = totalCount !== undefined && onPageChange !== undefined

  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    base_uom: false,
    stock_status: false,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: sortBy || 'created_at', desc: sortOrder !== 'asc' },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState(search ?? '')

  // Helper to format friendly error messages including statement timeout (code 57014)
  const getErrorMessage = (err: unknown): string => {
    if (!err) return ''
    const errObj = err as any
    if (errObj?.code === '57014' || errObj?.message?.includes('timeout')) {
      return t('products.timeoutError', {
        defaultValue:
          'The request took too long to complete. Please try using more specific filters or try again.',
      })
    }
    if (err instanceof Error) {
      return err.message
    }
    if (typeof err === 'object' && errObj?.message) {
      return String(errObj.message)
    }
    return t('products.unexpectedError', {
      defaultValue: 'An unexpected error occurred while loading products.',
    })
  }

  // Fetch full lookups for filters
  const { data: dbCategories = [] } = useCategoryOptions()
  const { data: dbBrands = [] } = useBrandOptions()
  const { data: dbUoms = [] } = useUomOptions()
  const { data: dbSuppliers = [] } = useSupplierOptions()

  const columns = useMemo(() => getColumns(t), [t])

  // Sync quickFilter changes to columnFilters in client mode or server params
  useEffect(() => {
    if (!isServer) {
      setColumnFilters((prev) => {
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
    }
  }, [quickFilter, isServer])

  // Local pagination state for server-side manual pagination
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: Math.max(0, (page ?? 1) - 1),
    pageSize: pageSize ?? 20,
  })

  useEffect(() => {
    if (page !== undefined && pageSize !== undefined) {
      setPagination({
        pageIndex: Math.max(0, page - 1),
        pageSize,
      })
    }
  }, [page, pageSize])

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const nextPagination =
      typeof updater === 'function' ? updater(pagination) : updater
    setPagination(nextPagination)

    if (onPageChange && nextPagination.pageIndex !== pagination.pageIndex) {
      onPageChange(nextPagination.pageIndex + 1)
    }
    if (onPageSizeChange && nextPagination.pageSize !== pagination.pageSize) {
      onPageSizeChange(nextPagination.pageSize)
      onPageChange?.(1)
    }
  }

  // Handle global filter change (Search)
  const handleGlobalFilterChange = (val: string) => {
    setGlobalFilter(val)
    if (onSearchChange) {
      onSearchChange(val)
    }
  }

  // Handle column filters change (sync faceted toolbar filters to server query in isServer mode)
  const handleColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (
    updater
  ) => {
    const nextFilters =
      typeof updater === 'function' ? updater(columnFilters) : updater
    setColumnFilters(nextFilters)

    if (isServer) {
      const catFilter = nextFilters.find((f) => f.id === 'category')
      const catVal = Array.isArray(catFilter?.value)
        ? (catFilter.value[0] as string) || null
        : (catFilter?.value as string) || null
      onSelectCategory?.(catVal)

      const brandFilter = nextFilters.find((f) => f.id === 'brand')
      const brandVal = Array.isArray(brandFilter?.value)
        ? (brandFilter.value[0] as string) || null
        : (brandFilter?.value as string) || null
      onSelectBrand?.(brandVal)

      const uomFilter = nextFilters.find((f) => f.id === 'base_uom')
      const uomVal = Array.isArray(uomFilter?.value)
        ? (uomFilter.value[0] as string) || null
        : (uomFilter?.value as string) || null
      onSelectUom?.(uomVal)

      const supFilter = nextFilters.find((f) => f.id === 'supplier')
      const supVal = Array.isArray(supFilter?.value)
        ? (supFilter.value[0] as string) || null
        : (supFilter?.value as string) || null
      onSelectSupplier?.(supVal)

      const ptFilter = nextFilters.find((f) => f.id === 'product_type')
      const ptVal = Array.isArray(ptFilter?.value)
        ? (ptFilter.value[0] as string) || null
        : (ptFilter?.value as string) || null
      onSelectProductType?.(ptVal)

      const actFilter = nextFilters.find((f) => f.id === 'is_active')
      const actVal = Array.isArray(actFilter?.value)
        ? (actFilter.value[0] as string) || null
        : (actFilter?.value as string) || null
      onSelectIsActive?.(actVal)

      onPageChange?.(1)
    }
  }

  // Handle sorting change
  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const nextSorting =
      typeof updater === 'function' ? updater(sorting) : updater
    setSorting(nextSorting)

    if (onSortChange && nextSorting.length > 0) {
      const first = nextSorting[0]
      onSortChange(first.id, first.desc ? 'desc' : 'asc')
    }
  }

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      columnFilters,
      globalFilter,
      ...(isServer ? { pagination } : {}),
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: handleSortingChange,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: handleColumnFiltersChange,
    onGlobalFilterChange: handleGlobalFilterChange,
    globalFilterFn,
    manualPagination: isServer,
    manualFiltering: isServer,
    manualSorting: isServer,
    pageCount: isServer
      ? Math.max(1, Math.ceil((totalCount ?? 0) / (pageSize || 20)))
      : undefined,
    rowCount: isServer ? totalCount : undefined,
    onPaginationChange: isServer ? handlePaginationChange : undefined,
    getCoreRowModel: getCoreRowModel(),
    ...(!isServer
      ? {
          getPaginationRowModel: getPaginationRowModel(),
          getFilteredRowModel: getFilteredRowModel(),
          getSortedRowModel: getSortedRowModel(),
          getFacetedRowModel: getFacetedRowModel(),
          getFacetedUniqueValues: getFacetedUniqueValues(),
        }
      : {}),
  })

  // Quick stats counts
  const statsCounts = useMemo(() => {
    let inStock = 0
    let lowStock = 0
    let outOfStock = 0
    let inactive = 0

    for (const p of data) {
      const stock = computeTotalStock(p)

      if (stock <= 0) {
        outOfStock++
      } else {
        inStock++
        if (stock <= 5) {
          lowStock++
        }
      }

      if (!p.is_active) {
        inactive++
      }
    }

    return { inStock, lowStock, outOfStock, inactive }
  }, [data])

  // Faceted filter options from database or fallback to data
  const categoryFilterOptions = useMemo(() => {
    if (dbCategories.length > 0) {
      return dbCategories.map((c) => ({
        label: c.name_ar ? `${c.name} (${c.name_ar})` : c.name,
        value: isServer ? c.id : c.name,
      }))
    }
    const map = new Map<string, string>()
    for (const item of data) {
      const name = item.categories?.name
      if (name) map.set(name, name)
    }
    return Array.from(map.values())
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ label: name, value: name }))
  }, [dbCategories, data, isServer])

  const brandFilterOptions = useMemo(() => {
    if (dbBrands.length > 0) {
      return dbBrands.map((b) => ({
        label: b.name_ar ? `${b.name} (${b.name_ar})` : b.name,
        value: isServer ? b.id : b.name,
      }))
    }
    const map = new Map<string, string>()
    for (const item of data) {
      const name = item.brands?.name
      if (name) map.set(name, name)
    }
    return Array.from(map.values())
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ label: name, value: name }))
  }, [dbBrands, data, isServer])

  const uomFilterOptions = useMemo(() => {
    if (dbUoms.length > 0) {
      return dbUoms.map((u) => ({
        label: `${u.name} (${u.code})`,
        value: isServer ? u.id : u.code || u.name,
      }))
    }
    const map = new Map<string, string>()
    for (const item of data) {
      const code = item.base_uom?.code || item.base_uom?.name
      if (code) map.set(code, code)
    }
    return Array.from(map.values()).map((name) => ({
      label: name,
      value: name,
    }))
  }, [dbUoms, data, isServer])

  const supplierFilterOptions = useMemo(() => {
    if (dbSuppliers.length > 0) {
      return dbSuppliers.map((s) => ({
        label: s.code ? `${s.name} (${s.code})` : s.name,
        value: isServer ? s.id : s.name,
      }))
    }
    const map = new Map<string, string>()
    for (const item of data) {
      const name = item.suppliers?.name
      if (name) map.set(name, name)
    }
    return Array.from(map.values()).map((name) => ({
      label: name,
      value: name,
    }))
  }, [dbSuppliers, data, isServer])

  const productTypeFilterOptions = useMemo(
    () => [
      {
        label: t('products.enums.productType.simple', { defaultValue: 'Simple' }),
        value: 'simple',
      },
      {
        label: t('products.enums.productType.variant', {
          defaultValue: 'Variant',
        }),
        value: 'variant',
      },
      {
        label: t('products.enums.productType.bundle', {
          defaultValue: 'Bundle',
        }),
        value: 'bundle',
      },
      {
        label: t('products.enums.productType.service', {
          defaultValue: 'Service',
        }),
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
    ],
    [t]
  )

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
      if (onSortChange) {
        onSortChange(preset.sort[0].id, preset.sort[0].desc ? 'desc' : 'asc')
      }
    }
  }

  // Export filtered products to CSV
  const handleExportCsv = () => {
    const exportItems = isServer
      ? data
      : table.getFilteredRowModel().rows.map((r) => r.original)

    if (!exportItems.length) {
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
      'Base UOM',
      'Supplier',
      'Product Type',
      'Stock',
      'Status',
      'Created At',
    ]

    const csvRows = exportItems.map((p) => [
      `"${p.id || ''}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.sku || '').replace(/"/g, '""')}"`,
      `"${(p.barcode || '').replace(/"/g, '""')}"`,
      `"${(p.categories?.name || '').replace(/"/g, '""')}"`,
      `"${(p.brands?.name || '').replace(/"/g, '""')}"`,
      `"${(p.base_uom?.name || p.base_uom?.code || '').replace(/"/g, '""')}"`,
      `"${(p.suppliers?.name || '').replace(/"/g, '""')}"`,
      `"${p.product_type || 'simple'}"`,
      computeTotalStock(p),
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
        defaultValue: `Exported ${exportItems.length} products to CSV`,
        count: exportItems.length,
      })
    )
  }

  const handleResetFilters = () => {
    table.resetColumnFilters()
    setGlobalFilter('')
    setQuickFilter(null)
    onSearchChange?.('')
    onSelectCategory?.(null)
    onSelectBrand?.(null)
    onSelectUom?.(null)
    onSelectSupplier?.(null)
    onSelectProductType?.(null)
    onSelectIsActive?.(null)
    onPageChange?.(1)
    if (error && onRetry) {
      onRetry()
    }
  }

  // Calculate active filter count for mobile filter drawer badge
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (selectedCategory) count++
    if (selectedBrand) count++
    if (selectedUom) count++
    if (selectedSupplier) count++
    if (selectedProductType) count++
    if (selectedIsActive) count++
    if (columnFilters.length > 0) count += columnFilters.length
    return count
  }, [
    selectedCategory,
    selectedBrand,
    selectedUom,
    selectedSupplier,
    selectedProductType,
    selectedIsActive,
    columnFilters,
  ])

  const isFiltered =
    columnFilters.length > 0 ||
    globalFilter !== '' ||
    quickFilter !== null ||
    activeFiltersCount > 0

  return (
    <div className='flex flex-1 flex-col gap-3.5 sm:gap-4'>
      {/* Quick Filter Status Pills */}
      <div className='flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none'>
        <Button
          variant={
            quickFilter === null || quickFilter === 'all'
              ? 'default'
              : 'outline'
          }
          size='sm'
          onClick={() => {
            setQuickFilter(null)
            onPageChange?.(1)
          }}
          className='h-7 text-xs rounded-full px-3 gap-1.5 shrink-0'
        >
          <span>{t('products.filters.all', { defaultValue: 'All' })}</span>
          <Badge
            variant={
              quickFilter === null || quickFilter === 'all'
                ? 'secondary'
                : 'outline'
            }
            className='h-4 px-1 text-[10px] font-mono'
          >
            {totalCount !== undefined ? totalCount : data.length}
          </Badge>
        </Button>

        <Button
          variant={quickFilter === 'in_stock' ? 'default' : 'outline'}
          size='sm'
          onClick={() => {
            setQuickFilter(quickFilter === 'in_stock' ? null : 'in_stock')
            onPageChange?.(1)
          }}
          className='h-7 text-xs rounded-full px-3 gap-1.5 shrink-0'
        >
          <span className='h-1.5 w-1.5 rounded-full bg-emerald-500' />
          <span>
            {t('products.filters.inStock', { defaultValue: 'In Stock' })}
          </span>
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
          onClick={() => {
            setQuickFilter(quickFilter === 'low_stock' ? null : 'low_stock')
            onPageChange?.(1)
          }}
          className='h-7 text-xs rounded-full px-3 gap-1.5 shrink-0'
        >
          <span className='h-1.5 w-1.5 rounded-full bg-amber-500' />
          <span>
            {t('products.filters.lowStock', { defaultValue: 'Low Stock' })}
          </span>
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
          onClick={() => {
            setQuickFilter(quickFilter === 'out_of_stock' ? null : 'out_of_stock')
            onPageChange?.(1)
          }}
          className='h-7 text-xs rounded-full px-3 gap-1.5 shrink-0'
        >
          <span className='h-1.5 w-1.5 rounded-full bg-rose-500' />
          <span>
            {t('products.filters.outOfStock', { defaultValue: 'Out of Stock' })}
          </span>
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
          onClick={() => {
            setQuickFilter(quickFilter === 'inactive' ? null : 'inactive')
            onPageChange?.(1)
          }}
          className='h-7 text-xs rounded-full px-3 gap-1.5 shrink-0'
        >
          <span className='h-1.5 w-1.5 rounded-full bg-muted-foreground' />
          <span>
            {t('products.filters.inactive', { defaultValue: 'Inactive' })}
          </span>
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
          ...(uomFilterOptions.length > 0
            ? [
                {
                  columnId: 'base_uom',
                  title: t('products.columns.uom', { defaultValue: 'Base UOM' }),
                  options: uomFilterOptions,
                },
              ]
            : []),
          ...(supplierFilterOptions.length > 0
            ? [
                {
                  columnId: 'supplier',
                  title: t('products.columns.supplier', {
                    defaultValue: 'Supplier',
                  }),
                  options: supplierFilterOptions,
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
          <div className='flex items-center gap-1.5 sm:gap-2'>
            {/* Mobile Filter Drawer trigger button */}
            <div className='lg:hidden'>
              <ProductsFilterDrawer
                selectedCategory={selectedCategory ?? null}
                onSelectCategory={(val) => {
                  onSelectCategory?.(val)
                  onPageChange?.(1)
                }}
                selectedBrand={selectedBrand ?? null}
                onSelectBrand={(val) => {
                  onSelectBrand?.(val)
                  onPageChange?.(1)
                }}
                selectedUom={selectedUom ?? null}
                onSelectUom={(val) => {
                  onSelectUom?.(val)
                  onPageChange?.(1)
                }}
                selectedSupplier={selectedSupplier ?? null}
                onSelectSupplier={(val) => {
                  onSelectSupplier?.(val)
                  onPageChange?.(1)
                }}
                selectedProductType={selectedProductType ?? null}
                onSelectProductType={(val) => {
                  onSelectProductType?.(val)
                  onPageChange?.(1)
                }}
                selectedIsActive={selectedIsActive ?? null}
                onSelectIsActive={(val) => {
                  onSelectIsActive?.(val)
                  onPageChange?.(1)
                }}
                categories={dbCategories}
                brands={dbBrands}
                uoms={dbUoms}
                suppliers={dbSuppliers}
                onResetAll={handleResetFilters}
                activeFiltersCount={activeFiltersCount}
              />
            </div>

            {/* Quick Sort Dropdown */}
            <Select value={currentSortValue} onValueChange={handleSortChange}>
              <SelectTrigger className='h-8 w-[130px] sm:w-[160px] text-xs'>
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

            {/* View Mode Toggle (Table / Grid) */}
            <div className='flex items-center rounded-md border bg-muted/40 p-0.5'>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size='sm'
                onClick={() => setViewMode('table')}
                className='h-7 w-7 p-0'
                title={t('products.view.tableView', {
                  defaultValue: 'Table View',
                })}
              >
                <LayoutList className='h-3.5 w-3.5' />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size='sm'
                onClick={() => setViewMode('grid')}
                className='h-7 w-7 p-0'
                title={t('products.view.gridView', { defaultValue: 'Grid View' })}
              >
                <LayoutGrid className='h-3.5 w-3.5' />
              </Button>
            </div>

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

      {/* Stale data warning banner when error occurs but products are already loaded */}
      {error && data.length > 0 && (
        <div className='flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive'>
          <div className='flex items-center gap-2'>
            <AlertCircle className='h-4 w-4 shrink-0' />
            <span>{getErrorMessage(error)}</span>
          </div>
          {onRetry && (
            <Button
              variant='outline'
              size='sm'
              onClick={onRetry}
              className='h-7 text-xs gap-1 border-destructive/30 hover:bg-destructive/10'
            >
              <RotateCcw className='h-3 w-3' />
              {t('common.tryAgain', { defaultValue: 'Try Again' })}
            </Button>
          )}
        </div>
      )}

      {/* Loading Overlay indicator when refetching server data */}
      {isFetching && !isLoading && (
        <div className='flex items-center gap-2 text-xs text-muted-foreground animate-pulse py-0.5 px-1'>
          <Loader2 className='h-3.5 w-3.5 animate-spin text-primary' />
          <span>
            {t('products.table.updatingData', {
              defaultValue: 'Updating catalog...',
            })}
          </span>
        </div>
      )}

      {/* Main Content: Table or Grid View */}
      {viewMode === 'grid' ? (
        error && data.length === 0 ? (
          <div className='flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-destructive text-center'>
            <div className='rounded-full bg-destructive/10 p-3'>
              <AlertCircle className='h-6 w-6' />
            </div>
            <div className='space-y-1'>
              <p className='font-semibold text-sm'>
                {t('products.errorLoading', {
                  defaultValue: 'Failed to load products',
                })}
              </p>
              <p className='text-xs text-muted-foreground max-w-sm mx-auto'>
                {getErrorMessage(error)}
              </p>
            </div>
            <div className='flex items-center gap-2 mt-2'>
              {onRetry && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={onRetry}
                  className='h-8 text-xs gap-1.5'
                >
                  <RotateCcw className='h-3.5 w-3.5' />
                  {t('common.tryAgain', { defaultValue: 'Try Again' })}
                </Button>
              )}
              <Button
                variant='secondary'
                size='sm'
                onClick={handleResetFilters}
                className='h-8 text-xs gap-1.5'
              >
                <RotateCcw className='h-3.5 w-3.5' />
                {t('dataTable.reset', {
                  defaultValue: 'Reset Filters',
                })}
              </Button>
            </div>
          </div>
        ) : !isLoading && data.length === 0 ? (
          <div className='flex flex-col items-center justify-center gap-2 rounded-xl border bg-card p-12 text-center text-muted-foreground'>
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
                {t('dataTable.reset', {
                  defaultValue: 'Reset Filters',
                })}
              </Button>
            )}
          </div>
        ) : (
          <ProductsCardsGrid table={table} isLoading={isLoading} />
        )
      ) : (
        <div className='overflow-x-auto rounded-md border bg-card shadow-2xs'>
          <Table>
            <TableHeader className='bg-muted/30'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className='text-xs font-semibold py-2.5 whitespace-nowrap'>
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
                      <TableCell key={cell.id} className='py-2.5 text-xs'>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='h-56 text-center'
                  >
                    <div className='flex flex-col items-center justify-center gap-3 text-destructive p-6'>
                      <div className='rounded-full bg-destructive/10 p-3'>
                        <AlertCircle className='h-6 w-6' />
                      </div>
                      <div className='space-y-1'>
                        <p className='font-semibold text-sm'>
                          {t('products.errorLoading', {
                            defaultValue: 'Failed to load products',
                          })}
                        </p>
                        <p className='text-xs text-muted-foreground max-w-sm mx-auto'>
                          {getErrorMessage(error)}
                        </p>
                      </div>
                      <div className='flex items-center gap-2 mt-2'>
                        {onRetry && (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={onRetry}
                            className='h-8 text-xs gap-1.5'
                          >
                            <RotateCcw className='h-3.5 w-3.5' />
                            {t('common.tryAgain', { defaultValue: 'Try Again' })}
                          </Button>
                        )}
                        <Button
                          variant='secondary'
                          size='sm'
                          onClick={handleResetFilters}
                          className='h-8 text-xs gap-1.5'
                        >
                          <RotateCcw className='h-3.5 w-3.5' />
                          {t('dataTable.reset', {
                            defaultValue: 'Reset Filters',
                          })}
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
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
                          {t('dataTable.reset', {
                            defaultValue: 'Reset Filters',
                          })}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination Controls */}
      <DataTablePagination table={table} className='mt-auto pt-1' />

      {/* Bulk Actions Floating Toolbar */}
      <ProductsBulkActions table={table} />
    </div>
  )
}

export default ProductsTable
