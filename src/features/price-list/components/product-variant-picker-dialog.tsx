import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Package,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Barcode,
  Sparkles,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useProductVariantSearch,
  type VariantCostValuation,
} from '../hooks/use-price-list'
import type {
  ProductBrief,
  ProductVariantBrief,
} from '../data/schema'

export interface SelectedVariantItem {
  product: ProductBrief
  variant: ProductVariantBrief & {
    price_list_items?: Array<{ price?: number | string; cost_price?: number | string }>
  }
  valuation?: VariantCostValuation
}

interface ProductVariantPickerContentProps {
  onClose: () => void
  onAddItems: (items: SelectedVariantItem[]) => void
  alreadySelectedVariantIds: Set<string>
}

function ProductVariantPickerContent({
  onClose,
  onAddItems,
  alreadySelectedVariantIds,
}: ProductVariantPickerContentProps) {
  const { t } = useTranslation()

  // Debounced search state
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Selected variants map: variantId -> SelectedVariantItem
  const [selectedMap, setSelectedMap] = useState<Map<string, SelectedVariantItem>>(new Map())

  // Debounce search effect (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
      setPage(1) // Reset to page 1 on new search query
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Query server for products & variants
  const { data, isLoading, isFetching } = useProductVariantSearch({
    search: debouncedSearch,
    page,
    pageSize,
    enabled: true,
  })

  const products = data?.products || []
  const totalCount = data?.totalCount || 0
  const totalPages = data?.totalPages || 1
  const variantCosts = data?.variantCosts || {}

  // Toggle variant selection
  const handleToggleVariant = (
    product: ProductBrief,
    variant: ProductVariantBrief & { price_list_items?: Array<{ price?: number | string; cost_price?: number | string }> },
    valuation?: VariantCostValuation
  ) => {
    if (alreadySelectedVariantIds.has(variant.id)) return

    setSelectedMap((prev) => {
      const next = new Map(prev)
      if (next.has(variant.id)) {
        next.delete(variant.id)
      } else {
        next.set(variant.id, { product, variant, valuation })
      }
      return next
    })
  }

  // Toggle all variants of a product
  const handleToggleAllVariants = (product: ProductBrief) => {
    const variants = (product.product_variants || []) as Array<
      ProductVariantBrief & { price_list_items?: Array<{ price?: number | string; cost_price?: number | string }> }
    >
    const selectableVariants = variants.filter((v) => !alreadySelectedVariantIds.has(v.id))
    if (selectableVariants.length === 0) return

    const allCurrentlySelected = selectableVariants.every((v) => selectedMap.has(v.id))

    setSelectedMap((prev) => {
      const next = new Map(prev)
      if (allCurrentlySelected) {
        selectableVariants.forEach((v) => next.delete(v.id))
      } else {
        selectableVariants.forEach((v) => {
          next.set(v.id, {
            product,
            variant: v,
            valuation: variantCosts[v.id],
          })
        })
      }
      return next
    })
  }

  // Confirm addition
  const handleConfirm = () => {
    const itemsToAdd = Array.from(selectedMap.values())
    if (itemsToAdd.length > 0) {
      onAddItems(itemsToAdd)
    }
    onClose()
  }

  const selectedCount = selectedMap.size

  return (
    <DialogContent className='w-[95vw] max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden'>
      <DialogHeader className='pb-2 border-b'>
        <div className='flex items-center justify-between pr-6'>
          <DialogTitle className='flex items-center gap-2 text-lg sm:text-xl font-semibold'>
            <Package className='h-5 w-5 text-primary' />
            {t('priceList.picker.title', { defaultValue: 'Select Products & Variants' })}
          </DialogTitle>
        </div>
        <DialogDescription className='text-xs sm:text-sm text-muted-foreground'>
          {t('priceList.picker.description', {
            defaultValue:
              'Search products across the catalog on the server and select items or variants to add to your price list.',
          })}
        </DialogDescription>
      </DialogHeader>

      {/* Search Bar & Stats */}
      <div className='py-3 flex flex-wrap items-center justify-between gap-3 border-b'>
        <div className='relative flex-1 min-w-[220px]'>
          <Search className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('priceList.picker.searchPlaceholder', {
              defaultValue: 'Search by product name, SKU, or variant barcode...',
            })}
            className='pl-9 pr-8 text-sm h-9'
          />
          {searchInput && (
            <button
              type='button'
              onClick={() => setSearchInput('')}
              className='absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground'
            >
              <X className='h-4 w-4' />
            </button>
          )}
        </div>

        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
          {isFetching && <Loader2 className='h-3.5 w-3.5 animate-spin text-primary' />}
          <span>
            {totalCount} {t('priceList.picker.totalProducts', { defaultValue: 'products found' })}
          </span>
        </div>
      </div>

      {/* Scrollable Products & Variants List */}
      <div className='flex-1 overflow-y-auto py-3 space-y-3 min-h-[300px]'>
        {isLoading ? (
          <div className='space-y-3'>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className='rounded-lg border p-3 space-y-2'>
                <Skeleton className='h-5 w-1/3' />
                <Skeleton className='h-4 w-1/2' />
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2'>
                  <Skeleton className='h-8 w-full' />
                  <Skeleton className='h-8 w-full' />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className='flex flex-col items-center justify-center p-8 text-center text-muted-foreground border border-dashed rounded-lg'>
            <Package className='h-10 w-10 text-muted-foreground/50 mb-2' />
            <p className='font-medium text-sm'>
              {t('priceList.picker.noResults', {
                defaultValue: 'No products matching your search query.',
              })}
            </p>
            <p className='text-xs mt-1'>
              {t('priceList.picker.tryDifferentSearch', {
                defaultValue: 'Try searching with different keywords, SKU, or barcode.',
              })}
            </p>
          </div>
        ) : (
          products.map((product) => {
            const variants = (product.product_variants || []) as Array<
              ProductVariantBrief & { price_list_items?: Array<{ price?: number | string; cost_price?: number | string }> }
            >
            const selectableVariants = variants.filter(
              (v) => !alreadySelectedVariantIds.has(v.id)
            )
            const allSelected =
              selectableVariants.length > 0 &&
              selectableVariants.every((v) => selectedMap.has(v.id))
            const someSelected =
              selectableVariants.some((v) => selectedMap.has(v.id)) && !allSelected

            return (
              <div
                key={product.id}
                className='rounded-lg border bg-card/60 hover:bg-card/90 transition-colors p-3 space-y-2'
              >
                {/* Product Header */}
                <div className='flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2'>
                  <div className='flex items-center gap-2'>
                    {selectableVariants.length > 0 && (
                      <Checkbox
                        checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                        onCheckedChange={() => handleToggleAllVariants(product)}
                        aria-label={t('priceList.picker.selectAllVariants', {
                          defaultValue: 'Select all variants',
                        })}
                      />
                    )}
                    <div>
                      <span className='font-semibold text-sm text-foreground'>
                        {product.name}
                      </span>
                      <span className='text-xs text-muted-foreground font-mono ml-2'>
                        {product.sku}
                      </span>
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='text-[10px] font-normal'>
                      {variants.length}{' '}
                      {variants.length === 1
                        ? t('priceList.picker.singleVariant', { defaultValue: 'variant' })
                        : t('priceList.picker.multiVariants', { defaultValue: 'variants' })}
                    </Badge>
                    {selectableVariants.length > 1 && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='h-6 px-2 text-[11px] text-primary'
                        onClick={() => handleToggleAllVariants(product)}
                        data-testid={`select-all-${product.id}`}
                      >
                        <Sparkles className='mr-1 h-3 w-3' />
                        {allSelected
                          ? t('common.deselectAll', { defaultValue: 'Deselect All' })
                          : t('priceList.picker.selectAll', { defaultValue: 'Select All' })}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Variants List / Grid */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1'>
                  {variants.map((v) => {
                    const isAlreadyInList = alreadySelectedVariantIds.has(v.id)
                    const isSelected = selectedMap.has(v.id)
                    const valuation = variantCosts[v.id]
                    const refPrice =
                      Number(v.price_list_items?.[0]?.price) || 0
                    const refCost =
                      valuation?.lastPurchaseCost ||
                      valuation?.averageCost ||
                      Number(v.price_list_items?.[0]?.cost_price) ||
                      0

                    return (
                      <div
                        key={v.id}
                        data-testid={`variant-item-${v.id}`}
                        onClick={() => {
                          if (!isAlreadyInList) {
                            handleToggleVariant(product, v, valuation)
                          }
                        }}
                        className={`flex items-start justify-between gap-2 p-2.5 rounded-md border text-xs cursor-pointer transition-all ${
                          isAlreadyInList
                            ? 'bg-muted/40 border-muted opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'border-primary bg-primary/5 shadow-xs'
                            : 'hover:border-primary/40 bg-background'
                        }`}
                      >
                        <div className='flex items-start gap-2 flex-1 min-w-0'>
                          <Checkbox
                            checked={isSelected}
                            disabled={isAlreadyInList}
                            onCheckedChange={() => handleToggleVariant(product, v, valuation)}
                            data-testid={`variant-checkbox-${v.id}`}
                            className='mt-0.5'
                          />
                          <div className='flex flex-col truncate'>
                            <div className='flex items-center gap-1.5'>
                              <span className='font-medium truncate'>
                                {v.name || t('priceList.types.standard', { defaultValue: 'Standard' })}
                              </span>
                              {isAlreadyInList && (
                                <Badge
                                  variant='secondary'
                                  className='text-[9px] px-1 py-0 bg-muted text-muted-foreground'
                                >
                                  {t('priceList.picker.alreadyInList', {
                                    defaultValue: 'In Price List',
                                  })}
                                </Badge>
                              )}
                            </div>
                            <div className='flex items-center gap-2 text-[10px] text-muted-foreground font-mono mt-0.5'>
                              <span>{v.sku}</span>
                              {v.barcode && (
                                <span className='flex items-center gap-0.5'>
                                  <Barcode className='h-2.5 w-2.5' />
                                  {v.barcode}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className='flex flex-col items-end text-right whitespace-nowrap text-[11px] font-mono'>
                          {refPrice > 0 && (
                            <span className='text-foreground font-semibold'>
                              ${refPrice.toFixed(2)}
                            </span>
                          )}
                          {refCost > 0 && (
                            <span className='text-[10px] text-muted-foreground'>
                              {t('priceList.picker.costLabel', { defaultValue: 'Cost' })}: $
                              {refCost.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Server Pagination Controls */}
      <div className='pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs'>
        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground'>
            {t('dataTable.rowsPerPage', { defaultValue: 'Rows per page' })}:
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => {
              setPageSize(Number(val))
              setPage(1)
            }}
          >
            <SelectTrigger className='h-7 w-[65px] text-xs'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='5'>5</SelectItem>
              <SelectItem value='10'>10</SelectItem>
              <SelectItem value='20'>20</SelectItem>
              <SelectItem value='50'>50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground'>
            {t('dataTable.pageOf', {
              page,
              total: totalPages,
              defaultValue: `Page ${page} of ${totalPages}`,
            })}
          </span>
          <div className='flex items-center gap-1'>
            <Button
              type='button'
              variant='outline'
              size='icon'
              className='h-7 w-7'
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
            >
              <ChevronLeft className='h-3.5 w-3.5' />
            </Button>
            <Button
              type='button'
              variant='outline'
              size='icon'
              className='h-7 w-7'
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
            >
              <ChevronRight className='h-3.5 w-3.5' />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Footer Actions */}
      <DialogFooter className='pt-3 border-t flex-col-reverse sm:flex-row gap-2 sm:justify-end'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onClose}
        >
          {t('common.cancel', { defaultValue: 'Cancel' })}
        </Button>

        <Button
          type='button'
          size='sm'
          disabled={selectedCount === 0}
          onClick={handleConfirm}
          className='gap-1.5'
          data-testid='add-selected-items-btn'
        >
          <Plus className='h-3.5 w-3.5' />
          {t('priceList.picker.addSelectedItems', {
            count: selectedCount,
            defaultValue: `Add ${selectedCount} Item(s)`,
          })}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

interface ProductVariantPickerDialogProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
  onAddItems: (items: SelectedVariantItem[]) => void
  alreadySelectedVariantIds?: Set<string>
  existingVariantIds?: Set<string>
}

export function ProductVariantPickerDialog({
  open,
  onOpenChange,
  onClose,
  onAddItems,
  alreadySelectedVariantIds: propAlreadySelectedVariantIds,
  existingVariantIds: propExistingVariantIds,
}: ProductVariantPickerDialogProps) {
  const handleClose = () => {
    if (onOpenChange) onOpenChange(false)
    if (onClose) onClose()
  }

  const effectiveVariantIds =
    propAlreadySelectedVariantIds || propExistingVariantIds || new Set<string>()

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      {open && (
        <ProductVariantPickerContent
          onClose={handleClose}
          onAddItems={onAddItems}
          alreadySelectedVariantIds={effectiveVariantIds}
        />
      )}
    </Dialog>
  )
}
