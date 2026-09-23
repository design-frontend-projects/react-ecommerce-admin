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
  useTaxClassificationOptions,
  type TaxClassificationOption,
} from '../hooks/use-product-options'

export interface TaxClassificationSelectProps {
  value?: string | null
  onChange?: (value: string | null, option?: TaxClassificationOption) => void
  placeholder?: string
  disabled?: boolean
  className?: string
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

export function TaxClassificationSelect({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
}: TaxClassificationSelectProps) {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar' || i18n.language?.startsWith('ar')
  const [open, setOpen] = React.useState(false)

  const { data: classifications = [], isLoading } =
    useTaxClassificationOptions()

  const selectedItem = React.useMemo(() => {
    if (!value) return null
    return classifications.find((item) => item.id === value) || null
  }, [classifications, value])

  const defaultPlaceholder = t(
    'products.form.selectTaxClassification',
    'Select tax classification...'
  )

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
            'w-full justify-between font-normal h-10 px-3',
            !selectedItem && 'text-muted-foreground',
            className
          )}
        >
          {isLoading ? (
            <div className='flex items-center gap-2'>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span className='text-xs'>
                {t('common.loading', 'Loading...')}
              </span>
            </div>
          ) : selectedItem ? (
            <div className='flex items-center gap-2 truncate'>
              <Badge
                variant='outline'
                className={cn(
                  'h-5 px-1.5 text-[10px] font-mono font-semibold shrink-0',
                  getRateBadgeVariant(selectedItem.rate)
                )}
              >
                {selectedItem.rate}%
              </Badge>
              <span className='truncate font-medium text-xs sm:text-sm text-foreground'>
                {isArabic && selectedItem.name_ar
                  ? selectedItem.name_ar
                  : selectedItem.name}
              </span>
              {selectedItem.name_ar && !isArabic && (
                <span className='text-[11px] text-muted-foreground truncate hidden sm:inline' dir='rtl'>
                  ({selectedItem.name_ar})
                </span>
              )}
            </div>
          ) : (
            <span className='text-xs sm:text-sm'>{placeholder || defaultPlaceholder}</span>
          )}

          <div className='flex items-center gap-1 ms-2 shrink-0'>
            {selectedItem && !disabled && (
              <span
                role='button'
                tabIndex={0}
                className='cursor-pointer rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground'
                onClick={(e) => {
                  e.stopPropagation()
                  onChange?.(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                    onChange?.(null)
                  }
                }}
                title={t('common.clear', 'Clear')}
              >
                <X className='h-3.5 w-3.5' />
              </span>
            )}
            <ChevronsUpDown className='h-4 w-4 opacity-50' />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent className='w-[360px] p-0' align='start'>
        <Command>
          <CommandInput
            placeholder={t(
              'products.form.searchTaxClassification',
              'Search tax rate or name...'
            )}
            className='h-9 text-xs sm:text-sm'
          />
          <CommandList className='max-h-60'>
            <CommandEmpty className='p-3 text-center text-xs text-muted-foreground'>
              {t(
                'products.form.noTaxClassificationFound',
                'No tax classification found.'
              )}
            </CommandEmpty>
            <CommandGroup>
              {classifications.map((item) => {
                const isSelected = item.id === value
                const displayName =
                  isArabic && item.name_ar ? item.name_ar : item.name
                const secondaryName =
                  isArabic ? item.name : item.name_ar

                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.name} ${item.name_ar || ''} ${item.code} ${item.rate}%`}
                    onSelect={() => {
                      onChange?.(item.id, item)
                      setOpen(false)
                    }}
                    className='flex items-center justify-between py-2 px-2.5 cursor-pointer'
                  >
                    <div className='flex items-start gap-2.5 overflow-hidden'>
                      <Check
                        className={cn(
                          'h-4 w-4 mt-0.5 shrink-0 text-primary',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className='flex flex-col gap-0.5 overflow-hidden'>
                        <div className='flex items-center gap-1.5 flex-wrap'>
                          <span className='font-medium text-xs sm:text-sm text-foreground'>
                            {displayName}
                          </span>
                          {secondaryName && (
                            <span className='text-[11px] text-muted-foreground'>
                              ({secondaryName})
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <span className='line-clamp-1 text-[11px] text-muted-foreground'>
                            {item.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <Badge
                      variant='outline'
                      className={cn(
                        'ms-2 shrink-0 font-mono text-[10px] font-bold px-1.5 py-0.5',
                        getRateBadgeVariant(item.rate)
                      )}
                    >
                      <Percent className='h-2.5 w-2.5 me-0.5 inline' />
                      {item.rate}
                    </Badge>
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
