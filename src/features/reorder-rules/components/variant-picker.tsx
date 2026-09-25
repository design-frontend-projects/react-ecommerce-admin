import { useState, useMemo, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Package,
  Search,
  Check,
  ChevronsUpDown,
  X,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  useVariantOptions,
  type VariantOption,
} from '@/hooks/use-inventory-lookups'

export interface InitialVariantInfo {
  id: string
  sku: string
  barcode?: string | null
  product_name?: string
  name?: string | null
}

export interface ReorderRuleVariantPickerProps {
  value: string
  onChange: (variantId: string, variant?: VariantOption) => void
  disabled?: boolean
  initialVariant?: InitialVariantInfo | null
  placeholder?: string
  className?: string
  required?: boolean
  'aria-label'?: string
}

export function ReorderRuleVariantPicker({
  value,
  onChange,
  disabled = false,
  initialVariant = null,
  placeholder,
  className,
  required: _required,
  'aria-label': ariaLabel,
}: ReorderRuleVariantPickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isDebouncing, setIsDebouncing] = useState(false)

  const parentRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 300ms debounce for server-side lookup
  useEffect(() => {
    setIsDebouncing(true)
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setIsDebouncing(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data: serverVariants = [], isLoading: isQueryLoading } =
    useVariantOptions(debouncedSearch)
  const isLoading = isDebouncing || isQueryLoading

  // Always keep initialVariant accessible if editing an existing rule
  const variants = useMemo(() => {
    if (!initialVariant) return serverVariants
    if (serverVariants.some((v) => v.id === initialVariant.id)) {
      return serverVariants
    }
    const preserved: VariantOption = {
      id: initialVariant.id,
      sku: initialVariant.sku,
      barcode: initialVariant.barcode ?? null,
      price: 0,
      cost_price: null,
      products: initialVariant.product_name
        ? { id: 'init', name: initialVariant.product_name }
        : null,
    }
    return [preserved, ...serverVariants]
  }, [serverVariants, initialVariant])

  // Current selected option
  const selectedVariant = useMemo(() => {
    if (!value) return null
    const found = variants.find((v) => v.id === value)
    if (found) return found
    if (initialVariant && initialVariant.id === value) {
      return {
        id: initialVariant.id,
        sku: initialVariant.sku,
        barcode: initialVariant.barcode ?? null,
        price: 0,
        cost_price: null,
        products: initialVariant.product_name
          ? { id: 'init', name: initialVariant.product_name }
          : null,
      } as VariantOption
    }
    return null
  }, [variants, value, initialVariant])

  // Virtualizer for 60fps scrolling over variant items
  const rowVirtualizer = useVirtualizer({
    count: variants.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 5,
    initialRect: { width: 320, height: 280 },
  })

  // Autofocus input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [open])

  const handleSelect = (variant: VariantOption) => {
    onChange(variant.id, variant)
    setOpen(false)
  }

  const effectivePlaceholder =
    placeholder ||
    t('reorderRules.variantPicker.placeholder', 'Select product variant...')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          aria-controls='reorder-variant-listbox'
          aria-label={ariaLabel || effectivePlaceholder}
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <div className='flex items-center gap-2 truncate'>
            <Package className='h-4 w-4 shrink-0 text-muted-foreground' />
            {selectedVariant ? (
              <span className='truncate text-foreground'>
                <span className='font-mono font-medium'>
                  {selectedVariant.sku}
                </span>
                {selectedVariant.products?.name ? (
                  <span className='ms-1.5 text-muted-foreground'>
                    — {selectedVariant.products.name}
                  </span>
                ) : null}
              </span>
            ) : (
              <span>{effectivePlaceholder}</span>
            )}
          </div>
          <ChevronsUpDown className='ms-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align='start'
        className='w-[--radix-popover-trigger-width] min-w-[320px] p-0 shadow-lg'
      >
        {/* Search header with clear button & loading spinner */}
        <div className='flex items-center border-b px-3 py-2'>
          <Search className='me-2 h-4 w-4 shrink-0 text-muted-foreground' />
          <Input
            ref={inputRef}
            placeholder={t(
              'reorderRules.variantPicker.searchPlaceholder',
              'Search SKU or product...'
            )}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='h-8 border-none bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0'
          />
          {isLoading ? (
            <Loader2 className='ms-2 h-4 w-4 shrink-0 animate-spin text-muted-foreground' />
          ) : search ? (
            <button
              type='button'
              onClick={() => setSearch('')}
              className='ms-2 text-muted-foreground hover:text-foreground'
              aria-label={t('common.clear', 'Clear')}
            >
              <X className='h-4 w-4' />
            </button>
          ) : null}
        </div>

        {/* Virtualized options list */}
        <div
          ref={parentRef}
          id='reorder-variant-listbox'
          role='listbox'
          aria-label={effectivePlaceholder}
          className='max-h-[280px] overflow-auto p-1'
        >
          {variants.length === 0 ? (
            <div className='p-4 text-center text-sm text-muted-foreground'>
              {isLoading
                ? t('reorderRules.variantPicker.searching', 'Searching variants...')
                : t(
                    'reorderRules.variantPicker.noVariantsFound',
                    'No matching variants found.'
                  )}
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const variant = variants[virtualRow.index]
                if (!variant) return null
                const isSelected = variant.id === value

                return (
                  <div
                    key={variant.id}
                    role='option'
                    aria-selected={isSelected}
                    onClick={() => handleSelect(variant)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                      isSelected
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'hover:bg-muted/60'
                    )}
                  >
                    <div className='flex flex-col truncate pe-2'>
                      <div className='flex items-center gap-2'>
                        <span className='font-mono font-medium text-foreground'>
                          {variant.sku}
                        </span>
                        {variant.barcode ? (
                          <span className='font-mono text-[11px] text-muted-foreground'>
                            ({variant.barcode})
                          </span>
                        ) : null}
                      </div>
                      {variant.products?.name ? (
                        <span className='truncate text-xs text-muted-foreground'>
                          {variant.products.name}
                        </span>
                      ) : null}
                    </div>

                    {isSelected ? (
                      <Check className='h-4 w-4 shrink-0 text-primary' />
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
