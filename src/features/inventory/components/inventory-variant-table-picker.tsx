'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowUpDown,
  Barcode,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Layers,
  Loader2,
  Package,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ProductVariantItem } from '../data/schema'
import { useProductVariantsPaginated } from '../hooks/use-inventory'

export interface InventoryVariantTablePickerProps {
  value?: string | null
  onSelect: (variant: ProductVariantItem) => void
  disabled?: boolean
  currentVariantInfo?: {
    id: string
    sku?: string | null
    name?: string | null
    product_name?: string | null
    barcode?: string | null
  } | null
  className?: string
  'aria-label'?: string
}

export function InventoryVariantTablePicker({
  value,
  onSelect,
  disabled = false,
  currentVariantInfo,
  className,
  'aria-label': ariaLabel,
}: InventoryVariantTablePickerProps) {
  const { t } = useTranslation()
  const searchInputId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortBy, setSortBy] = useState<
    'sku' | 'product_name' | 'name' | 'created_at'
  >('sku')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [assignedFilter, setAssignedFilter] = useState<
    'all' | 'unassigned' | 'assigned'
  >('all')

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1) // Reset to first page on search
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Fetch paginated variants from server
  const {
    data: variantData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useProductVariantsPaginated({
    search: debouncedSearch,
    page,
    pageSize,
    sortBy,
    sortOrder,
    isAssigned: assignedFilter,
  })

  const items = variantData?.items || []
  const pagination = variantData?.pagination || {
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  }

  // Find currently selected variant if in current page, or fallback to currentVariantInfo
  const activeSelectedVariant = useMemo(() => {
    if (!value || value === 'none') return null
    const foundInPage = items.find((v) => v.id === value)
    if (foundInPage) return foundInPage
    if (currentVariantInfo && currentVariantInfo.id === value) {
      return {
        id: currentVariantInfo.id,
        sku: currentVariantInfo.sku || '',
        name: currentVariantInfo.name || null,
        product_name: currentVariantInfo.product_name || '',
        barcode: currentVariantInfo.barcode || null,
      } as ProductVariantItem
    }
    return null
  }, [items, value, currentVariantInfo])

  const handleSelect = (variant: ProductVariantItem) => {
    onSelect(variant)
    setIsOpen(false)
  }

  const handleSortChange = (newSortBy: 'sku' | 'product_name' | 'name') => {
    if (sortBy === newSortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(newSortBy)
      setSortOrder('asc')
    }
    setPage(1)
  }

  return (
    <div className={className}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <div className='flex items-center gap-2'>
          <DialogTrigger asChild>
            <Button
              type='button'
              variant='outline'
              disabled={disabled}
              aria-label={
                ariaLabel ||
                t('inventory.picker.triggerLabel', 'Select Product Variant')
              }
              className='h-auto w-full justify-between border-input px-3 py-2.5 text-start transition-colors hover:border-primary/50'
            >
              <div className='flex min-w-0 items-center gap-2.5'>
                <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                  <Layers className='h-4 w-4' />
                </div>
                <div className='flex min-w-0 flex-col text-xs sm:text-sm'>
                  {activeSelectedVariant ? (
                    <>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className='truncate font-semibold text-foreground'>
                          {activeSelectedVariant.product_name}
                        </span>
                        <Badge
                          variant='outline'
                          className='font-mono text-[10px] uppercase'
                        >
                          SKU: {activeSelectedVariant.sku}
                        </Badge>
                      </div>
                      <span className='truncate text-xs text-muted-foreground'>
                        {activeSelectedVariant.name ||
                          t('inventory.standardVariant', 'Default Variant')}
                        {activeSelectedVariant.barcode
                          ? ` · Barcode: ${activeSelectedVariant.barcode}`
                          : ''}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className='font-medium text-foreground'>
                        {t(
                          'inventory.picker.selectVariant',
                          'Select Product Variant from Database...'
                        )}
                      </span>
                      <span className='text-xs text-muted-foreground'>
                        {t(
                          'inventory.picker.browsePrompt',
                          'Search & select a variant with server-side pagination'
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <Badge
                variant='secondary'
                className='ms-2 shrink-0 gap-1 text-xs font-normal'
              >
                <Filter className='h-3 w-3' />
                {t('inventory.picker.browseTable', 'Browse Table')}
              </Badge>
            </Button>
          </DialogTrigger>
        </div>

        <DialogContent
          className='flex max-h-[90vh] w-[95vw] md:w-[80vw] lg:w-[75vw] max-w-7xl flex-col overflow-hidden p-0'
          aria-describedby='variant-table-picker-desc'
        >
          {/* Header */}
          <div className='border-b bg-card p-6 pb-4'>
            <DialogHeader className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                    <Package className='h-5 w-5' />
                  </div>
                  <div>
                    <DialogTitle className='text-lg font-bold text-foreground'>
                      {t(
                        'inventory.picker.dialogTitle',
                        'Select Product Variant'
                      )}
                    </DialogTitle>
                    <DialogDescription
                      id='variant-table-picker-desc'
                      className='text-xs text-muted-foreground'
                    >
                      {t(
                        'inventory.picker.dialogDesc',
                        'Search and select an active product variant from the database to register in inventory items.'
                      )}
                    </DialogDescription>
                  </div>
                </div>

                <Badge variant='outline' className='font-mono text-xs'>
                  {pagination.totalCount}{' '}
                  {t('inventory.picker.variantsFound', 'variant(s)')}
                </Badge>
              </div>
            </DialogHeader>

            {/* Search Bar & Tabs */}
            <div className='mt-4 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center'>
              <div className='relative flex-1'>
                <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  id={searchInputId}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t(
                    'inventory.picker.searchPlaceholder',
                    'Search variant SKU, name, barcode, product...'
                  )}
                  className='h-9 pr-9 pl-9 text-xs sm:text-sm'
                  autoFocus
                />
                {searchInput && (
                  <button
                    type='button'
                    onClick={() => setSearchInput('')}
                    className='absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                  >
                    <X className='h-3.5 w-3.5' />
                  </button>
                )}
              </div>

              {/* Assignment Filter Tabs */}
              <Tabs
                value={assignedFilter}
                onValueChange={(val) => {
                  setAssignedFilter(val as 'all' | 'unassigned' | 'assigned')
                  setPage(1)
                }}
                className='shrink-0'
              >
                <TabsList className='grid h-9 grid-cols-3 text-xs'>
                  <TabsTrigger value='all' className='px-2.5 text-xs'>
                    {t('common.all', 'All')}
                  </TabsTrigger>
                  <TabsTrigger
                    value='unassigned'
                    className='gap-1 px-2.5 text-xs'
                  >
                    <Sparkles className='h-3 w-3 text-emerald-500' />
                    {t('inventory.picker.unassigned', 'Available')}
                  </TabsTrigger>
                  <TabsTrigger value='assigned' className='px-2.5 text-xs'>
                    {t('inventory.picker.assigned', 'In Inventory')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Table Body Area */}
          <div className='flex-1 overflow-auto p-4 sm:p-6'>
            {isLoading ? (
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <Skeleton className='h-5 w-48' />
                  <Skeleton className='h-5 w-24' />
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className='h-14 w-full rounded-lg' />
                ))}
              </div>
            ) : error ? (
              <div className='flex flex-col items-center justify-center gap-3 p-10 text-center text-destructive'>
                <AlertCircle className='h-8 w-8' />
                <p className='text-sm font-semibold'>
                  {error instanceof Error
                    ? error.message
                    : t(
                        'inventory.picker.fetchError',
                        'Failed to load product variants'
                      )}
                </p>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => refetch()}
                  className='gap-1.5 text-xs'
                >
                  {t('common.tryAgain', 'Try Again')}
                </Button>
              </div>
            ) : items.length === 0 ? (
              <div className='flex flex-col items-center justify-center gap-2 p-12 text-center text-muted-foreground'>
                <Package className='h-10 w-10 text-muted-foreground/40' />
                <p className='text-sm font-medium text-foreground'>
                  {t(
                    'inventory.picker.noVariantsFound',
                    'No product variants found'
                  )}
                </p>
                <p className='max-w-sm text-xs text-muted-foreground'>
                  {debouncedSearch
                    ? t(
                        'inventory.picker.tryDifferentSearch',
                        'Try clearing your search terms or changing the assignment filter.'
                      )
                    : t(
                        'inventory.picker.emptyCatalog',
                        'No variants match the selected filters in this database partition.'
                      )}
                </p>
              </div>
            ) : (
              <div className='overflow-hidden rounded-lg border bg-card shadow-2xs'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-muted/40 hover:bg-muted/40'>
                      <TableHead
                        className='cursor-pointer py-2.5 text-xs font-semibold text-foreground transition-colors hover:text-primary'
                        onClick={() => handleSortChange('product_name')}
                      >
                        <div className='flex items-center gap-1.5'>
                          <span>
                            {t(
                              'inventory.columns.product',
                              'Product & Variant'
                            )}
                          </span>
                          <ArrowUpDown className='h-3 w-3 text-muted-foreground' />
                        </div>
                      </TableHead>

                      <TableHead
                        className='cursor-pointer py-2.5 text-xs font-semibold text-foreground transition-colors hover:text-primary'
                        onClick={() => handleSortChange('sku')}
                      >
                        <div className='flex items-center gap-1.5'>
                          <span>
                            {t('inventory.columns.skuBarcode', 'SKU / Barcode')}
                          </span>
                          <ArrowUpDown className='h-3 w-3 text-muted-foreground' />
                        </div>
                      </TableHead>

                      <TableHead className='py-2.5 text-xs font-semibold text-foreground'>
                        {t('inventory.columns.pricing', 'Pricing')}
                      </TableHead>

                      <TableHead className='py-2.5 text-center text-xs font-semibold text-foreground'>
                        {t('inventory.columns.liveStock', 'On Hand')}
                      </TableHead>

                      <TableHead className='py-2.5 text-center text-xs font-semibold text-foreground'>
                        {t('inventory.columns.status', 'Inventory Status')}
                      </TableHead>

                      <TableHead className='py-2.5 text-end text-xs font-semibold text-foreground'>
                        {t('common.action', 'Action')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((variant) => {
                      const isCurrentlySelected = variant.id === value
                      const isAlreadyAssigned = Boolean(
                        variant.is_assigned_to_inventory
                      )
                      const isSelectable =
                        !isAlreadyAssigned || isCurrentlySelected

                      return (
                        <TableRow
                          key={variant.id}
                          className={`transition-colors hover:bg-muted/40 ${
                            isCurrentlySelected
                              ? 'bg-primary/5 font-medium'
                              : ''
                          }`}
                        >
                          {/* Product & Variant Column */}
                          <TableCell className='py-3'>
                            <div className='flex min-w-[160px] flex-col gap-0.5'>
                              <span className='line-clamp-1 text-xs font-semibold text-foreground sm:text-sm'>
                                {variant.product_name}
                              </span>
                              <div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
                                {variant.name && (
                                  <span className='font-medium text-foreground/80'>
                                    {variant.name}
                                  </span>
                                )}
                                {variant.brand_name && (
                                  <Badge
                                    variant='outline'
                                    className='px-1 py-0 text-[10px]'
                                  >
                                    {variant.brand_name}
                                  </Badge>
                                )}
                                {variant.category_name && (
                                  <Badge
                                    variant='secondary'
                                    className='px-1 py-0 text-[10px]'
                                  >
                                    {variant.category_name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* SKU & Barcode Column */}
                          <TableCell className='py-3'>
                            <div className='flex flex-col gap-1'>
                              <Badge
                                variant='outline'
                                className='w-fit px-1.5 py-0 font-mono text-xs'
                              >
                                {variant.sku}
                              </Badge>
                              {variant.barcode && (
                                <span className='flex items-center gap-1 font-mono text-[10px] text-muted-foreground'>
                                  <Barcode className='h-3 w-3' />
                                  {variant.barcode}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Pricing Column */}
                          <TableCell className='py-3'>
                            <div className='flex flex-col text-xs'>
                              <span className='font-mono font-semibold text-foreground'>
                                ${Number(variant.price || 0).toFixed(2)}
                              </span>
                              {variant.cost_price != null &&
                                variant.cost_price > 0 && (
                                  <span className='font-mono text-[10px] text-muted-foreground'>
                                    Cost: $
                                    {Number(variant.cost_price).toFixed(2)}
                                  </span>
                                )}
                            </div>
                          </TableCell>

                          {/* Live Stock on Hand */}
                          <TableCell className='py-3 text-center'>
                            <div className='flex flex-col items-center justify-center'>
                              <span className='text-xs font-bold text-foreground sm:text-sm'>
                                {Number(
                                  variant.qty_on_hand || 0
                                ).toLocaleString()}
                              </span>
                              {variant.qty_available !== undefined && (
                                <span className='text-[10px] font-medium text-emerald-600 dark:text-emerald-400'>
                                  {variant.qty_available} avail
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Inventory Item Status */}
                          <TableCell className='py-3 text-center'>
                            {isAlreadyAssigned ? (
                              <Badge
                                variant='secondary'
                                className='border border-muted-foreground/20 text-[10px]'
                              >
                                {t(
                                  'inventory.picker.alreadyAssigned',
                                  'In Inventory'
                                )}
                              </Badge>
                            ) : (
                              <Badge
                                variant='outline'
                                className='border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300'
                              >
                                <Sparkles className='me-1 h-2.5 w-2.5' />
                                {t(
                                  'inventory.picker.availableToAdd',
                                  'Available'
                                )}
                              </Badge>
                            )}
                          </TableCell>

                          {/* Select Action Button */}
                          <TableCell className='py-3 text-end'>
                            {isCurrentlySelected ? (
                              <Badge
                                variant='default'
                                className='gap-1 px-2.5 py-1 text-xs'
                              >
                                <Check className='h-3 w-3' />
                                {t('common.selected', 'Selected')}
                              </Badge>
                            ) : (
                              <Button
                                size='sm'
                                variant={isSelectable ? 'default' : 'outline'}
                                disabled={!isSelectable}
                                onClick={() => handleSelect(variant)}
                                className='h-8 gap-1 text-xs'
                              >
                                {isSelectable ? (
                                  t('common.select', 'Select')
                                ) : (
                                  <span className='text-[10px] text-muted-foreground'>
                                    {t(
                                      'inventory.picker.alreadyAdded',
                                      'Assigned'
                                    )}
                                  </span>
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Server-Side Pagination Bar */}
          <div className='flex flex-wrap items-center justify-between gap-3 border-t bg-card/60 p-4 text-xs'>
            <div className='flex items-center gap-2 text-muted-foreground'>
              <span>{t('inventory.picker.rowsPerPage', 'Rows per page:')}</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val))
                  setPage(1)
                }}
              >
                <SelectTrigger className='h-8 w-16 text-xs'>
                  <SelectValue placeholder={String(pageSize)} />
                </SelectTrigger>
                <SelectContent side='top'>
                  {[5, 10, 20, 50].map((size) => (
                    <SelectItem
                      key={size}
                      value={String(size)}
                      className='text-xs'
                    >
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className='ms-2 font-medium text-foreground'>
                {t(
                  'inventory.picker.pageOf',
                  'Page {{page}} of {{totalPages}}',
                  {
                    page: pagination.page,
                    totalPages: pagination.totalPages,
                  }
                )}
              </span>

              {isFetching && (
                <div className='ms-2 flex items-center gap-1 text-[11px] text-primary'>
                  <Loader2 className='h-3 w-3 animate-spin' />
                  <span>{t('common.loading', 'Updating...')}</span>
                </div>
              )}
            </div>

            {/* Pagination Step Buttons */}
            <div className='ms-auto flex items-center gap-1'>
              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => setPage(1)}
                title='First Page'
              >
                <ChevronsLeft className='h-3.5 w-3.5' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                disabled={!pagination.hasPrevPage || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title='Previous Page'
              >
                <ChevronLeft className='h-3.5 w-3.5' />
              </Button>

              <div className='px-2 font-mono text-xs font-semibold'>
                {pagination.page} / {pagination.totalPages}
              </div>

              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                disabled={!pagination.hasNextPage || isLoading}
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                title='Next Page'
              >
                <ChevronRight className='h-3.5 w-3.5' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => setPage(pagination.totalPages)}
                title='Last Page'
              >
                <ChevronsRight className='h-3.5 w-3.5' />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
