import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Search,
  RotateCcw,
  Download,
  Calendar,
  Filter,
  Loader2,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const MOVEMENT_TYPES = [
  'opening_stock',
  'sale',
  'sale_return',
  'purchase',
  'purchase_return',
  'transfer_in',
  'transfer_out',
  'adjustment_in',
  'adjustment_out',
  'damage',
  'expired',
  'reserved',
  'released',
  'production_output',
  'production_consumption',
  'lost',
  'found',
  'cycle_count_in',
  'cycle_count_out',
  'consumption',
]

const ALL = '__all__'

export interface InventoryMovementsToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  movementType: string
  onMovementTypeChange: (value: string) => void
  locationId: string
  onLocationIdChange: (value: string) => void
  dateFrom: string
  onDateFromChange: (value: string) => void
  dateTo: string
  onDateToChange: (value: string) => void
  onResetFilters: () => void
  onExportCsv?: () => void
  isExporting?: boolean
  locationOptions: Array<{ id: string; name: string }>
}

export function InventoryMovementsToolbar({
  search,
  onSearchChange,
  movementType,
  onMovementTypeChange,
  locationId,
  onLocationIdChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onResetFilters,
  onExportCsv,
  isExporting = false,
  locationOptions,
}: InventoryMovementsToolbarProps) {
  const { t } = useTranslation()
  const [localSearch, setLocalSearch] = useState(search)

  // Keep local search input synced if external search prop changes
  useEffect(() => {
    setLocalSearch(search)
  }, [search])

  // Debounce search by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch, search, onSearchChange])

  const activeFiltersCount = [
    Boolean(search),
    movementType !== ALL && Boolean(movementType),
    locationId !== ALL && Boolean(locationId),
    Boolean(dateFrom),
    Boolean(dateTo),
  ].filter(Boolean).length

  return (
    <div className='flex flex-col gap-3 rounded-lg border bg-card p-3 sm:p-4 shadow-xs'>
      <div className='flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3'>
        {/* Search input with debounced typing */}
        <div className='relative flex-1 min-w-[240px] max-w-lg'>
          <Search className='absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none' />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={t(
              'inventoryMovements.filters.searchPlaceholder',
              'Search by SKU, variant name, barcode, or ref...'
            )}
            className='ps-9 pe-8 h-9 text-xs sm:text-sm'
          />
          {localSearch && (
            <button
              type='button'
              onClick={() => {
                setLocalSearch('')
                onSearchChange('')
              }}
              className='absolute end-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground'
              aria-label='Clear search'
            >
              <X className='h-3.5 w-3.5' />
            </button>
          )}
        </div>

        {/* Action button: Export */}
        {onExportCsv && (
          <div className='flex items-center gap-2 ms-auto'>
            <Button
              variant='outline'
              size='sm'
              onClick={onExportCsv}
              disabled={isExporting}
              className='h-9 gap-1.5 text-xs font-medium'
            >
              {isExporting ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <Download className='h-3.5 w-3.5' />
              )}
              <span>
                {isExporting
                  ? t('inventoryMovements.filters.exporting', 'Exporting...')
                  : t('inventoryMovements.filters.exportCsv', 'Export CSV')}
              </span>
            </Button>
          </div>
        )}
      </div>

      {/* Filter Row */}
      <div className='flex flex-wrap items-center gap-2 pt-1 border-t border-border/50'>
        <div className='flex items-center gap-1.5 text-xs text-muted-foreground me-1'>
          <Filter className='h-3.5 w-3.5' />
          <span className='font-medium hidden sm:inline'>
            {t('common.filters', 'Filters')}:
          </span>
          {activeFiltersCount > 0 && (
            <Badge
              variant='secondary'
              className='h-5 px-1.5 text-[10px] font-semibold'
            >
              {activeFiltersCount}
            </Badge>
          )}
        </div>

        {/* Movement Type Filter */}
        <Select
          value={movementType || ALL}
          onValueChange={onMovementTypeChange}
        >
          <SelectTrigger className='w-[170px] sm:w-[190px] h-8 text-xs'>
            <SelectValue
              placeholder={t(
                'inventoryMovements.filters.allMovementTypes',
                'All movement types'
              )}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL} className='text-xs'>
              {t(
                'inventoryMovements.filters.allMovementTypes',
                'All movement types'
              )}
            </SelectItem>
            {MOVEMENT_TYPES.map((type) => (
              <SelectItem key={type} value={type} className='capitalize text-xs'>
                {t(
                  `inventoryMovements.types.${type}`,
                  type.replace(/_/g, ' ')
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Location Filter */}
        <Select
          value={locationId || ALL}
          onValueChange={onLocationIdChange}
        >
          <SelectTrigger className='w-[170px] sm:w-[210px] h-8 text-xs'>
            <SelectValue
              placeholder={t(
                'inventoryMovements.filters.allLocations',
                'All warehouses & stores'
              )}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL} className='text-xs'>
              {t(
                'inventoryMovements.filters.allLocations',
                'All warehouses & stores'
              )}
            </SelectItem>
            {locationOptions.map((loc) => (
              <SelectItem key={loc.id} value={loc.id} className='text-xs'>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range Inputs */}
        <div className='flex items-center gap-1.5 bg-muted/30 border rounded-md px-2 py-0.5 h-8'>
          <Calendar className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
          <input
            type='date'
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className='bg-transparent text-xs outline-none text-foreground border-none p-0 w-28 focus:ring-0'
            title={t('inventoryMovements.filters.dateFrom', 'From Date')}
            aria-label={t('inventoryMovements.filters.dateFrom', 'From Date')}
          />
          <span className='text-muted-foreground text-xs'>→</span>
          <input
            type='date'
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className='bg-transparent text-xs outline-none text-foreground border-none p-0 w-28 focus:ring-0'
            title={t('inventoryMovements.filters.dateTo', 'To Date')}
            aria-label={t('inventoryMovements.filters.dateTo', 'To Date')}
          />
        </div>

        {/* Reset button */}
        {activeFiltersCount > 0 && (
          <Button
            variant='ghost'
            size='sm'
            onClick={onResetFilters}
            className='h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1'
          >
            <RotateCcw className='h-3 w-3' />
            <span>{t('inventoryMovements.filters.clearFilters', 'Reset')}</span>
          </Button>
        )}
      </div>
    </div>
  )
}
