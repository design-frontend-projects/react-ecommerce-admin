'use client'

import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Package,
  Search,
  Check,
  ChevronsUpDown,
  X,
  Sparkles,
  Barcode,
  Tag,
  Loader2,
  Lock,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { InventoryProductRelation } from '../data/schema'

export interface InventoryProductVirtualComboboxProps {
  value?: string | null
  onChange: (productId: string | null) => void
  products?: InventoryProductRelation[]
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
  'aria-label'?: string
}

const CHUNK_SIZE = 40
const ITEM_HEIGHT = 68

export function InventoryProductVirtualCombobox({
  value,
  onChange,
  products = [],
  isLoading = false,
  disabled = false,
  placeholder,
  className,
  'aria-label': ariaLabel,
}: InventoryProductVirtualComboboxProps) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [visibleLimit, setVisibleLimit] = React.useState(CHUNK_SIZE)
  const [activeIndex, setActiveIndex] = React.useState<number>(-1)

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Currently selected product
  const selectedProduct = React.useMemo(() => {
    if (!value || value === 'none') return null
    return products.find((p) => p.id === value) || null
  }, [products, value])

  // Filtered products by search term (name, sku, category, brand, barcode)
  const filteredProducts = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return products

    return products.filter((p) => {
      const nameMatch = p.name?.toLowerCase().includes(q)
      const skuMatch = p.sku?.toLowerCase().includes(q)
      const catMatch = p.category?.toLowerCase().includes(q)
      const brandMatch = p.brand?.toLowerCase().includes(q)
      const barcodeMatch = p.barcode?.toLowerCase().includes(q)
      return nameMatch || skuMatch || catMatch || brandMatch || barcodeMatch
    })
  }, [products, searchQuery])

  // Reset lazy load chunk limit when search changes or popover opens
  React.useEffect(() => {
    setVisibleLimit(CHUNK_SIZE)
    setActiveIndex(-1)
  }, [searchQuery, open])

  // Auto-focus search input when popover opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [open])

  // Lazy loaded slice of filtered products for high-performance memory efficiency
  const displayedProducts = React.useMemo(() => {
    return filteredProducts.slice(0, visibleLimit)
  }, [filteredProducts, visibleLimit])

  // Virtualizer for smooth rendering of thousands of items
  const rowVirtualizer = useVirtualizer({
    count: displayedProducts.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 6,
    initialRect: { width: 480, height: 320 },
  })

  // Lazy load more items when scrolling towards the bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollTop + clientHeight >= scrollHeight - 80) {
      if (visibleLimit < filteredProducts.length) {
        setVisibleLimit((prev) => Math.min(prev + CHUNK_SIZE, filteredProducts.length))
      }
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((prev) =>
          prev < displayedProducts.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : displayedProducts.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < displayedProducts.length) {
          const item = displayedProducts[activeIndex]
          onChange(item.id)
          setOpen(false)
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
    }
  }

  // Scroll active keyboard item into view
  React.useEffect(() => {
    if (activeIndex >= 0 && rowVirtualizer) {
      rowVirtualizer.scrollToIndex(activeIndex, { align: 'auto' })
    }
  }, [activeIndex, rowVirtualizer])

  const defaultPlaceholder =
    placeholder ||
    t('inventory.form.selectProduct', 'Select a product from catalog...')

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
            aria-label={ariaLabel || 'Select Product'}
            disabled={disabled || isLoading}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full justify-between font-normal text-start h-auto min-h-[42px] py-2 px-3 text-xs sm:text-sm',
              'transition-all duration-200 border-border/80 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20',
              disabled && 'opacity-70 bg-muted/30 cursor-not-allowed border-dashed',
              !selectedProduct && 'text-muted-foreground'
            )}
          >
            <div className='flex items-center gap-2.5 min-w-0 flex-1 me-2'>
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs',
                  selectedProduct
                    ? 'bg-primary/10 border-primary/20 text-primary'
                    : 'bg-muted border-border/60 text-muted-foreground'
                )}
              >
                {isLoading ? (
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                ) : disabled ? (
                  <Lock className='h-3.5 w-3.5' />
                ) : (
                  <Package className='h-3.5 w-3.5' />
                )}
              </div>

              {isLoading ? (
                <span className='italic text-muted-foreground text-xs'>
                  {t('inventory.form.loadingProducts', 'Loading products...')}
                </span>
              ) : selectedProduct ? (
                <div className='flex items-center gap-2 min-w-0 flex-1 truncate'>
                  <span className='font-semibold text-foreground truncate'>
                    {selectedProduct.name}
                  </span>
                  {selectedProduct.sku && (
                    <Badge
                      variant='outline'
                      className='font-mono text-[10px] px-1.5 py-0 shrink-0 bg-background/80'
                    >
                      {selectedProduct.sku}
                    </Badge>
                  )}
                  {selectedProduct.has_variants && (
                    <Badge
                      variant='secondary'
                      className='text-[9px] px-1 py-0 shrink-0 bg-primary/10 text-primary hidden sm:inline-flex'
                    >
                      <Sparkles className='me-0.5 h-2.5 w-2.5' />
                      Variants
                    </Badge>
                  )}
                </div>
              ) : (
                <span className='truncate text-muted-foreground'>
                  {defaultPlaceholder}
                </span>
              )}
            </div>

            <div className='flex items-center gap-1 shrink-0'>
              {!disabled && selectedProduct && (
                <span
                  role='button'
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      onChange(null)
                    }
                  }}
                  aria-label='Clear selected product'
                  className='rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'
                >
                  <X className='h-3.5 w-3.5' />
                </span>
              )}
              <ChevronsUpDown className='h-4 w-4 opacity-50' />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align='start'
          sideOffset={6}
          className='w-[calc(100vw-2rem)] sm:w-[520px] max-w-[96vw] p-0 shadow-2xl border-border/80 rounded-xl overflow-hidden'
        >
          {/* Search Header */}
          <div className='flex items-center gap-2 border-b bg-muted/20 px-3 py-2'>
            <Search className='h-4 w-4 text-muted-foreground shrink-0' />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(
                'inventory.form.searchProductsPlaceholder',
                'Search products by name, SKU, brand, barcode...'
              )}
              className='h-8 text-xs border-0 shadow-none focus-visible:ring-0 px-1 bg-transparent'
            />
            {searchQuery && (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => setSearchQuery('')}
                className='h-6 w-6 text-muted-foreground hover:text-foreground'
              >
                <X className='h-3.5 w-3.5' />
              </Button>
            )}
            <Badge
              variant='outline'
              className='text-[10px] font-mono text-muted-foreground shrink-0 bg-background/80'
            >
              {filteredProducts.length}
            </Badge>
          </div>

          {/* Virtual List Container */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className='max-h-72 overflow-y-auto overscroll-contain p-1 divide-y divide-border/30'
            tabIndex={0}
            role='listbox'
            aria-label='Catalog Products'
          >
            {isLoading ? (
              <div className='flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground'>
                <Loader2 className='h-5 w-5 animate-spin text-primary mb-2' />
                <span>{t('inventory.form.loadingCatalog', 'Loading product catalog...')}</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className='py-8 px-4 text-center text-xs text-muted-foreground space-y-1.5'>
                <p className='font-medium text-foreground'>
                  {t('inventory.form.noProductsFound', 'No products found')}
                </p>
                {searchQuery ? (
                  <p className='text-[11px]'>
                    No match for &quot;{searchQuery}&quot;. Try a different SKU or name.
                  </p>
                ) : (
                  <p className='text-[11px]'>
                    There are no available catalog products to assign.
                  </p>
                )}
                {searchQuery && (
                  <Button
                    type='button'
                    variant='link'
                    size='sm'
                    onClick={() => setSearchQuery('')}
                    className='text-xs text-primary h-auto p-0 mt-1'
                  >
                    Clear search filter
                  </Button>
                )}
              </div>
            ) : (
              /* Virtualized scrolling area */
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {/* When virtualizer items are ready, render them. If jsdom/test has 0 virtual height, render slice fallback */}
                {(virtualItems.length > 0
                  ? virtualItems
                  : displayedProducts.map((_, i) => ({
                      index: i,
                      start: i * ITEM_HEIGHT,
                      size: ITEM_HEIGHT,
                    }))
                ).map((virtualRow) => {
                  const product = displayedProducts[virtualRow.index]
                  if (!product) return null
                  const isSelected = value === product.id
                  const isHighlighted = activeIndex === virtualRow.index

                  return (
                    <div
                      key={product.id}
                      role='option'
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(product.id)
                        setOpen(false)
                      }}
                      onMouseEnter={() => setActiveIndex(virtualRow.index)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                        height: `${virtualRow.size}px`,
                      }}
                      className={cn(
                        'flex items-center justify-between gap-2.5 px-3 py-2 cursor-pointer transition-colors rounded-lg mx-0.5',
                        isSelected
                          ? 'bg-primary/10 text-primary font-medium'
                          : isHighlighted
                            ? 'bg-accent/80 text-accent-foreground'
                            : 'hover:bg-muted/60 text-foreground'
                      )}
                    >
                      {/* Left: Product identification */}
                      <div className='flex items-center gap-2.5 min-w-0 flex-1 truncate'>
                        <div
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-xs',
                            isSelected
                              ? 'border-primary/40 bg-primary/20 text-primary'
                              : 'border-border/60 bg-muted/40 text-muted-foreground'
                          )}
                        >
                          <Package className='h-4 w-4' />
                        </div>

                        <div className='flex flex-col min-w-0 flex-1 truncate'>
                          <div className='flex items-center gap-1.5 truncate'>
                            <span className='text-xs sm:text-sm font-medium truncate'>
                              {product.name}
                            </span>
                            {product.sku && (
                              <Badge
                                variant='outline'
                                className='font-mono text-[10px] px-1 py-0 shrink-0 bg-background/90'
                              >
                                {product.sku}
                              </Badge>
                            )}
                          </div>

                          <div className='flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5'>
                            {product.category && (
                              <span className='flex items-center gap-0.5 truncate'>
                                <Tag className='h-2.5 w-2.5 text-primary/70 shrink-0' />
                                <span className='truncate'>{product.category}</span>
                              </span>
                            )}
                            {product.brand && (
                              <>
                                <span>•</span>
                                <span className='truncate font-medium text-foreground/80'>
                                  {product.brand}
                                </span>
                              </>
                            )}
                            {product.barcode && (
                              <>
                                <span>•</span>
                                <span className='font-mono flex items-center gap-0.5'>
                                  <Barcode className='h-2.5 w-2.5 shrink-0' />
                                  {product.barcode}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Variants info & selection checkmark */}
                      <div className='flex items-center gap-2 shrink-0'>
                        {product.has_variants ? (
                          <Badge
                            variant='outline'
                            className='text-[9px] px-1.5 py-0 border-primary/30 bg-primary/5 text-primary shrink-0'
                          >
                            <Sparkles className='me-0.5 h-2.5 w-2.5' />
                            Variants
                          </Badge>
                        ) : (
                          <Badge
                            variant='secondary'
                            className='text-[9px] px-1.5 py-0 text-muted-foreground shrink-0 hidden sm:inline-flex'
                          >
                            Single SKU
                          </Badge>
                        )}

                        <div className='w-5 flex justify-center'>
                          {isSelected && (
                            <Check className='h-4 w-4 text-primary shrink-0' />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Bottom Footer Indicator */}
          {filteredProducts.length > 0 && (
            <div className='flex items-center justify-between border-t bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground'>
              <span>
                {displayedProducts.length < filteredProducts.length
                  ? `Showing ${displayedProducts.length} of ${filteredProducts.length} (scroll for more)`
                  : `${filteredProducts.length} product(s)`}
              </span>
              <span className='hidden sm:inline text-[10px] text-muted-foreground/70'>
                ↑↓ Navigate • ↵ Select • Esc Close
              </span>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
export default InventoryProductVirtualCombobox
