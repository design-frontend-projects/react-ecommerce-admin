import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronsUpDown, Loader2, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useVariantSearch } from '../hooks/use-variant-search'
import type { VariantSearchResult } from '../data/schema'

export interface InitialVariantInfo {
  id: string
  sku: string
  barcode?: string | null
  name?: string | null
  product_name?: string
  price?: number
  cost_price?: number | null
}

interface Props {
  value: string
  onChange: (value: string, variant?: VariantSearchResult) => void
  disabled?: boolean
  initialVariant?: InitialVariantInfo | null
  placeholder?: string
}

export function VariantSkuPicker({
  value,
  onChange,
  disabled = false,
  initialVariant,
  placeholder,
}: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { variants, isLoading, isDebouncing } = useVariantSearch(search, 25)

  // Cache or resolve selected variant label
  const selectedVariant = useMemo(() => {
    if (!value) return null
    if (initialVariant && initialVariant.id === value) {
      return initialVariant
    }
    return variants.find((v) => v.id === value) || null
  }, [value, initialVariant, variants])

  const displayLabel = useMemo(() => {
    if (selectedVariant) {
      const prod = selectedVariant.product_name || selectedVariant.name || ''
      return `${selectedVariant.sku}${prod ? ` — ${prod}` : ''}`
    }
    return (
      placeholder ??
      t('stockBalances.variantPicker.placeholder', 'Search SKU, barcode, product name...')
    )
  }, [selectedVariant, placeholder, t])

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
            'w-full justify-between font-normal text-start',
            !value && 'text-muted-foreground'
          )}
        >
          <div className='flex items-center gap-2 truncate'>
            <Package className='h-4 w-4 shrink-0 text-muted-foreground' />
            <span className='truncate font-mono text-xs sm:text-sm'>{displayLabel}</span>
          </div>
          <ChevronsUpDown className='ms-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[380px] p-0 sm:w-[480px]' align='start'>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t(
              'stockBalances.variantPicker.searchPlaceholder',
              'Type SKU, name, or barcode to search...'
            )}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className='max-h-64'>
            {isLoading || isDebouncing ? (
              <div className='space-y-2 p-3'>
                <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                  <Loader2 className='h-3.5 w-3.5 animate-spin text-primary' />
                  <span>
                    {t('stockBalances.variantPicker.searching', 'Searching catalog...')}
                  </span>
                </div>
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className='flex items-center justify-between py-1.5'>
                    <div className='space-y-1'>
                      <Skeleton className='h-3.5 w-24' />
                      <Skeleton className='h-3 w-40' />
                    </div>
                    <Skeleton className='h-3.5 w-12' />
                  </div>
                ))}
              </div>
            ) : variants.length === 0 ? (
              <CommandEmpty>
                <div className='py-6 text-center text-xs text-muted-foreground'>
                  {t('stockBalances.variantPicker.noResults', 'No product variants found')}
                </div>
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {variants.map((v) => {
                  const isSelected = v.id === value
                  return (
                    <CommandItem
                      key={v.id}
                      value={v.id}
                      onSelect={() => {
                        onChange(v.id, v)
                        setOpen(false)
                      }}
                      className='flex cursor-pointer items-center justify-between py-2 text-xs'
                    >
                      <div className='flex items-start gap-2'>
                        <Check
                          className={cn(
                            'mt-0.5 h-4 w-4 shrink-0 text-primary',
                            isSelected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className='flex flex-col gap-0.5'>
                          <div className='flex items-center gap-1.5'>
                            <span className='font-mono font-bold text-foreground'>
                              {v.sku}
                            </span>
                            {v.barcode && (
                              <span className='font-mono text-[10px] text-muted-foreground'>
                                ({v.barcode})
                              </span>
                            )}
                          </div>
                          <span className='line-clamp-1 text-muted-foreground'>
                            {v.product_name}
                            {v.name && v.name !== v.sku ? ` — ${v.name}` : ''}
                          </span>
                        </div>
                      </div>
                      <div className='flex flex-col items-end text-[11px] font-mono'>
                        {v.cost_price != null ? (
                          <span className='text-muted-foreground'>
                            Cost: ${v.cost_price.toFixed(2)}
                          </span>
                        ) : null}
                        <span className='font-semibold text-foreground'>
                          ${v.price.toFixed(2)}
                        </span>
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
