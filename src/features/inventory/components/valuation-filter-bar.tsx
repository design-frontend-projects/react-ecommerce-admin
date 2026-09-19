import { Search, X, Loader2, Warehouse, Layers, Truck, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ValuationFilterLookups, ValuationFilters } from '../data/valuation-schema'

interface ValuationFilterBarProps {
  filters: ValuationFilters
  onFilterChange: (updates: Partial<ValuationFilters>) => void
  onReset: () => void
  lookups: ValuationFilterLookups
  isSearching?: boolean
  searchValue: string
  onSearchChange: (value: string) => void
}

export function ValuationFilterBar({
  filters,
  onFilterChange,
  onReset,
  lookups,
  isSearching = false,
  searchValue,
  onSearchChange,
}: ValuationFilterBarProps) {
  const { t } = useTranslation()

  const activeFilterCount = [
    searchValue.trim() ? 1 : 0,
    filters.warehouseId && filters.warehouseId !== 'all' ? 1 : 0,
    filters.storeId && filters.storeId !== 'all' ? 1 : 0,
    filters.categoryId && filters.categoryId !== 'all' ? 1 : 0,
    filters.supplierId && filters.supplierId !== 'all' ? 1 : 0,
    filters.condition && filters.condition !== 'all' ? 1 : 0,
    filters.stockStatus && filters.stockStatus !== 'all' ? 1 : 0,
  ].reduce((acc, curr) => acc + curr, 0)

  // Combined facility list
  const facilities = [
    ...lookups.warehouses.map((w) => ({
      id: `wh_${w.id}`,
      actualId: w.id,
      type: 'warehouse' as const,
      label: w.code ? `${w.name} [${w.code}]` : w.name,
    })),
    ...lookups.stores.map((s) => ({
      id: `store_${s.id}`,
      actualId: s.id,
      type: 'store' as const,
      label: `${s.name} (${t('inventory.valuationPage.storeLabel', 'Store')})`,
    })),
  ]

  const selectedFacilityValue =
    filters.warehouseId && filters.warehouseId !== 'all'
      ? `wh_${filters.warehouseId}`
      : filters.storeId && filters.storeId !== 'all'
      ? `store_${filters.storeId}`
      : 'all'

  const handleFacilityChange = (val: string) => {
    if (val === 'all') {
      onFilterChange({ warehouseId: 'all', storeId: 'all', page: 1 })
    } else if (val.startsWith('wh_')) {
      const whId = val.replace('wh_', '')
      onFilterChange({ warehouseId: whId, storeId: 'all', page: 1 })
    } else if (val.startsWith('store_')) {
      const storeId = val.replace('store_', '')
      onFilterChange({ storeId, warehouseId: 'all', page: 1 })
    }
  }

  return (
    <div className='flex flex-col gap-3 rounded-xl border bg-card/70 p-3.5 backdrop-blur-xs shadow-xs'>
      {/* Top row: Lazy search + Facilities + Categories + Reset */}
      <div className='flex flex-wrap items-center gap-2.5'>
        {/* Lazy Search */}
        <div className='relative min-w-[240px] flex-1'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t(
              'inventory.valuationPage.filterSearch',
              'Search SKU, Barcode, Product Name...'
            )}
            className='h-9 pl-9 pr-9 text-xs sm:text-sm'
          />
          {isSearching ? (
            <div className='absolute right-2.5 top-1/2 -translate-y-1/2'>
              <Loader2 className='h-4 w-4 animate-spin text-primary' />
            </div>
          ) : searchValue ? (
            <button
              type='button'
              onClick={() => onSearchChange('')}
              className='absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground'
              title={t('common.clear', 'Clear')}
            >
              <X className='h-3.5 w-3.5' />
            </button>
          ) : null}
        </div>

        {/* Real Table Filter: Warehouses / Stores */}
        <div className='min-w-[180px]'>
          <Select value={selectedFacilityValue} onValueChange={handleFacilityChange}>
            <SelectTrigger className='h-9 text-xs'>
              <div className='flex items-center gap-1.5 truncate'>
                <Warehouse className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
                <SelectValue placeholder={t('inventory.valuationPage.allFacilities', 'All Facilities')} />
              </div>
            </SelectTrigger>
            <SelectContent className='max-h-60'>
              <SelectItem value='all'>
                {t('inventory.valuationPage.allFacilities', 'All Facilities (Warehouses & Stores)')}
              </SelectItem>
              {facilities.map((fac) => (
                <SelectItem key={fac.id} value={fac.id}>
                  {fac.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Real Table Filter: Categories */}
        <div className='min-w-[160px]'>
          <Select
            value={filters.categoryId || 'all'}
            onValueChange={(val) => onFilterChange({ categoryId: val, page: 1 })}
          >
            <SelectTrigger className='h-9 text-xs'>
              <div className='flex items-center gap-1.5 truncate'>
                <Layers className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
                <SelectValue placeholder={t('inventory.valuationPage.allCategories', 'All Categories')} />
              </div>
            </SelectTrigger>
            <SelectContent className='max-h-60'>
              <SelectItem value='all'>
                {t('inventory.valuationPage.allCategories', 'All Categories')}
              </SelectItem>
              {lookups.categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Real Table Filter: Suppliers */}
        <div className='min-w-[160px]'>
          <Select
            value={filters.supplierId || 'all'}
            onValueChange={(val) => onFilterChange({ supplierId: val, page: 1 })}
          >
            <SelectTrigger className='h-9 text-xs'>
              <div className='flex items-center gap-1.5 truncate'>
                <Truck className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
                <SelectValue placeholder={t('inventory.valuationPage.allSuppliers', 'All Suppliers')} />
              </div>
            </SelectTrigger>
            <SelectContent className='max-h-60'>
              <SelectItem value='all'>
                {t('inventory.valuationPage.allSuppliers', 'All Suppliers / Vendors')}
              </SelectItem>
              {lookups.suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} {s.code ? `[${s.code}]` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stock Condition */}
        <div className='min-w-[130px]'>
          <Select
            value={filters.condition || 'all'}
            onValueChange={(val) => onFilterChange({ condition: val, page: 1 })}
          >
            <SelectTrigger className='h-9 text-xs'>
              <div className='flex items-center gap-1.5 truncate'>
                <ShieldAlert className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
                <SelectValue placeholder={t('inventory.valuationPage.allConditions', 'Condition')} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>{t('inventory.valuationPage.allConditions', 'All Conditions')}</SelectItem>
              <SelectItem value='good'>{t('inventory.valuationPage.conditionGood', 'Good / Prime')}</SelectItem>
              <SelectItem value='damaged'>{t('inventory.valuationPage.conditionDamaged', 'Damaged')}</SelectItem>
              <SelectItem value='refurbished'>{t('inventory.valuationPage.conditionRefurbished', 'Refurbished')}</SelectItem>
              <SelectItem value='returned'>{t('inventory.valuationPage.conditionReturned', 'Returned')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset Filters */}
        {activeFilterCount > 0 && (
          <Button
            variant='ghost'
            size='sm'
            onClick={onReset}
            className='h-9 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground'
          >
            <RotateCcw className='h-3.5 w-3.5' />
            <span>{t('common.reset', 'Reset')}</span>
            <Badge variant='secondary' className='h-4 px-1 text-[10px] font-bold'>
              {activeFilterCount}
            </Badge>
          </Button>
        )}
      </div>

      {/* Quick Stock Status Chips */}
      <div className='flex flex-wrap items-center gap-1.5 border-t pt-2 text-xs'>
        <span className='text-muted-foreground text-[11px] font-medium mr-1'>
          {t('inventory.valuationPage.statusLabel', 'Stock Level:')}
        </span>
        {[
          { id: 'all', label: t('inventory.valuationPage.statusAll', 'All Stock') },
          { id: 'in_stock', label: t('inventory.valuationPage.statusInStock', 'In Stock') },
          { id: 'low_stock', label: t('inventory.valuationPage.statusLowStock', 'Low Stock (Alert)') },
          { id: 'out_of_stock', label: t('inventory.valuationPage.statusOutOfStock', 'Out of Stock') },
          { id: 'high_value', label: t('inventory.valuationPage.statusHighValue', 'High Asset Value') },
        ].map((chip) => {
          const isSelected = (filters.stockStatus || 'all') === chip.id
          return (
            <button
              key={chip.id}
              type='button'
              onClick={() => onFilterChange({ stockStatus: chip.id as any, page: 1 })}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {chip.id === 'high_value' && <Sparkles className='inline mr-1 h-3 w-3' />}
              {chip.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
