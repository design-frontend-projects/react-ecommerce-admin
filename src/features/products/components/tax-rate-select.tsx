import * as React from 'react'
import { Check, ChevronsUpDown, Percent, Loader2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  useTaxRateOptions,
  type TaxRateOption,
} from '../hooks/use-product-options'

export interface TaxRateSelectProps {
  value?: string | null
  onChange?: (value: string | null, option?: TaxRateOption) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  size?: 'default' | 'sm'
}

function getRateBadgeVariant(rate: number) {
  if (rate >= 15) {
    return 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-300'
  }
  if (rate > 0) {
    return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300'
  }
  return 'bg-muted text-muted-foreground border-border'
}

export function TaxRateSelect({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  size = 'default',
}: TaxRateSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)

  const { data: taxRates = [], isLoading } = useTaxRateOptions()

  const selectedItem = React.useMemo(() => {
    if (!value) return null
    return taxRates.find((item) => item.id === value) || null
  }, [taxRates, value])

  const defaultPlaceholder = t(
    'products.form.selectTaxRate',
    'Select tax rate...'
  )

  const isSmall = size === 'sm'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            'w-full justify-between font-normal px-2.5',
            isSmall ? 'h-8 text-xs' : 'h-9 text-xs sm:text-sm',
            !selectedItem && 'text-muted-foreground',
            className
          )}
        >
          {isLoading ? (
            <div className='flex items-center gap-1.5'>
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
              <span className='text-xs'>
                {t('common.loading', 'Loading...')}
              </span>
            </div>
          ) : selectedItem ? (
            <div className='flex items-center gap-1.5 truncate'>
              <Badge
                variant='outline'
                className={cn(
                  'h-4 px-1 text-[10px] font-mono font-semibold shrink-0',
                  getRateBadgeVariant(selectedItem.rate)
                )}
              >
                {selectedItem.rate}%
              </Badge>
              <span className='truncate font-medium text-xs text-foreground'>
                {selectedItem.tax_type}
              </span>
              {selectedItem.is_inclusive && (
                <span className='text-[9px] text-muted-foreground shrink-0'>
                  ({t('taxRates.inclusive', 'Inc')})
                </span>
              )}
            </div>
          ) : (
            <span className='truncate text-xs'>{placeholder || defaultPlaceholder}</span>
          )}

          <div className='flex items-center gap-1 shrink-0 ms-1'>
            {selectedItem && !disabled && (
              <span
                role='button'
                tabIndex={0}
                className='rounded-sm p-0.5 opacity-60 hover:opacity-100 hover:bg-muted focus:outline-hidden'
                onClick={(e) => {
                  e.stopPropagation()
                  onChange?.(null, undefined)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                    onChange?.(null, undefined)
                  }
                }}
              >
                <X className='h-3 w-3 text-muted-foreground' />
              </span>
            )}
            <ChevronsUpDown className='h-3.5 w-3.5 shrink-0 opacity-50' />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className='w-[280px] p-0 shadow-lg'
        align='start'
      >
        <Command>
          <CommandInput
            placeholder={t(
              'products.form.searchTaxRate',
              'Search tax rates...'
            )}
            className='h-9 text-xs'
          />
          <CommandList className='max-h-56'>
            <CommandEmpty className='py-4 text-center text-xs text-muted-foreground'>
              {t(
                'products.form.noTaxRateFound',
                'No tax rate found.'
              )}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value='__none__'
                onSelect={() => {
                  onChange?.(null, undefined)
                  setOpen(false)
                }}
                className='flex items-center justify-between text-xs py-2'
              >
                <span className='text-muted-foreground italic'>
                  -- {t('common.none', 'None / Exempt (0%)')} --
                </span>
                {!value && <Check className='h-3.5 w-3.5 text-primary' />}
              </CommandItem>

              {taxRates.map((item) => {
                const isSelected = value === item.id
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.tax_type} ${item.rate}% ${item.description || ''}`}
                    onSelect={() => {
                      onChange?.(item.id, item)
                      setOpen(false)
                    }}
                    className='flex items-center justify-between text-xs py-2'
                  >
                    <div className='flex items-center gap-2 min-w-0'>
                      <Badge
                        variant='outline'
                        className={cn(
                          'h-4.5 px-1.5 text-[10px] font-mono font-semibold shrink-0',
                          getRateBadgeVariant(item.rate)
                        )}
                      >
                        {item.rate}%
                      </Badge>
                      <div className='flex flex-col truncate'>
                        <span className='truncate font-medium text-foreground'>
                          {item.tax_type}
                        </span>
                        {item.description && (
                          <span className='truncate text-[10px] text-muted-foreground'>
                            {item.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className='flex items-center gap-1 shrink-0'>
                      {item.is_inclusive && (
                        <span className='text-[9px] text-muted-foreground'>
                          Inc
                        </span>
                      )}
                      {isSelected && (
                        <Check className='h-3.5 w-3.5 text-primary ms-1' />
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

// Backward compatibility alias
export const TaxClassificationSelect = TaxRateSelect
