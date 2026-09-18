'use client'

import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Package,
  Search,
  Check,
  ChevronsUpDown,
  X,
  Tag,
  Loader2,
  AlertTriangle,
  Building2,
  DollarSign,
  Scale,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { StockTransferProductVariant } from '../hooks/use-stock-transfer-products'

export interface StockTransferProductVirtualComboboxProps {
  value?: string | null
  onChange: (variant: StockTransferProductVariant | null) => void
  variants?: StockTransferProductVariant[]
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
  sourceWarehouseId?: string | null
  sourceWarehouseName?: string | null
  originStockMap?: Record<string, number>
  'aria-label'?: string
}

const CHUNK_SIZE = 50
const ITEM_HEIGHT = 82

export function StockTransferProductVirtualCombobox({
  value,
  onChange,
  variants = [],
  isLoading = false,
  disabled = false,
  placeholder,
  className,
  sourceWarehouseId,
  sourceWarehouseName,
  originStockMap = {},
  'aria-label': ariaLabel,
}: StockTransferProductVirtualComboboxProps) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filterTab, setFilterTab] = React.useState<
    'all' | 'in_stock' | 'out_of_stock'
  >('all')
  const [visibleLimit, setVisibleLimit] = React.useState(CHUNK_SIZE)
  const [activeIndex, setActiveIndex] = React.useState<number>(-1)

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Selected variant
  const selectedVariant = React.useMemo(() => {
    if (!value || value === 'none') return null
    return variants.find((v) => v.id === value) || null
  }, [variants, value])

  // Filtered variants by search query and stock status
  const filteredVariants = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return variants.filter((v) => {
      // Stock filter
      if (sourceWarehouseId) {
        const onHand = originStockMap[v.id] ?? 0
        if (filterTab === 'in_stock' && onHand <= 0) return false
        if (filterTab === 'out_of_stock' && onHand > 0) return false
      }

      if (!q) return true
      const searchTarget = (
        v.searchString ||
        `${v.sku} ${v.name} ${v.brand ?? ''} ${v.category ?? ''} ${v.barcode ?? ''}`
      ).toLowerCase()
      return searchTarget.includes(q)
    })
  }, [variants, searchQuery, filterTab, sourceWarehouseId, originStockMap])

  // Reset lazy load chunk limit when search or filter changes
  React.useEffect(() => {
    setVisibleLimit(CHUNK_SIZE)
    setActiveIndex(-1)
  }, [searchQuery, filterTab, open])

  // Auto-focus search input when popover opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [open])

  // Lazy slice
  const displayedVariants = React.useMemo(() => {
    return filteredVariants.slice(0, visibleLimit)
  }, [filteredVariants, visibleLimit])

  // TanStack Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: displayedVariants.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 6,
    initialRect: { width: 560, height: 360 },
  })

  // Handle scroll lazy loading
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollTop + clientHeight >= scrollHeight - 80) {
      if (visibleLimit < filteredVariants.length) {
        setVisibleLimit((prev) =>
          Math.min(prev + CHUNK_SIZE, filteredVariants.length)
        )
      }
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        setActiveIndex((prev) => {
          const next = prev < displayedVariants.length - 1 ? prev + 1 : 0
          return next
        })
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        setActiveIndex((prev) => {
          const next = prev > 0 ? prev - 1 : displayedVariants.length - 1
          return next
        })
        break
      }
      case 'Enter': {
        e.preventDefault()
        if (activeIndex >= 0 && displayedVariants[activeIndex]) {
          handleSelect(displayedVariants[activeIndex])
        }
        break
      }
      case 'Escape': {
        e.preventDefault()
        setOpen(false)
        break
      }
    }
  }

  // Scroll active item into view
  React.useEffect(() => {
    if (activeIndex >= 0 && rowVirtualizer) {
      rowVirtualizer.scrollToIndex(activeIndex, { align: 'auto' })
    }
  }, [activeIndex, rowVirtualizer])

  const handleSelect = (variant: StockTransferProductVariant) => {
    onChange(variant)
    setOpen(false)
    setSearchQuery('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setSearchQuery('')
  }

  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <div className={cn('relative w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            role='combobox'
            aria-expanded={open}
            aria-label={ariaLabel || t('stockTransfers.combobox.ariaSelectProductVariant', 'Select product variant')}
            disabled={disabled}
            onKeyDown={handleKeyDown}
            className={cn(
              'h-10 w-full justify-between rounded-lg px-3 text-left font-normal transition-colors',
              !selectedVariant && 'text-muted-foreground',
              open && 'border-primary ring-2 ring-primary/40'
            )}
          >
            <div className='flex items-center gap-2 truncate'>
              <Package className='h-4 w-4 shrink-0 text-primary/80' />
              {selectedVariant ? (
                <div className='flex items-center gap-2 truncate'>
                  <Badge
                    variant='secondary'
                    className='h-5 px-1.5 py-0 font-mono text-[11px]'
                  >
                    {selectedVariant.sku}
                  </Badge>
                  <span className='truncate font-medium text-foreground'>
                    {selectedVariant.name}
                  </span>
                  {selectedVariant.brand && (
                    <span className='hidden text-xs text-muted-foreground sm:inline'>
                      • {selectedVariant.brand}
                    </span>
                  )}
                </div>
              ) : (
                <span className='truncate text-muted-foreground'>
                  {placeholder ||
                    t('stockTransfers.createDialog.selectProductVariant', {
                      defaultValue:
                        'Search & select product by SKU, name, barcode...',
                    })}
                </span>
              )}
            </div>

            <div className='flex shrink-0 items-center gap-1.5'>
              {selectedVariant && !disabled && (
                <span
                  role='button'
                  tabIndex={0}
                  onClick={handleClear}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ')
                      handleClear(e as unknown as React.MouseEvent)
                  }}
                  className='rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground'
                >
                  <X className='h-3.5 w-3.5' />
                </span>
              )}
              <ChevronsUpDown className='h-4 w-4 text-muted-foreground' />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className='w-[94vw] p-0 shadow-2xl sm:w-[540px]'
          align='start'
          sideOffset={6}
        >
          {/* Search Header */}
          <div className='space-y-2 border-b bg-muted/20 p-2.5'>
            <div className='relative flex items-center'>
              <Search className='absolute left-3 h-4 w-4 text-muted-foreground' />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t(
                  'stockTransfers.createDialog.searchPlaceholder',
                  {
                    defaultValue:
                      'Search SKU, name, barcode, brand, category...',
                  }
                )}
                className='h-9 bg-background pr-8 pl-9 text-xs sm:text-sm'
              />
              {searchQuery && (
                <button
                  type='button'
                  onClick={() => setSearchQuery('')}
                  className='absolute right-2.5 rounded-sm p-0.5 text-muted-foreground hover:text-foreground'
                >
                  <X className='h-3.5 w-3.5' />
                </button>
              )}
            </div>

            {/* Quick Filter Tabs */}
            {sourceWarehouseId && (
              <div className='flex items-center justify-between gap-2 pt-0.5'>
                <Tabs
                  value={filterTab}
                  onValueChange={(val) =>
                    setFilterTab(val as 'all' | 'in_stock' | 'out_of_stock')
                  }
                  className='w-full'
                >
                  <TabsList className='grid h-7 w-full grid-cols-3 text-[11px]'>
                    <TabsTrigger value='all' className='h-6 text-[11px]'>
                      {t('stockTransfers.combobox.filterAll', { count: variants.length, defaultValue: `All (${variants.length})` })}
                    </TabsTrigger>
                    <TabsTrigger
                      value='in_stock'
                      className='h-6 text-[11px] text-emerald-600 dark:text-emerald-400'
                    >
                      {t('stockTransfers.combobox.inStock', 'In Stock')}
                    </TabsTrigger>
                    <TabsTrigger
                      value='out_of_stock'
                      className='h-6 text-[11px] text-amber-600 dark:text-amber-400'
                    >
                      {t('stockTransfers.combobox.outOfStock', 'Out of Stock')}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}
          </div>

          {/* Virtual List Container */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className='max-h-[380px] overflow-x-hidden overflow-y-auto p-1.5'
          >
            {isLoading ? (
              <div className='flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground'>
                <Loader2 className='h-6 w-6 animate-spin text-primary' />
                <span className='text-xs'>
                  {t('stockTransfers.combobox.loadingProducts', 'Loading catalog products...')}
                </span>
              </div>
            ) : filteredVariants.length === 0 ? (
              <div className='flex h-36 flex-col items-center justify-center gap-1.5 p-4 text-center text-muted-foreground'>
                <Package className='h-8 w-8 text-muted-foreground/50' />
                <p className='text-xs font-medium text-foreground'>
                  {searchQuery
                    ? t('stockTransfers.combobox.noProductsMatching', { query: searchQuery, defaultValue: `No products matching "${searchQuery}"` })
                    : t('stockTransfers.combobox.noVariantsFound', 'No product variants found')}
                </p>
                <p className='text-[11px] text-muted-foreground'>
                  {t('stockTransfers.combobox.tryAdjusting', 'Try adjusting your search terms or filter selection.')}
                </p>
              </div>
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {(virtualItems.length > 0
                  ? virtualItems
                  : displayedVariants.map((_, i) => ({
                      index: i,
                      start: i * ITEM_HEIGHT,
                      size: ITEM_HEIGHT,
                    }))
                ).map((virtualRow) => {
                  const variant = displayedVariants[virtualRow.index]
                  if (!variant) return null

                  const isSelected = selectedVariant?.id === variant.id
                  const isHighlighted = activeIndex === virtualRow.index
                  const onHand = sourceWarehouseId
                    ? (originStockMap[variant.id] ?? 0)
                    : null
                  const isOutOfStock = onHand !== null && onHand <= 0

                  return (
                    <div
                      key={variant.id}
                      onClick={() => handleSelect(variant)}
                      onMouseEnter={() => setActiveIndex(virtualRow.index)}
                      className={cn(
                        'absolute top-0 left-0 w-full cursor-pointer rounded-lg border p-2.5 text-xs transition-all',
                        isSelected
                          ? 'border-primary/50 bg-primary/10 text-primary-foreground'
                          : isHighlighted
                            ? 'border-muted bg-muted/60'
                            : 'border-transparent hover:bg-muted/40',
                        isOutOfStock && !isSelected && 'bg-amber-500/5'
                      )}
                      style={{
                        transform: `translateY(${virtualRow.start}px)`,
                        height: `${virtualRow.size - 4}px`,
                      }}
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <div className='flex min-w-0 flex-1 flex-col gap-1'>
                          {/* Top Row: SKU, Brand, Category */}
                          <div className='flex flex-wrap items-center gap-1.5'>
                            <Badge
                              variant='outline'
                              className='h-4 bg-muted/30 px-1 py-0 font-mono text-[10px]'
                            >
                              {variant.sku}
                            </Badge>
                            {variant.brand && (
                              <span className='inline-flex items-center gap-0.5 text-[10px] text-muted-foreground'>
                                <Tag className='h-2.5 w-2.5' />
                                {variant.brand}
                              </span>
                            )}
                            {variant.category && (
                              <Badge
                                variant='secondary'
                                className='h-4 px-1 py-0 text-[10px]'
                              >
                                {variant.category}
                              </Badge>
                            )}
                            {variant.barcode && (
                              <span className='hidden font-mono text-[10px] text-muted-foreground/70 sm:inline'>
                                #{variant.barcode}
                              </span>
                            )}
                          </div>

                          {/* Product Name */}
                          <p className='truncate text-xs font-semibold text-foreground sm:text-sm'>
                            {variant.name}
                          </p>

                          {/* Attributes & Valuation */}
                          <div className='flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground'>
                            {variant.costPrice > 0 && (
                              <span className='flex items-center gap-0.5 text-foreground'>
                                <DollarSign className='h-3 w-3 text-muted-foreground' />
                                {t('stockTransfers.combobox.cost', 'Cost:')}{' '}
                                <strong className='font-medium'>
                                  ${variant.costPrice.toFixed(2)}
                                </strong>
                              </span>
                            )}
                            {variant.listPrice > 0 && (
                              <span className='flex items-center gap-0.5 text-muted-foreground'>
                                {t('stockTransfers.combobox.list', 'List:')} ${variant.listPrice.toFixed(2)}
                                {variant.priceListName && (
                                  <span className='text-[10px] text-primary/80'>
                                    ({variant.priceListName})
                                  </span>
                                )}
                              </span>
                            )}
                            {variant.weight > 0 && (
                              <span className='hidden items-center gap-0.5 sm:flex'>
                                <Scale className='h-2.5 w-2.5' />
                                {variant.weight}kg
                              </span>
                            )}
                            <span className='text-[10px] tracking-wider text-muted-foreground/80 uppercase'>
                              {variant.uom}
                            </span>
                          </div>
                        </div>

                        {/* Right: Stock Badge & Selection Check */}
                        <div className='flex shrink-0 flex-col items-end gap-1.5'>
                          {isSelected && (
                            <div className='rounded-full bg-primary p-0.5 text-primary-foreground'>
                              <Check className='h-3.5 w-3.5' />
                            </div>
                          )}

                          {onHand !== null ? (
                            <Badge
                              variant={
                                onHand > 10
                                  ? 'default'
                                  : onHand > 0
                                    ? 'secondary'
                                    : 'destructive'
                              }
                              className={cn(
                                'h-5 px-1.5 py-0 font-mono text-[10px] font-medium',
                                onHand > 10 &&
                                  'bg-emerald-600 text-white hover:bg-emerald-700',
                                onHand > 0 &&
                                  onHand <= 10 &&
                                  'bg-amber-500 text-white hover:bg-amber-600'
                              )}
                            >
                              {onHand > 0 ? (
                                t('stockTransfers.combobox.inOriginCount', { count: onHand, defaultValue: `${onHand} in origin` })
                              ) : (
                                <span className='flex items-center gap-1'>
                                  <AlertTriangle className='h-2.5 w-2.5' />
                                  {t('stockTransfers.combobox.outOfStock', 'Out of Stock')}
                                </span>
                              )}
                            </Badge>
                          ) : (
                            <span className='text-[10px] text-muted-foreground'>
                              {t('stockTransfers.combobox.selectOrigin', 'Select origin')}
                            </span>
                          )}

                          {isOutOfStock && (
                            <span className='flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400'>
                              <Building2 className='h-2.5 w-2.5' />
                              {t('stockTransfers.combobox.otherWarehousesAvailable', 'Other WHs available')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className='flex items-center justify-between border-t bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground'>
            <span>
              {t('stockTransfers.combobox.showingItems', { displayed: displayedVariants.length, total: filteredVariants.length, defaultValue: `Showing ${displayedVariants.length} of ${filteredVariants.length} items` })}
            </span>
            {sourceWarehouseName && (
              <span className='flex items-center gap-1 truncate font-medium text-foreground'>
                <Building2 className='h-3 w-3 text-primary' />
                {t('stockTransfers.combobox.originPrefix', { warehouse: sourceWarehouseName, defaultValue: `Origin: ${sourceWarehouseName}` })}
              </span>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
