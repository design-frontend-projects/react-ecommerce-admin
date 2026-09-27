import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronsUpDown, Package, Layers, AlertCircle, Box, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type Product } from '@/features/products/data/schema'
import {
  usePOProductSearch,
  usePOVariants,
  usePOProduct,
  usePOVariantSearch,
  useSinglePOVariant,
  useDebounce,
  type POProductOption,
  type VariantOption,
  type POVariantSearchItem,
} from '../hooks/use-po-product-search'

export type { VariantOption, POProductOption, POVariantSearchItem }

export interface POProductSelectProps {
  productId: string | number | null
  /** Optional static products (used in tests / PR dialog) */
  products?: Product[] | POProductOption[] | undefined
  /** Optional static variants map (used in tests / PR dialog) */
  variantsByProductId?: Map<string, VariantOption[]> | Map<number, VariantOption[]>
  onSelectProduct: (productId: string, product?: POProductOption) => void
  disabled?: boolean
  showValidation?: boolean
  /** Optional pre-resolved product metadata to display before/without network call */
  selectedProductInfo?: { name?: string; sku?: string | null } | null
}

// ─── 1A. Static Product Dropdown (For tests & legacy static calls) ───
function POProductSelectStatic({
  productId,
  products = [],
  variantsByProductId,
  onSelectProduct,
  disabled,
  showValidation,
  selectedProductInfo,
}: POProductSelectProps & { products: Product[] | POProductOption[] }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const cleanProductId = productId ? String(productId) : ''

  const selectedProduct = useMemo(() => {
    if (selectedProductInfo?.name) {
      return {
        id: cleanProductId,
        name: selectedProductInfo.name,
        sku: selectedProductInfo.sku ?? null,
      }
    }
    return (products as Array<Product | POProductOption>).find((p) => {
      const pId = String(p.id ?? (p as { product_id?: string | number }).product_id ?? '')
      return pId === cleanProductId
    })
  }, [products, cleanProductId, selectedProductInfo])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal h-9 text-xs sm:text-sm px-2.5',
            !productId && 'text-muted-foreground',
            showValidation && !productId && 'border-destructive ring-1 ring-destructive/30'
          )}
        >
          <div className='flex items-center gap-2 truncate'>
            <Package className='h-4 w-4 shrink-0 text-muted-foreground' />
            {selectedProduct ? (
              <span className='truncate font-medium text-foreground'>
                {selectedProduct.name}
                {selectedProduct.sku && (
                  <span className='ml-1.5 font-mono text-xs text-muted-foreground'>
                    ({selectedProduct.sku})
                  </span>
                )}
              </span>
            ) : (
              <span>{t('purchaseOrders.variantPicker.selectProduct', 'Select product...')}</span>
            )}
          </div>
          <ChevronsUpDown className='ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[320px] sm:w-[420px] p-0' align='start'>
        <Command>
          <CommandInput
            placeholder={t(
              'purchaseOrders.variantPicker.searchPlaceholder',
              'Search product by name or SKU...'
            )}
          />
          <CommandList className='max-h-60'>
            <CommandEmpty>
              {t('purchaseOrders.variantPicker.noProductFound', 'No product found.')}
            </CommandEmpty>
            <CommandGroup>
              {(products as Array<Product | POProductOption>).map((p, index) => {
                const pId = String(p.id ?? (p as { product_id?: string | number }).product_id ?? '')
                const isSelected = cleanProductId === pId

                let variantCount = 0
                if (variantsByProductId) {
                  const vList =
                    (variantsByProductId as Map<string, VariantOption[]>).get(pId) ??
                    (variantsByProductId as Map<number, VariantOption[]>).get(Number(pId)) ??
                    []
                  variantCount = vList.length
                } else if (p.product_variants) {
                  variantCount = p.product_variants.length
                }

                return (
                  <CommandItem
                    key={pId || p.sku || `product-${index}`}
                    value={`${p.name} ${p.sku || ''} ${pId}`}
                    onSelect={() => {
                      onSelectProduct(pId, p as POProductOption)
                      setOpen(false)
                    }}
                    className='flex items-center justify-between py-2 cursor-pointer'
                  >
                    <div className='flex items-center gap-2 truncate pr-2'>
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className='flex flex-col truncate'>
                        <span className='text-sm font-medium truncate'>{p.name}</span>
                        <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                          {p.sku && (
                            <span className='font-mono font-normal'>{p.sku}</span>
                          )}
                          {p.categories?.name && (
                            <>
                              <span>•</span>
                              <span>{p.categories.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className='shrink-0 text-right'>
                      {variantCount === 0 ? (
                        <Badge variant='outline' className='text-[10px] text-muted-foreground'>
                          {t('purchaseOrders.variantPicker.zeroVariants', '0 variants')}
                        </Badge>
                      ) : variantCount === 1 ? (
                        <Badge variant='secondary' className='text-[10px]'>
                          {t('purchaseOrders.variantPicker.oneVariant', '1 variant')}
                        </Badge>
                      ) : (
                        <Badge variant='outline' className='text-[10px] text-primary border-primary/30'>
                          {t('purchaseOrders.variantPicker.countVariants', '{{count}} variants', {
                            count: variantCount,
                          })}
                        </Badge>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─── 1B. Server-Driven Product Dropdown (Server Search + Infinite Scroll) ──
function POProductSelectServer({
  productId,
  onSelectProduct,
  disabled,
  showValidation,
  selectedProductInfo,
}: POProductSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)

  const {
    products,
    totalCount,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
  } = usePOProductSearch(debouncedSearch, 25, { enabled: open })

  const cleanProductId = productId ? String(productId) : ''
  const { data: fetchedSelectedProduct } = usePOProduct(
    cleanProductId ? cleanProductId : null,
    { enabled: Boolean(cleanProductId) && !selectedProductInfo?.name }
  )

  const selectedProduct = useMemo(() => {
    if (selectedProductInfo?.name) {
      return {
        id: cleanProductId,
        name: selectedProductInfo.name,
        sku: selectedProductInfo.sku ?? null,
      }
    }
    const inLoaded = products.find((p) => p.id === cleanProductId)
    if (inLoaded) return inLoaded
    if (fetchedSelectedProduct) return fetchedSelectedProduct
    return null
  }, [selectedProductInfo, products, cleanProductId, fetchedSelectedProduct])

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || !open) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    const el = sentinelRef.current
    if (el) observer.observe(el)

    return () => {
      if (el) observer.unobserve(el)
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, open])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasNextPage || isFetchingNextPage) return
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop - clientHeight < 60) {
      fetchNextPage()
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal h-9 text-xs sm:text-sm px-2.5',
            !productId && 'text-muted-foreground',
            showValidation && !productId && 'border-destructive ring-1 ring-destructive/30'
          )}
        >
          <div className='flex items-center gap-2 truncate'>
            <Package className='h-4 w-4 shrink-0 text-muted-foreground' />
            {selectedProduct ? (
              <span className='truncate font-medium text-foreground'>
                {selectedProduct.name}
                {selectedProduct.sku && (
                  <span className='ml-1.5 font-mono text-xs text-muted-foreground'>
                    ({selectedProduct.sku})
                  </span>
                )}
              </span>
            ) : (
              <span>{t('purchaseOrders.variantPicker.selectProduct', 'Select product...')}</span>
            )}
          </div>
          <ChevronsUpDown className='ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[320px] sm:w-[420px] p-0' align='start'>
        <Command shouldFilter={false}>
          <div className='relative'>
            <CommandInput
              value={searchInput}
              onValueChange={setSearchInput}
              placeholder={t(
                'purchaseOrders.variantPicker.searchPlaceholder',
                'Search product by name or SKU...'
              )}
            />
            {isFetching && !isFetchingNextPage && (
              <div className='absolute right-2.5 top-1/2 -translate-y-1/2'>
                <Loader2 className='h-3.5 w-3.5 animate-spin text-muted-foreground' />
              </div>
            )}
          </div>

          <CommandList className='max-h-64' onScroll={handleScroll}>
            {isLoading && products.length === 0 ? (
              <div className='flex items-center justify-center p-6 text-xs text-muted-foreground gap-2'>
                <Loader2 className='h-4 w-4 animate-spin text-primary' />
                <span>{t('common.loading', 'Loading products...')}</span>
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {t('purchaseOrders.variantPicker.noProductFound', 'No product found.')}
                </CommandEmpty>

                <CommandGroup>
                  {totalCount > 0 && (
                    <div className='px-2.5 py-1 text-[10px] text-muted-foreground font-mono bg-muted/30 border-b flex items-center justify-between'>
                      <span>
                        {t('common.showingResults', 'Showing {{current}} of {{total}}', {
                          current: products.length,
                          total: totalCount,
                        })}
                      </span>
                      {debouncedSearch && (
                        <Badge variant='outline' className='text-[9px] h-4 py-0 px-1'>
                          {t('common.filtered', 'Filtered')}
                        </Badge>
                      )}
                    </div>
                  )}

                  {products.map((p) => {
                    const isSelected = cleanProductId === p.id
                    const variantCount = p.product_variants ? p.product_variants.length : 0

                    return (
                      <CommandItem
                        key={p.id}
                        value={`${p.name} ${p.sku || ''} ${p.id}`}
                        onSelect={() => {
                          onSelectProduct(p.id, p)
                          setOpen(false)
                        }}
                        className='flex items-center justify-between py-2 cursor-pointer'
                      >
                        <div className='flex items-center gap-2 truncate pr-2'>
                          <Check
                            className={cn(
                              'h-4 w-4 shrink-0',
                              isSelected ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className='flex flex-col truncate'>
                            <span className='text-sm font-medium truncate'>{p.name}</span>
                            <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                              {p.sku && (
                                <span className='font-mono font-normal'>{p.sku}</span>
                              )}
                              {p.categories?.name && (
                                <>
                                  <span>•</span>
                                  <span>{p.categories.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className='shrink-0 text-right'>
                          {variantCount === 0 ? (
                            <Badge variant='outline' className='text-[10px] text-muted-foreground'>
                              {t('purchaseOrders.variantPicker.zeroVariants', '0 variants')}
                            </Badge>
                          ) : variantCount === 1 ? (
                            <Badge variant='secondary' className='text-[10px]'>
                              {t('purchaseOrders.variantPicker.oneVariant', '1 variant')}
                            </Badge>
                          ) : (
                            <Badge variant='outline' className='text-[10px] text-primary border-primary/30'>
                              {t('purchaseOrders.variantPicker.countVariants', '{{count}} variants', {
                                count: variantCount,
                              })}
                            </Badge>
                          )}
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>

                {hasNextPage && (
                  <div
                    ref={sentinelRef}
                    className='py-2 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5'
                  >
                    <Loader2 className='h-3 w-3 animate-spin text-primary' />
                    <span>{t('common.loadingMore', 'Loading more products...')}</span>
                  </div>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─── 1C. Public POProductSelect Facade ─────────────────────────
export function POProductSelect(props: POProductSelectProps) {
  if (props.products && props.products.length > 0) {
    return <POProductSelectStatic {...props} products={props.products} />
  }
  return <POProductSelectServer {...props} />
}

// ─── 2A. Static Variant Dropdown (For tests & legacy static calls) ───
export interface POVariantSelectProps {
  productId: string | number | null
  variantId: string | null
  /** Optional static variants (used in tests / PR dialog) */
  variants?: VariantOption[]
  onSelectVariant: (variantId: string, costPrice: number, variant?: VariantOption) => void
  disabled?: boolean
  showValidation?: boolean
  /** Auto select if there is only 1 variant (default: true) */
  autoSelectSingle?: boolean
  /** Callback when on-demand variants finish loading */
  onVariantsLoaded?: (variants: VariantOption[]) => void
}

function POVariantSelectStatic({
  productId,
  variantId,
  variants = [],
  onSelectVariant,
  disabled,
  showValidation,
}: POVariantSelectProps & { variants: VariantOption[] }) {
  const { t } = useTranslation()
  const cleanProdId = productId ? String(productId) : ''
  const hasNoProduct = !cleanProdId || cleanProdId === '0'
  const selectedVariant = variants.find((v) => v.id === variantId)
  const hasNoVariants = !hasNoProduct && variants.length === 0

  if (hasNoProduct) {
    return (
      <Select disabled>
        <SelectTrigger className='h-9 text-xs w-full bg-muted/30 text-muted-foreground cursor-not-allowed'>
          <div className='flex items-center gap-1.5 truncate'>
            <Layers className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
            <span>{t('purchaseOrders.variantPicker.selectProductFirst', 'Select product first')}</span>
          </div>
        </SelectTrigger>
      </Select>
    )
  }

  if (hasNoVariants) {
    return (
      <div className='flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded h-9 border border-destructive/20'>
        <AlertCircle className='h-3.5 w-3.5 shrink-0' />
        <span className='truncate text-[11px] font-medium'>
          {t('purchaseOrders.variantPicker.noVariantsConfigured', 'No variants configured')}
        </span>
      </div>
    )
  }

  return (
    <Select
      value={variantId ?? ''}
      onValueChange={(val) => {
        const target = variants.find((v) => v.id === val)
        if (target) {
          onSelectVariant(
            target.id,
            Number(target.cost_price ?? target.price ?? 0),
            target
          )
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'h-9 text-xs w-full bg-background',
          showValidation && !variantId && 'border-destructive ring-1 ring-destructive/30'
        )}
      >
        <div className='flex items-center gap-1.5 truncate'>
          <Layers className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
          {selectedVariant ? (
            <span className='truncate font-medium'>
              <span className='font-mono'>{selectedVariant.sku}</span>
              {(selectedVariant.name || selectedVariant.attributes_label) && (
                <span className='text-muted-foreground ml-1'>
                  ({selectedVariant.name || selectedVariant.attributes_label})
                </span>
              )}
            </span>
          ) : (
            <SelectValue placeholder={t('purchaseOrders.variantPicker.selectVariant', 'Select variant...')} />
          )}
        </div>
      </SelectTrigger>
      <SelectContent>
        {variants.map((variant) => (
          <SelectItem
            key={variant.id}
            value={variant.id}
            className='text-xs py-2'
          >
            <div className='flex items-center justify-between gap-3 w-full'>
              <div className='flex items-center gap-2'>
                <span className='font-mono font-medium'>{variant.sku}</span>
                {(variant.name || variant.attributes_label) && (
                  <span className='text-muted-foreground text-xs'>
                    ({variant.name || variant.attributes_label})
                  </span>
                )}
              </div>
              <div className='flex items-center gap-2 text-[11px] text-muted-foreground ml-auto'>
                {variant.stock_quantity !== undefined && (
                  <span className='flex items-center gap-0.5'>
                    <Box className='h-3 w-3' />
                    {t('purchaseOrders.variantPicker.inStock', '{{count}} in stock', {
                      count: variant.stock_quantity,
                    })}
                  </span>
                )}
                <span className='font-medium text-foreground font-mono'>
                  {t('purchaseOrders.variantPicker.cost', 'Cost:')} ${Number(variant.cost_price ?? variant.price ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ─── 2B. Server-Driven Variant Dropdown (On-Demand Fetching) ──
function POVariantSelectServer({
  productId,
  variantId,
  onSelectVariant,
  disabled,
  showValidation,
  autoSelectSingle = true,
  onVariantsLoaded,
}: POVariantSelectProps) {
  const { t } = useTranslation()
  const cleanProdId = productId ? String(productId) : ''
  const hasNoProduct = !cleanProdId || cleanProdId === '0'

  const { data: fetchedVariants, isLoading } = usePOVariants(
    !hasNoProduct ? cleanProdId : null,
    { enabled: !hasNoProduct }
  )

  const resolvedVariants = useMemo(() => fetchedVariants ?? [], [fetchedVariants])

  // Inform parent when variants are loaded
  useEffect(() => {
    if (resolvedVariants.length > 0 && onVariantsLoaded) {
      onVariantsLoaded(resolvedVariants)
    }
  }, [resolvedVariants, onVariantsLoaded])

  // Auto-select if product only has 1 variant
  useEffect(() => {
    if (
      autoSelectSingle &&
      !hasNoProduct &&
      resolvedVariants.length === 1 &&
      !variantId
    ) {
      const single = resolvedVariants[0]
      onSelectVariant(
        single.id,
        Number(single.cost_price ?? single.price ?? 0),
        single
      )
    }
  }, [
    autoSelectSingle,
    hasNoProduct,
    resolvedVariants,
    variantId,
    onSelectVariant,
  ])

  const selectedVariant = resolvedVariants.find((v) => v.id === variantId)
  const hasNoVariants = !hasNoProduct && !isLoading && resolvedVariants.length === 0

  if (hasNoProduct) {
    return (
      <Select disabled>
        <SelectTrigger className='h-9 text-xs w-full bg-muted/30 text-muted-foreground cursor-not-allowed'>
          <div className='flex items-center gap-1.5 truncate'>
            <Layers className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
            <span>{t('purchaseOrders.variantPicker.selectProductFirst', 'Select product first')}</span>
          </div>
        </SelectTrigger>
      </Select>
    )
  }

  if (isLoading) {
    return (
      <div className='flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-2.5 py-1.5 rounded h-9 border'>
        <Loader2 className='h-3.5 w-3.5 animate-spin text-primary' />
        <span className='truncate text-[11px] font-medium'>
          {t('purchaseOrders.variantPicker.loadingVariants', 'Loading variants...')}
        </span>
      </div>
    )
  }

  if (hasNoVariants) {
    return (
      <div className='flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded h-9 border border-destructive/20'>
        <AlertCircle className='h-3.5 w-3.5 shrink-0' />
        <span className='truncate text-[11px] font-medium'>
          {t('purchaseOrders.variantPicker.noVariantsConfigured', 'No variants configured')}
        </span>
      </div>
    )
  }

  return (
    <Select
      value={variantId ?? ''}
      onValueChange={(val) => {
        const target = resolvedVariants.find((v) => v.id === val)
        if (target) {
          onSelectVariant(
            target.id,
            Number(target.cost_price ?? target.price ?? 0),
            target
          )
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'h-9 text-xs w-full bg-background',
          showValidation && !variantId && 'border-destructive ring-1 ring-destructive/30'
        )}
      >
        <div className='flex items-center gap-1.5 truncate'>
          <Layers className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
          {selectedVariant ? (
            <span className='truncate font-medium'>
              <span className='font-mono'>{selectedVariant.sku}</span>
              {(selectedVariant.name || selectedVariant.attributes_label) && (
                <span className='text-muted-foreground ml-1'>
                  ({selectedVariant.name || selectedVariant.attributes_label})
                </span>
              )}
            </span>
          ) : (
            <SelectValue placeholder={t('purchaseOrders.variantPicker.selectVariant', 'Select variant...')} />
          )}
        </div>
      </SelectTrigger>
      <SelectContent>
        {resolvedVariants.map((variant) => (
          <SelectItem
            key={variant.id}
            value={variant.id}
            className='text-xs py-2'
          >
            <div className='flex items-center justify-between gap-3 w-full'>
              <div className='flex items-center gap-2'>
                <span className='font-mono font-medium'>{variant.sku}</span>
                {(variant.name || variant.attributes_label) && (
                  <span className='text-muted-foreground text-xs'>
                    ({variant.name || variant.attributes_label})
                  </span>
                )}
              </div>
              <div className='flex items-center gap-2 text-[11px] text-muted-foreground ml-auto'>
                {variant.stock_quantity !== undefined && (
                  <span className='flex items-center gap-0.5'>
                    <Box className='h-3 w-3' />
                    {t('purchaseOrders.variantPicker.inStock', '{{count}} in stock', {
                      count: variant.stock_quantity,
                    })}
                  </span>
                )}
                <span className='font-medium text-foreground font-mono'>
                  {t('purchaseOrders.variantPicker.cost', 'Cost:')} ${Number(variant.cost_price ?? variant.price ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ─── 2C. Public POVariantSelect Facade ─────────────────────────
export function POVariantSelect(props: POVariantSelectProps) {
  if (props.variants !== undefined) {
    return <POVariantSelectStatic {...props} variants={props.variants} />
  }
  return <POVariantSelectServer {...props} />
}

// ─── 3. Legacy / Combined Component (For Backward Compatibility) ───
export interface POProductVariantPickerProps {
  productId: string | number
  variantId: string | null
  products?: Product[] | POProductOption[] | undefined
  variantsByProductId?: Map<string, VariantOption[]> | Map<number, VariantOption[]>
  onSelectProduct: (productId: string | number, product?: POProductOption) => void
  onSelectVariant: (variantId: string, costPrice: number, variant?: VariantOption) => void
  showValidation?: boolean
  disabled?: boolean
}

export function POProductVariantPicker({
  productId,
  variantId,
  products = [],
  variantsByProductId,
  onSelectProduct,
  onSelectVariant,
  showValidation,
  disabled,
}: POProductVariantPickerProps) {
  const { t } = useTranslation()
  const pIdStr = productId ? String(productId) : ''

  const variants =
    (variantsByProductId as Map<string, VariantOption[]> | undefined)?.get(pIdStr) ??
    (variantsByProductId as Map<number, VariantOption[]> | undefined)?.get(Number(productId)) ??
    (productId && variantsByProductId
      ? (variantsByProductId as Map<string | number, VariantOption[]>).get(productId)
      : undefined)

  return (
    <div className='flex flex-col gap-1.5 w-full'>
      <POProductSelect
        productId={productId}
        products={products}
        variantsByProductId={variantsByProductId}
        onSelectProduct={(pId, prod) => {
          onSelectProduct(pId, prod)
          const pVariants =
            (variantsByProductId as Map<string, VariantOption[]> | undefined)?.get(pId) ??
            (variantsByProductId as Map<number, VariantOption[]> | undefined)?.get(Number(pId)) ??
            []
          if (pVariants.length === 1) {
            onSelectVariant(
              pVariants[0].id,
              Number(pVariants[0].cost_price ?? pVariants[0].price ?? 0),
              pVariants[0]
            )
          }
        }}
        disabled={disabled}
        showValidation={showValidation}
      />

      {productId && variants && variants.length === 1 ? (
        <div className='flex flex-wrap items-center gap-2 text-xs bg-muted/50 px-2 py-1 rounded border'>
          <div className='flex items-center gap-1 text-muted-foreground'>
            <Layers className='h-3 w-3 shrink-0' />
            <span>{t('purchaseOrders.variantPicker.variant', 'Variant:')}</span>
          </div>
          <span className='font-mono font-medium text-foreground'>
            {variants[0].sku}
          </span>
          {variants[0].attributes_label && (
            <span className='text-muted-foreground'>
              ({variants[0].attributes_label})
            </span>
          )}
          <span className='text-muted-foreground ml-auto'>
            {t('purchaseOrders.variantPicker.defaultCost', 'Default Cost:')} ${Number(variants[0].cost_price ?? variants[0].price ?? 0).toFixed(2)}
          </span>
        </div>
      ) : productId ? (
        <POVariantSelect
          productId={productId}
          variantId={variantId}
          variants={variants}
          onSelectVariant={onSelectVariant}
          disabled={disabled}
          showValidation={showValidation}
        />
      ) : null}
    </div>
  )
}

// ─── 4. Searchable Direct Variant Autocomplete Component ────────────
export interface POVariantAutocompleteProps {
  variantId: string | null
  selectedVariantInfo?: {
    sku?: string | null
    name?: string | null
    product_name?: string | null
    barcode?: string | null
    cost_price?: number | null
    price?: number | null
  } | null
  onSelectVariant: (variant: POVariantSearchItem) => void
  disabled?: boolean
  showValidation?: boolean
  placeholder?: string
  staticVariants?: POVariantSearchItem[]
}

export function POVariantAutocomplete({
  variantId,
  selectedVariantInfo,
  onSelectVariant,
  disabled,
  showValidation,
  placeholder,
  staticVariants,
}: POVariantAutocompleteProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { data: serverVariants = [], isLoading } = usePOVariantSearch(search, 30, {
    enabled: open && !staticVariants,
  })
  const { data: singleVariant } = useSinglePOVariant(
    !staticVariants && variantId && !selectedVariantInfo?.product_name ? variantId : null
  )

  const activeDisplay = useMemo(() => {
    if (selectedVariantInfo && (selectedVariantInfo.sku || selectedVariantInfo.product_name)) {
      return {
        productName: selectedVariantInfo.product_name || 'Product',
        variantName: selectedVariantInfo.name,
        sku: selectedVariantInfo.sku,
        barcode: selectedVariantInfo.barcode,
      }
    }
    if (singleVariant) {
      return {
        productName: singleVariant.product_name,
        variantName: singleVariant.name,
        sku: singleVariant.sku,
        barcode: singleVariant.barcode,
      }
    }
    if (staticVariants && variantId) {
      const found = staticVariants.find((v) => v.id === variantId)
      if (found) {
        return {
          productName: found.product_name,
          variantName: found.name,
          sku: found.sku,
          barcode: found.barcode,
        }
      }
    }
    return null
  }, [selectedVariantInfo, singleVariant, staticVariants, variantId])

  const displayedList: POVariantSearchItem[] = useMemo(() => {
    if (staticVariants) {
      if (!search.trim()) return staticVariants
      const q = search.toLowerCase()
      return staticVariants.filter(
        (v) =>
          v.sku.toLowerCase().includes(q) ||
          v.product_name.toLowerCase().includes(q) ||
          (v.name && v.name.toLowerCase().includes(q)) ||
          (v.barcode && v.barcode.toLowerCase().includes(q))
      )
    }
    return serverVariants
  }, [staticVariants, serverVariants, search])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal h-9 text-xs sm:text-sm px-2.5 bg-background',
            !variantId && 'text-muted-foreground',
            showValidation && !variantId && 'border-destructive ring-1 ring-destructive/30'
          )}
        >
          <div className='flex items-center gap-2 truncate'>
            <Package className='h-4 w-4 shrink-0 text-muted-foreground' />
            {activeDisplay ? (
              <span className='truncate font-medium text-foreground'>
                <span>{activeDisplay.productName}</span>
                {activeDisplay.variantName && (
                  <span className='text-muted-foreground font-normal ml-1'>
                    ({activeDisplay.variantName})
                  </span>
                )}
                {activeDisplay.sku && (
                  <span className='ml-1.5 font-mono text-xs text-muted-foreground'>
                    [{activeDisplay.sku}]
                  </span>
                )}
              </span>
            ) : (
              <span className='truncate'>
                {placeholder ||
                  t(
                    'purchaseOrders.variantPicker.searchVariantPlaceholder',
                    'Search variant (SKU, name, barcode)...'
                  )}
              </span>
            )}
          </div>
          <ChevronsUpDown className='ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[350px] sm:w-[500px] p-0' align='start'>
        <Command shouldFilter={Boolean(staticVariants)}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={t(
              'purchaseOrders.variantPicker.searchVariantInput',
              'Type SKU, variant name, barcode, product...'
            )}
          />
          <CommandList className='max-h-72'>
            {isLoading && (
              <div className='flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground'>
                <Loader2 className='h-4 w-4 animate-spin text-primary' />
                <span>{t('purchaseOrders.variantPicker.searchingVariants', 'Searching variants...')}</span>
              </div>
            )}
            {!isLoading && displayedList.length === 0 && (
              <CommandEmpty>
                {t('purchaseOrders.variantPicker.noVariantsFound', 'No product variants found.')}
              </CommandEmpty>
            )}
            {!isLoading && displayedList.length > 0 && (
              <CommandGroup>
                {displayedList.map((v) => {
                  const isSelected = v.id === variantId
                  return (
                    <CommandItem
                      key={v.id}
                      value={`${v.product_name} ${v.name || ''} ${v.sku} ${v.barcode || ''} ${v.brand_name || ''} ${v.id}`}
                      onSelect={() => {
                        onSelectVariant(v)
                        setOpen(false)
                      }}
                      className='flex items-start justify-between py-2 cursor-pointer gap-2'
                    >
                      <div className='flex items-start gap-2 truncate'>
                        <Check
                          className={cn(
                            'h-4 w-4 shrink-0 mt-0.5',
                            isSelected ? 'opacity-100 text-primary' : 'opacity-0'
                          )}
                        />
                        <div className='flex flex-col truncate text-left'>
                          <span className='text-xs sm:text-sm font-semibold truncate text-foreground'>
                            {v.product_name}
                            {v.name && (
                              <span className='font-normal text-muted-foreground ml-1.5'>
                                — {v.name}
                              </span>
                            )}
                          </span>
                          <div className='flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono mt-0.5'>
                            <span className='font-bold text-foreground/80 bg-muted/60 px-1 py-0.2 rounded'>
                              SKU: {v.sku}
                            </span>
                            {v.barcode && <span>Barcode: {v.barcode}</span>}
                            {v.brand_name && <span>• {v.brand_name}</span>}
                            {v.category_name && <span>• {v.category_name}</span>}
                          </div>
                        </div>
                      </div>
                      <div className='flex flex-col items-end shrink-0 text-right text-[11px] gap-0.5 ml-2'>
                        {v.cost_price != null && (
                          <span className='font-mono font-medium text-foreground'>
                            Cost: ${v.cost_price.toFixed(2)}
                          </span>
                        )}
                        {v.stock_quantity !== undefined && (
                          <span className='text-muted-foreground text-[10px]'>
                            Stock: {v.stock_quantity}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

