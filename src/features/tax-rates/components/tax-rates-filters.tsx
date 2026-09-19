import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCountries } from '@/features/countries/hooks/use-countries'
import { useTaxContext } from './tax-rates-provider'

export function TaxRatesFilters() {
  const { t } = useTranslation()
  const { filters, setFilters, resetFilters } = useTaxContext()
  const { data: countries } = useCountries()

  const isFiltered =
    filters.search !== '' ||
    filters.status !== 'all' ||
    filters.mode !== 'all' ||
    filters.validity !== 'all' ||
    filters.country_id !== 'all'

  return (
    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-wrap'>
      <div className='flex flex-1 items-center gap-2 flex-wrap'>
        {/* Search input */}
        <div className='relative w-full sm:w-64'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder={t(
              'taxRates.filters.searchPlaceholder',
              'Search rates, descriptions...'
            )}
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            className='pl-8 h-9 text-sm'
          />
          {filters.search && (
            <button
              type='button'
              onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
              className='absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground'
            >
              <X className='h-4 w-4' />
            </button>
          )}
        </div>

        {/* Status filter */}
        <Select
          value={filters.status}
          onValueChange={(val: 'all' | 'active' | 'inactive') =>
            setFilters((prev) => ({ ...prev, status: val }))
          }
        >
          <SelectTrigger className='h-9 w-[130px] text-xs font-medium'>
            <SelectValue
              placeholder={t('taxRates.filters.status', 'Status')}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>
              {t('taxRates.filters.allStatuses', 'All Statuses')}
            </SelectItem>
            <SelectItem value='active'>
              {t('taxRates.filters.active', 'Active')}
            </SelectItem>
            <SelectItem value='inactive'>
              {t('taxRates.filters.inactive', 'Inactive')}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Mode filter (Inclusive vs Exclusive) */}
        <Select
          value={filters.mode}
          onValueChange={(val: 'all' | 'inclusive' | 'exclusive') =>
            setFilters((prev) => ({ ...prev, mode: val }))
          }
        >
          <SelectTrigger className='h-9 w-[130px] text-xs font-medium'>
            <SelectValue placeholder={t('taxRates.filters.mode', 'Mode')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>
              {t('taxRates.filters.allModes', 'All Modes')}
            </SelectItem>
            <SelectItem value='inclusive'>
              {t('taxRates.filters.inclusive', 'Inclusive')}
            </SelectItem>
            <SelectItem value='exclusive'>
              {t('taxRates.filters.exclusive', 'Exclusive')}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Validity filter */}
        <Select
          value={filters.validity}
          onValueChange={(
            val: 'all' | 'current' | 'upcoming' | 'expired'
          ) => setFilters((prev) => ({ ...prev, validity: val }))}
        >
          <SelectTrigger className='h-9 w-[140px] text-xs font-medium'>
            <SelectValue
              placeholder={t('taxRates.filters.validity', 'Validity')}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>
              {t('taxRates.filters.allValidity', 'All Dates')}
            </SelectItem>
            <SelectItem value='current'>
              {t('taxRates.filters.current', 'Currently Effective')}
            </SelectItem>
            <SelectItem value='upcoming'>
              {t('taxRates.filters.upcoming', 'Upcoming')}
            </SelectItem>
            <SelectItem value='expired'>
              {t('taxRates.filters.expired', 'Expired')}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Country filter */}
        <Select
          value={filters.country_id}
          onValueChange={(val: string) =>
            setFilters((prev) => ({ ...prev, country_id: val }))
          }
        >
          <SelectTrigger className='h-9 w-[150px] text-xs font-medium'>
            <SelectValue
              placeholder={t('taxRates.filters.country', 'Country')}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>
              {t('taxRates.filters.allCountries', 'All Countries')}
            </SelectItem>
            {countries?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Reset button */}
        {isFiltered && (
          <Button
            variant='ghost'
            size='sm'
            onClick={resetFilters}
            className='h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground'
          >
            <X className='mr-1 h-3.5 w-3.5' />
            {t('common.reset', 'Reset')}
          </Button>
        )}
      </div>
    </div>
  )
}
