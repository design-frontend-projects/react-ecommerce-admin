import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Check,
  ChevronsUpDown,
  Search,
  Warehouse,
  FolderTree,
  Boxes,
  Layers,
  X,
  EyeOff,
  ClipboardList,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWarehouseLocationOptions, useWarehouseOptions, useStoreOptions } from '@/hooks/use-inventory-lookups'
import { useCategories } from '@/features/categories/hooks/use-categories'
import { useProducts } from '@/features/products/hooks/use-products'
import type { Product } from '@/features/products/data/schema'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createCountInputSchema } from '../data/schema'
import { useCreateCount } from '../hooks/use-stock-counts'

const ALL_LOCATIONS = 'all'
type ScopeMode = 'full' | 'category' | 'variants'

export function CountCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()

  // Form State
  const [warehouseId, setWarehouseId] = useState('')
  const [warehouseLocationId, setWarehouseLocationId] = useState(ALL_LOCATIONS)
  const [scopeMode, setScopeMode] = useState<ScopeMode>('full')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [categorySearchOpen, setCategorySearchOpen] = useState(false)
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([])
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all')
  const [isBlind, setIsBlind] = useState(false)
  const [notes, setNotes] = useState('')

  // Lookups
  const { data: warehouses = [] } = useWarehouseOptions()
  const { data: stores = [] } = useStoreOptions()
  const { data: locations = [] } = useWarehouseLocationOptions(warehouseId || undefined)
  const { data: categories = [] } = useCategories()
  const { data: products = [] } = useProducts()
  const createCount = useCreateCount()

  const locationOptions = useMemo(() => {
    if (warehouses.length > 0) {
      return warehouses.map((w) => ({ id: w.id, name: `${w.name} (${w.code})` }))
    }
    return stores.map((s) => ({ id: s.store_id, name: s.name ?? s.store_id }))
  }, [warehouses, stores])

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null
    return categories.find((c) => c.id === selectedCategoryId) ?? null
  }, [categories, selectedCategoryId])

  // Filter products for the Variant Picker
  const filteredProducts = useMemo(() => {
    return products.filter((p: Product) => {
      // Category filter inside product picker
      if (productCategoryFilter !== 'all') {
        const prodCatId = p.category_id || (p as Record<string, unknown>).categoryId
        if (prodCatId !== productCategoryFilter) return false
      }

      // Search query filter (product name, product sku, variant sku, barcode)
      if (productSearchQuery.trim()) {
        const q = productSearchQuery.toLowerCase()
        const matchName = (p.name || '').toLowerCase().includes(q)
        const matchSku = (p.sku || '').toLowerCase().includes(q)
        const matchVariants = (p.product_variants || []).some(
          (v) =>
            (v.sku || '').toLowerCase().includes(q) ||
            (v.barcode || '').toLowerCase().includes(q) ||
            (v.name || '').toLowerCase().includes(q)
        )
        return matchName || matchSku || matchVariants
      }

      return true
    })
  }, [products, productCategoryFilter, productSearchQuery])

  // Count active variants in filtered products
  const allFilteredVariantIds = useMemo(() => {
    const ids: string[] = []
    for (const p of filteredProducts) {
      for (const v of p.product_variants || []) {
        if (v.id) ids.push(v.id)
      }
    }
    return ids
  }, [filteredProducts])

  // Map of variant details for selected chips
  const variantDetailsMap = useMemo(() => {
    const map = new Map<string, { id: string; sku: string; productName: string }>()
    for (const p of products) {
      for (const v of p.product_variants || []) {
        if (v.id) {
          map.set(v.id, {
            id: v.id,
            sku: v.sku,
            productName: p.name,
          })
        }
      }
    }
    return map
  }, [products])

  const toggleVariant = (variantId: string) => {
    setSelectedVariantIds((prev) =>
      prev.includes(variantId)
        ? prev.filter((id) => id !== variantId)
        : [...prev, variantId]
    )
  }

  const toggleProductVariants = (product: Product) => {
    const pVarIds = (product.product_variants || [])
      .map((v) => v.id)
      .filter(Boolean) as string[]
    if (pVarIds.length === 0) return

    const allSelected = pVarIds.every((id) => selectedVariantIds.includes(id))
    if (allSelected) {
      setSelectedVariantIds((prev) => prev.filter((id) => !pVarIds.includes(id)))
    } else {
      setSelectedVariantIds((prev) => Array.from(new Set([...prev, ...pVarIds])))
    }
  }

  const selectAllFilteredVariants = () => {
    setSelectedVariantIds((prev) =>
      Array.from(new Set([...prev, ...allFilteredVariantIds]))
    )
  }

  const deselectAllFilteredVariants = () => {
    setSelectedVariantIds((prev) =>
      prev.filter((id) => !allFilteredVariantIds.includes(id))
    )
  }

  const reset = () => {
    setWarehouseId('')
    setWarehouseLocationId(ALL_LOCATIONS)
    setScopeMode('full')
    setSelectedCategoryId(null)
    setSelectedVariantIds([])
    setProductSearchQuery('')
    setProductCategoryFilter('all')
    setIsBlind(false)
    setNotes('')
  }

  const handleSubmit = async () => {
    if (!warehouseId) {
      toast.error(t('stockCounts.createDialog.warehouseRequired', 'Please select a warehouse or store.'))
      return
    }

    if (scopeMode === 'category' && !selectedCategoryId) {
      toast.error(t('stockCounts.createDialog.categoryRequired', 'Please select a category for category count.'))
      return
    }

    if (scopeMode === 'variants' && selectedVariantIds.length === 0) {
      toast.error(t('stockCounts.createDialog.variantsRequired', 'Please select at least one product variant.'))
      return
    }

    const payload = {
      warehouseId: warehouseId || undefined,
      storeId: warehouseId || undefined,
      warehouseLocationId:
        warehouseLocationId === ALL_LOCATIONS ? undefined : warehouseLocationId,
      categoryId: scopeMode === 'category' ? selectedCategoryId : undefined,
      variantIds: scopeMode === 'variants' ? selectedVariantIds : undefined,
      scopeType: scopeMode,
      isBlind,
      notes: notes || undefined,
    }

    const parsed = createCountInputSchema.safeParse(payload)
    if (!parsed.success) {
      toast.error(t('stockCounts.createDialog.validationError', 'Validation error'), {
        description: parsed.error.issues[0]?.message ?? 'Invalid input.',
      })
      return
    }

    try {
      await createCount.mutateAsync(parsed.data)
      reset()
      onOpenChange(false)
    } catch {
      /* handled by mutation onError toast */
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) reset()
        onOpenChange(value)
      }}
    >
      <DialogContent className='max-h-[92vh] max-w-3xl overflow-y-auto p-4 sm:p-6'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <div className='rounded-lg bg-primary/10 p-2 text-primary'>
              <ClipboardList className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-xl font-bold'>
                {t('stockCounts.createDialog.title', 'New Stock Count')}
              </DialogTitle>
              <DialogDescription className='text-xs'>
                {t(
                  'stockCounts.createDialog.description',
                  'Create a draft audit. Freezing the snapshot captures live inventory quantities for verification.'
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className='grid gap-5 py-2'>
          {/* 1. Facility & Location Scope */}
          <div className='rounded-xl border bg-muted/20 p-4 space-y-3'>
            <div className='flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              <Warehouse className='h-4 w-4 text-primary' />
              {t('stockCounts.createDialog.facilityScope', 'Facility & Location Scope')}
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-medium'>
                  {t('stockCounts.createDialog.warehouseStore', 'Warehouse / Store')} <span className='text-destructive'>*</span>
                </Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger className='h-9 text-xs'>
                    <SelectValue placeholder={t('stockCounts.createDialog.selectWarehouse', 'Select facility...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id} className='text-xs'>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-medium'>
                  {t('stockCounts.createDialog.specificLocation', 'Specific Sub-Location (optional)')}
                </Label>
                <Select
                  value={warehouseLocationId}
                  onValueChange={setWarehouseLocationId}
                  disabled={!warehouseId || locations.length === 0}
                >
                  <SelectTrigger className='h-9 text-xs'>
                    <SelectValue placeholder={t('stockCounts.createDialog.allLocations', 'All warehouse locations')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_LOCATIONS} className='text-xs'>
                      {t('stockCounts.createDialog.allLocations', 'All warehouse locations')}
                    </SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id} className='text-xs'>
                        {loc.code} {loc.name ? `— ${loc.name}` : ''} ({loc.location_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 2. Count Scope Mode Selection */}
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <Label className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                {t('stockCounts.createDialog.scopeModeTitle', 'Select Audit Scope')}
              </Label>
              <Badge variant='outline' className='text-[10px] uppercase font-mono'>
                {scopeMode === 'full'
                  ? t('stockCounts.createDialog.scopeFull', 'Full Facility')
                  : scopeMode === 'category'
                  ? t('stockCounts.createDialog.scopeCategory', 'Category Filtered')
                  : t('stockCounts.createDialog.scopeVariants', 'Targeted Items')}
              </Badge>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-3 gap-2.5'>
              {/* Option A: Full */}
              <div
                onClick={() => setScopeMode('full')}
                className={cn(
                  'cursor-pointer rounded-xl border p-3.5 transition-all text-left flex flex-col justify-between gap-2',
                  scopeMode === 'full'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                    : 'border-border/70 hover:border-muted-foreground/30 hover:bg-muted/30'
                )}
              >
                <div className='flex items-center justify-between'>
                  <div className='rounded-md bg-primary/10 p-2 text-primary'>
                    <Warehouse className='h-4 w-4' />
                  </div>
                  {scopeMode === 'full' && <Check className='h-4 w-4 text-primary' />}
                </div>
                <div>
                  <h4 className='text-xs font-bold'>{t('stockCounts.createDialog.fullFacilityTitle', 'Full Facility')}</h4>
                  <p className='text-[11px] text-muted-foreground mt-0.5'>
                    {t('stockCounts.createDialog.fullFacilityDesc', 'Audit all items & balances across this facility.')}
                  </p>
                </div>
              </div>

              {/* Option B: Category */}
              <div
                onClick={() => setScopeMode('category')}
                className={cn(
                  'cursor-pointer rounded-xl border p-3.5 transition-all text-left flex flex-col justify-between gap-2',
                  scopeMode === 'category'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                    : 'border-border/70 hover:border-muted-foreground/30 hover:bg-muted/30'
                )}
              >
                <div className='flex items-center justify-between'>
                  <div className='rounded-md bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400'>
                    <FolderTree className='h-4 w-4' />
                  </div>
                  {scopeMode === 'category' && <Check className='h-4 w-4 text-primary' />}
                </div>
                <div>
                  <h4 className='text-xs font-bold'>{t('stockCounts.createDialog.byCategoryTitle', 'By Category')}</h4>
                  <p className='text-[11px] text-muted-foreground mt-0.5'>
                    {t('stockCounts.createDialog.byCategoryDesc', 'Filter items by a searchable product category.')}
                  </p>
                </div>
              </div>

              {/* Option C: Variants */}
              <div
                onClick={() => setScopeMode('variants')}
                className={cn(
                  'cursor-pointer rounded-xl border p-3.5 transition-all text-left flex flex-col justify-between gap-2',
                  scopeMode === 'variants'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                    : 'border-border/70 hover:border-muted-foreground/30 hover:bg-muted/30'
                )}
              >
                <div className='flex items-center justify-between'>
                  <div className='rounded-md bg-teal-500/10 p-2 text-teal-600 dark:text-teal-400'>
                    <Boxes className='h-4 w-4' />
                  </div>
                  {scopeMode === 'variants' && <Check className='h-4 w-4 text-primary' />}
                </div>
                <div>
                  <h4 className='text-xs font-bold'>{t('stockCounts.createDialog.byVariantsTitle', 'Specific Products')}</h4>
                  <p className='text-[11px] text-muted-foreground mt-0.5'>
                    {t('stockCounts.createDialog.byVariantsDesc', 'Select specific products and variants for cycle count.')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Detailed Scope Pickers */}

          {/* Mode: Category Selector */}
          {scopeMode === 'category' && (
            <div className='rounded-xl border bg-background p-4 space-y-3'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-semibold flex items-center gap-1.5'>
                  <FolderTree className='h-4 w-4 text-primary' />
                  {t('stockCounts.createDialog.searchCategoryLabel', 'Search & Select Category')}
                </Label>
                {selectedCategory && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => setSelectedCategoryId(null)}
                    className='h-6 text-[11px] text-muted-foreground hover:text-destructive'
                  >
                    <X className='h-3 w-3 mr-1' />
                    {t('common.clear', 'Clear')}
                  </Button>
                )}
              </div>

              <Popover open={categorySearchOpen} onOpenChange={setCategorySearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type='button'
                    variant='outline'
                    role='combobox'
                    aria-expanded={categorySearchOpen}
                    className='w-full justify-between font-normal h-10 text-xs sm:text-sm px-3'
                  >
                    <div className='flex items-center gap-2 truncate'>
                      <FolderTree className='h-4 w-4 text-muted-foreground shrink-0' />
                      {selectedCategory ? (
                        <span className='font-medium text-foreground truncate'>
                          {selectedCategory.name}
                          {selectedCategory.name_ar && (
                            <span className='ml-1 text-muted-foreground font-normal'>
                              ({selectedCategory.name_ar})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className='text-muted-foreground'>
                          {t('stockCounts.createDialog.selectCategoryPlaceholder', 'Click to search categories (English / Arabic)...')}
                        </span>
                      )}
                    </div>
                    <ChevronsUpDown className='h-4 w-4 opacity-50 shrink-0' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-[340px] sm:w-[460px] p-0' align='start'>
                  <Command>
                    <CommandInput
                      placeholder={t('stockCounts.createDialog.searchCategoryInput', 'Search category name or description...')}
                    />
                    <CommandList className='max-h-60'>
                      <CommandEmpty>{t('stockCounts.createDialog.noCategoryFound', 'No matching categories found.')}</CommandEmpty>
                      <CommandGroup>
                        {categories.map((cat) => {
                          const isSelected = selectedCategoryId === cat.id
                          const productCount = cat._count?.products ?? 0

                          return (
                            <CommandItem
                              key={cat.id}
                              value={`${cat.name} ${cat.name_ar || ''} ${cat.description || ''}`}
                              onSelect={() => {
                                setSelectedCategoryId(cat.id)
                                setCategorySearchOpen(false)
                              }}
                              className='flex items-center justify-between py-2 cursor-pointer'
                            >
                              <div className='flex items-center gap-2 truncate'>
                                <Check
                                  className={cn(
                                    'h-4 w-4 shrink-0 text-primary',
                                    isSelected ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <div className='flex flex-col truncate'>
                                  <span className='text-xs font-medium truncate'>
                                    {cat.name}
                                  </span>
                                  {cat.name_ar && (
                                    <span className='text-[11px] text-muted-foreground truncate'>
                                      {cat.name_ar}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Badge variant='secondary' className='text-[10px] shrink-0 font-normal'>
                                {productCount} {t('stockCounts.createDialog.productsCount', 'products')}
                              </Badge>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {selectedCategory && (
                <div className='flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs'>
                  <Check className='h-4 w-4 text-primary shrink-0' />
                  <div className='truncate'>
                    <span className='font-semibold'>{selectedCategory.name}</span>
                    <span className='text-muted-foreground ml-1.5'>
                      ({selectedCategory._count?.products ?? 0} {t('stockCounts.createDialog.productsIncluded', 'products in scope')})
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode: Products & Variants Multi-Picker */}
          {scopeMode === 'variants' && (
            <div className='rounded-xl border bg-background p-4 space-y-3'>
              <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2'>
                <Label className='text-xs font-semibold flex items-center gap-1.5'>
                  <Boxes className='h-4 w-4 text-primary' />
                  {t('stockCounts.createDialog.selectProductsVariants', 'Filter & Select Products & Variants')}
                </Label>
                <div className='flex items-center gap-1.5'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={selectAllFilteredVariants}
                    disabled={allFilteredVariantIds.length === 0}
                    className='h-7 text-[11px] px-2'
                  >
                    {t('stockCounts.createDialog.selectAll', 'Select All Filtered')}
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={deselectAllFilteredVariants}
                    disabled={selectedVariantIds.length === 0}
                    className='h-7 text-[11px] px-2 text-muted-foreground hover:text-destructive'
                  >
                    {t('common.deselectAll', 'Deselect')}
                  </Button>
                </div>
              </div>

              {/* Search & Category Filter bar */}
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
                <div className='relative sm:col-span-2'>
                  <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
                  <Input
                    placeholder={t('stockCounts.createDialog.searchProductsPlaceholder', 'Search by product name, SKU, or barcode...')}
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className='pl-8 h-8 text-xs'
                  />
                  {productSearchQuery && (
                    <button
                      type='button'
                      onClick={() => setProductSearchQuery('')}
                      className='absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                    >
                      <X className='h-3 w-3' />
                    </button>
                  )}
                </div>

                <div>
                  <Select
                    value={productCategoryFilter}
                    onValueChange={setProductCategoryFilter}
                  >
                    <SelectTrigger className='h-8 text-xs'>
                      <SelectValue placeholder={t('stockCounts.createDialog.allCategories', 'All categories')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all' className='text-xs'>
                        {t('stockCounts.createDialog.allCategories', 'All categories')}
                      </SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className='text-xs'>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Product list scroll area */}
              <ScrollArea className='h-60 rounded-lg border bg-muted/10 p-2'>
                {filteredProducts.length === 0 ? (
                  <div className='flex flex-col items-center justify-center h-40 text-center text-muted-foreground text-xs p-4'>
                    <AlertCircle className='h-6 w-6 mb-1 text-muted-foreground/60' />
                    <p>{t('stockCounts.createDialog.noProductsFound', 'No products match your filter criteria.')}</p>
                  </div>
                ) : (
                  <div className='space-y-2'>
                    {filteredProducts.map((prod: Product) => {
                      const variants = prod.product_variants || []
                      const prodVariantIds = variants.map((v) => v.id).filter(Boolean) as string[]
                      const allSelected =
                        prodVariantIds.length > 0 &&
                        prodVariantIds.every((id) => selectedVariantIds.includes(id))
                      const someSelected =
                        prodVariantIds.some((id) => selectedVariantIds.includes(id)) && !allSelected

                      return (
                        <div
                          key={prod.id || prod.sku}
                          className='rounded-md border bg-card p-2.5 transition-colors hover:border-primary/40'
                        >
                          {/* Product header row */}
                          <div className='flex items-center justify-between pb-1.5 border-b border-muted'>
                            <div className='flex items-center gap-2 truncate pr-2'>
                              <Checkbox
                                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                                onCheckedChange={() => toggleProductVariants(prod)}
                                id={`prod-${prod.id}`}
                              />
                              <label
                                htmlFor={`prod-${prod.id}`}
                                className='text-xs font-semibold text-foreground cursor-pointer truncate'
                              >
                                {prod.name}
                                {prod.sku && (
                                  <span className='font-mono font-normal text-muted-foreground ml-1.5 text-[11px]'>
                                    ({prod.sku})
                                  </span>
                                )}
                              </label>
                            </div>

                            <div className='flex items-center gap-1.5 shrink-0'>
                              {prod.categories?.name && (
                                <Badge variant='outline' className='text-[10px] py-0 px-1.5 font-normal'>
                                  {prod.categories.name}
                                </Badge>
                              )}
                              <span className='text-[11px] text-muted-foreground font-medium'>
                                {variants.length} {t('stockCounts.createDialog.variants', 'variants')}
                              </span>
                            </div>
                          </div>

                          {/* Variant items checklist */}
                          <div className='pt-2 pl-6 grid grid-cols-1 sm:grid-cols-2 gap-1.5'>
                            {variants.map((variant) => {
                              const isVariantSelected = Boolean(
                                variant.id && selectedVariantIds.includes(variant.id)
                              )

                              return (
                                <div
                                  key={variant.id || variant.sku}
                                  onClick={() => variant.id && toggleVariant(variant.id)}
                                  className={cn(
                                    'flex items-center justify-between gap-2 p-1.5 rounded text-xs cursor-pointer border transition-all',
                                    isVariantSelected
                                      ? 'bg-primary/10 border-primary/40 font-medium'
                                      : 'bg-muted/20 border-transparent hover:bg-muted/50'
                                  )}
                                >
                                  <div className='flex items-center gap-2 truncate'>
                                    <Checkbox
                                      checked={isVariantSelected}
                                      onCheckedChange={() => variant.id && toggleVariant(variant.id)}
                                      id={`v-${variant.id}`}
                                      className='h-3.5 w-3.5'
                                    />
                                    <span className='font-mono text-[11px] truncate'>
                                      {variant.sku}
                                    </span>
                                    {variant.name && (
                                      <span className='text-muted-foreground text-[10px] truncate'>
                                        ({variant.name})
                                      </span>
                                    )}
                                  </div>

                                  {variant.barcode && (
                                    <span className='font-mono text-[10px] text-muted-foreground shrink-0'>
                                      {variant.barcode}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Selected items tray */}
              <div className='rounded-lg bg-muted/30 p-2.5 border space-y-1.5'>
                <div className='flex items-center justify-between text-xs'>
                  <span className='font-semibold flex items-center gap-1'>
                    <Layers className='h-3.5 w-3.5 text-primary' />
                    {t('stockCounts.createDialog.selectedVariants', 'Targeted Items:')}{' '}
                    <strong className='text-foreground'>{selectedVariantIds.length}</strong>{' '}
                    {t('stockCounts.createDialog.variants', 'variants')}
                  </span>
                  {selectedVariantIds.length > 0 && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => setSelectedVariantIds([])}
                      className='h-5 text-[10px] text-muted-foreground hover:text-destructive'
                    >
                      {t('stockCounts.createDialog.clearAll', 'Clear All')}
                    </Button>
                  )}
                </div>

                {selectedVariantIds.length > 0 && (
                  <div className='flex flex-wrap gap-1 max-h-20 overflow-y-auto pt-1'>
                    {selectedVariantIds.map((vId) => {
                      const v = variantDetailsMap.get(vId)
                      return (
                        <Badge
                          key={vId}
                          variant='secondary'
                          className='text-[10px] py-0.5 px-2 flex items-center gap-1 font-mono'
                        >
                          <span>{v?.sku ?? vId.slice(0, 8)}</span>
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleVariant(vId)
                            }}
                            className='hover:text-destructive'
                          >
                            <X className='h-3 w-3' />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Count Options & Settings */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {/* Blind Count Card */}
            <div className='flex items-start justify-between rounded-xl border p-3.5 bg-muted/10'>
              <div className='space-y-1 pr-3'>
                <div className='flex items-center gap-1.5 text-xs font-semibold'>
                  <EyeOff className='h-3.5 w-3.5 text-amber-600' />
                  {t('stockCounts.createDialog.blindCount', 'Blind Count')}
                </div>
                <p className='text-[11px] text-muted-foreground'>
                  {t(
                    'stockCounts.createDialog.blindCountHelp',
                    'Hide expected quantities from staff to ensure 100% unbiased physical counting.'
                  )}
                </p>
              </div>
              <Switch checked={isBlind} onCheckedChange={setIsBlind} className='mt-0.5' />
            </div>

            {/* Notes */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium'>{t('stockCounts.createDialog.notes', 'Auditor Notes / Purpose')}</Label>
              <Textarea
                placeholder={t('stockCounts.createDialog.notesPlaceholder', 'e.g. Monthly cycle audit for beverage rack A3...')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className='text-xs'
              />
            </div>
          </div>
        </div>

        <DialogFooter className='pt-2 border-t flex-row items-center justify-between sm:justify-between gap-2'>
          <Button variant='outline' size='sm' onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            size='sm'
            onClick={handleSubmit}
            disabled={createCount.isPending || !warehouseId}
            className='bg-primary px-4'
          >
            {createCount.isPending
              ? t('stockCounts.createDialog.saving', 'Creating Draft...')
              : t('stockCounts.createDialog.createDraft', 'Create Draft Count')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
