import * as React from 'react'
import { Check, ChevronsUpDown, Coins, Search } from 'lucide-react'
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
import { useCurrencies, type Currency } from '@/features/currencies/hooks/use-currencies'

export interface SelectedCurrencyInfo {
  id: string
  code: string
  name: string
  name_ar?: string | null
  symbol: string
}

interface POCurrencySelectProps {
  value?: string | null // can match code or id
  currencyId?: string | null
  onSelectCurrency: (currency: SelectedCurrencyInfo) => void
  disabled?: boolean
  className?: string
  showValidation?: boolean
}

// Top frequently used procurement currencies for quick-selection chips
const POPULAR_CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'EGP', 'KWD', 'QAR']

export function POCurrencySelect({
  value,
  currencyId,
  onSelectCurrency,
  disabled = false,
  className,
  showValidation = false,
}: POCurrencySelectProps) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const isArabic = i18n.language?.startsWith('ar')

  const { data: currencies = [], isLoading } = useCurrencies({ onlyActive: true })

  // Find currently selected currency (match by id or code)
  const selectedCurrency = React.useMemo(() => {
    if (!currencies || currencies.length === 0) return null
    if (currencyId) {
      const byId = currencies.find((c) => c.id === currencyId)
      if (byId) return byId
    }
    if (value) {
      const byCode = currencies.find(
        (c) => c.code.toLowerCase() === value.toLowerCase()
      )
      if (byCode) return byCode
      const byId = currencies.find((c) => c.id === value)
      if (byId) return byId
    }
    // Default fallback to USD if available
    return currencies.find((c) => c.code === 'USD') || currencies[0] || null
  }, [currencies, currencyId, value])

  const popularCurrencies = React.useMemo(() => {
    return currencies.filter((c) => POPULAR_CURRENCY_CODES.includes(c.code))
  }, [currencies])

  const handleSelect = (currency: Currency) => {
    onSelectCurrency({
      id: currency.id,
      code: currency.code,
      name: currency.name,
      name_ar: currency.name_ar,
      symbol: currency.symbol,
    })
    setOpen(false)
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            role='combobox'
            aria-expanded={open}
            disabled={disabled || isLoading}
            className={cn(
              'w-full justify-between font-normal text-left h-10 px-3',
              !selectedCurrency && 'text-muted-foreground',
              showValidation && !selectedCurrency && 'border-destructive ring-destructive/20 ring-2'
            )}
          >
            {selectedCurrency ? (
              <div className='flex items-center gap-2 truncate'>
                <span className='inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded bg-primary/10 text-primary font-mono font-bold text-xs'>
                  {selectedCurrency.symbol || selectedCurrency.code}
                </span>
                <span className='font-semibold text-xs font-mono uppercase text-foreground'>
                  {selectedCurrency.code}
                </span>
                <span className='text-xs text-muted-foreground truncate'>
                  — {isArabic && selectedCurrency.name_ar ? selectedCurrency.name_ar : selectedCurrency.name}
                </span>
              </div>
            ) : (
              <span className='flex items-center gap-2 text-xs text-muted-foreground'>
                <Coins className='h-4 w-4' />
                {isLoading
                  ? t('purchaseOrders.currency.loading', 'Loading currencies...')
                  : t('purchaseOrders.currency.selectPlaceholder', 'Select currency')}
              </span>
            )}
            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>

        <PopoverContent className='w-[360px] p-0 shadow-lg' align='start'>
          <Command
            filter={(value, search) => {
              const item = currencies.find((c) => c.id === value)
              if (!item) return 0
              const s = search.toLowerCase()
              const matchCode = item.code.toLowerCase().includes(s)
              const matchName = item.name.toLowerCase().includes(s)
              const matchAr = item.name_ar?.toLowerCase().includes(s)
              const matchSymbol = item.symbol.toLowerCase().includes(s)
              return matchCode || matchName || matchAr || matchSymbol ? 1 : 0
            }}
          >
            <div className='flex items-center border-b px-3'>
              <Search className='mr-2 h-4 w-4 shrink-0 opacity-50' />
              <CommandInput
                placeholder={t(
                  'purchaseOrders.currency.searchPlaceholder',
                  'Search by code, name, or symbol...'
                )}
                className='h-9 text-xs border-0 focus:ring-0'
              />
            </div>

            {/* Quick Popular Chips */}
            {popularCurrencies.length > 0 && (
              <div className='p-2 border-b bg-muted/30'>
                <div className='text-[10px] font-semibold text-muted-foreground uppercase px-1 mb-1.5'>
                  {t('purchaseOrders.currency.frequentCurrencies', 'Frequent Currencies')}
                </div>
                <div className='flex flex-wrap gap-1'>
                  {popularCurrencies.map((c) => (
                    <Button
                      key={c.id}
                      type='button'
                      variant={selectedCurrency?.code === c.code ? 'default' : 'outline'}
                      size='sm'
                      className='h-6 px-2 text-[11px] font-mono'
                      onClick={() => handleSelect(c)}
                    >
                      <span>{c.symbol}</span>
                      <span className='ml-1 font-bold'>{c.code}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <CommandList className='max-h-60 overflow-y-auto'>
              <CommandEmpty className='p-4 text-center text-xs text-muted-foreground'>
                {t('purchaseOrders.currency.noCurrenciesFound', 'No currencies found matching your search.')}
              </CommandEmpty>

              <CommandGroup heading={t('purchaseOrders.currency.allCurrencies', 'All Currencies')}>
                {currencies.map((curr) => {
                  const isSelected =
                    selectedCurrency?.id === curr.id ||
                    selectedCurrency?.code === curr.code
                  return (
                    <CommandItem
                      key={curr.id}
                      value={curr.id}
                      onSelect={() => handleSelect(curr)}
                      className='flex items-center justify-between py-2 px-3 text-xs cursor-pointer'
                    >
                      <div className='flex items-center gap-2.5 truncate'>
                        <Badge
                          variant='outline'
                          className='font-mono font-bold text-[11px] min-w-9 justify-center bg-muted/40'
                        >
                          {curr.symbol || curr.code}
                        </Badge>
                        <div className='flex flex-col truncate'>
                          <div className='flex items-center gap-1.5'>
                            <span className='font-bold font-mono text-xs text-foreground'>
                              {curr.code}
                            </span>
                            <span className='text-[11px] text-muted-foreground truncate'>
                              {isArabic && curr.name_ar ? curr.name_ar : curr.name}
                            </span>
                          </div>
                          {curr.name_ar && !isArabic && (
                            <span className='text-[10px] text-muted-foreground/70 font-sans'>
                              {curr.name_ar}
                            </span>
                          )}
                        </div>
                      </div>

                      <Check
                        className={cn(
                          'h-4 w-4 ml-2 text-primary shrink-0 transition-opacity',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
