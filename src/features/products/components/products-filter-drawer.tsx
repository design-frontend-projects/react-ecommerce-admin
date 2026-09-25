import React from 'react'
import { useTranslation } from 'react-i18next'
import { Filter, RotateCcw, Check } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ProductsFilterDrawerProps {
  selectedCategory: string | null
  onSelectCategory: (val: string | null) => void
  selectedBrand: string | null
  onSelectBrand: (val: string | null) => void
  selectedUom: string | null
  onSelectUom: (val: string | null) => void
  selectedSupplier: string | null
  onSelectSupplier: (val: string | null) => void
  selectedProductType: string | null
  onSelectProductType: (val: string | null) => void
  selectedIsActive: string | null
  onSelectIsActive: (val: string | null) => void

  categories: Array<{ id: string; name: string; name_ar?: string | null }>
  brands: Array<{ id: string; name: string; name_ar?: string | null; code?: string | null }>
  uoms: Array<{ id: string; name: string; code: string }>
  suppliers: Array<{ id: string; name: string; code?: string | null }>

  onResetAll: () => void
  activeFiltersCount: number
}

export function ProductsFilterDrawer({
  selectedCategory,
  onSelectCategory,
  selectedBrand,
  onSelectBrand,
  selectedUom,
  onSelectUom,
  selectedSupplier,
  onSelectSupplier,
  selectedProductType,
  onSelectProductType,
  selectedIsActive,
  onSelectIsActive,
  categories,
  brands,
  uoms,
  suppliers,
  onResetAll,
  activeFiltersCount,
}: ProductsFilterDrawerProps) {
  const { t, i18n } = useTranslation()
  const isAr = i18n?.language === 'ar'

  const productTypeOptions = [
    { value: 'all', label: t('common.all', { defaultValue: 'All Types' }) },
    { value: 'simple', label: t('products.enums.productType.simple', { defaultValue: 'Simple' }) },
    { value: 'variant', label: t('products.enums.productType.variant', { defaultValue: 'Variant' }) },
    { value: 'bundle', label: t('products.enums.productType.bundle', { defaultValue: 'Bundle' }) },
    { value: 'service', label: t('products.enums.productType.service', { defaultValue: 'Service' }) },
    { value: 'composite', label: t('products.enums.productType.composite', { defaultValue: 'Composite' }) },
  ]

  const statusOptions = [
    { value: 'all', label: t('common.all', { defaultValue: 'All Statuses' }) },
    { value: 'true', label: t('common.active', { defaultValue: 'Active' }) },
    { value: 'false', label: t('common.inactive', { defaultValue: 'Inactive' }) },
  ]

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='h-8 gap-1.5 px-3 text-xs relative font-medium'
        >
          <Filter className='h-3.5 w-3.5' />
          <span>{t('products.filters.filtersButton', { defaultValue: 'Filters' })}</span>
          {activeFiltersCount > 0 && (
            <Badge
              variant='default'
              className='h-4 min-w-4 px-1 text-[10px] font-mono leading-none rounded-full ml-1'
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent
        side={isAr ? 'left' : 'right'}
        className='flex flex-col w-full sm:max-w-md p-0'
      >
        <SheetHeader className='px-6 py-4 border-b space-y-1 text-start'>
          <div className='flex items-center justify-between'>
            <SheetTitle className='text-base font-semibold flex items-center gap-2'>
              <Filter className='h-4 w-4 text-primary' />
              {t('products.filters.drawerTitle', { defaultValue: 'Filter Products' })}
            </SheetTitle>
            {activeFiltersCount > 0 && (
              <Badge variant='secondary' className='text-xs font-normal'>
                {activeFiltersCount}{' '}
                {t('products.filters.activeCount', { defaultValue: 'active' })}
              </Badge>
            )}
          </div>
          <p className='text-xs text-muted-foreground'>
            {t('products.filters.drawerDesc', {
              defaultValue: 'Filter catalog by category, brand, UOM, supplier, and status.',
            })}
          </p>
        </SheetHeader>

        <ScrollArea className='flex-1 px-6 py-4'>
          <div className='space-y-4 text-start'>
            {/* Category Filter */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>
                {t('products.columns.category', { defaultValue: 'Category' })}
              </Label>
              <Select
                value={selectedCategory || 'all'}
                onValueChange={(val) => onSelectCategory(val === 'all' ? null : val)}
              >
                <SelectTrigger className='h-9 text-xs'>
                  <SelectValue
                    placeholder={t('products.filters.allCategories', {
                      defaultValue: 'All Categories',
                    })}
                  />
                </SelectTrigger>
                <SelectContent className='max-h-60'>
                  <SelectItem value='all' className='text-xs font-medium'>
                    {t('common.all', { defaultValue: 'All Categories' })}
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className='text-xs'>
                      {cat.name}
                      {cat.name_ar && (
                        <span className='text-muted-foreground ml-1.5 font-normal'>
                          ({cat.name_ar})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Brand Filter */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>
                {t('products.columns.brand', { defaultValue: 'Brand' })}
              </Label>
              <Select
                value={selectedBrand || 'all'}
                onValueChange={(val) => onSelectBrand(val === 'all' ? null : val)}
              >
                <SelectTrigger className='h-9 text-xs'>
                  <SelectValue
                    placeholder={t('products.filters.allBrands', {
                      defaultValue: 'All Brands',
                    })}
                  />
                </SelectTrigger>
                <SelectContent className='max-h-60'>
                  <SelectItem value='all' className='text-xs font-medium'>
                    {t('common.all', { defaultValue: 'All Brands' })}
                  </SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id} className='text-xs'>
                      {b.name}
                      {b.name_ar && (
                        <span className='text-muted-foreground ml-1.5 font-normal'>
                          ({b.name_ar})
                        </span>
                      )}
                      {b.code && (
                        <span className='text-[10px] text-muted-foreground font-mono ml-1.5'>
                          [{b.code}]
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* UOM Filter */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>
                {t('products.columns.uom', { defaultValue: 'Unit of Measure (UOM)' })}
              </Label>
              <Select
                value={selectedUom || 'all'}
                onValueChange={(val) => onSelectUom(val === 'all' ? null : val)}
              >
                <SelectTrigger className='h-9 text-xs'>
                  <SelectValue
                    placeholder={t('products.filters.allUoms', {
                      defaultValue: 'All Units',
                    })}
                  />
                </SelectTrigger>
                <SelectContent className='max-h-60'>
                  <SelectItem value='all' className='text-xs font-medium'>
                    {t('common.all', { defaultValue: 'All Units' })}
                  </SelectItem>
                  {uoms.map((u) => (
                    <SelectItem key={u.id} value={u.id} className='text-xs'>
                      <span>{u.name}</span>
                      <span className='text-muted-foreground font-mono ml-1.5 text-[11px]'>
                        ({u.code})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Supplier Filter */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>
                {t('products.columns.supplier', { defaultValue: 'Supplier' })}
              </Label>
              <Select
                value={selectedSupplier || 'all'}
                onValueChange={(val) => onSelectSupplier(val === 'all' ? null : val)}
              >
                <SelectTrigger className='h-9 text-xs'>
                  <SelectValue
                    placeholder={t('products.filters.allSuppliers', {
                      defaultValue: 'All Suppliers',
                    })}
                  />
                </SelectTrigger>
                <SelectContent className='max-h-60'>
                  <SelectItem value='all' className='text-xs font-medium'>
                    {t('common.all', { defaultValue: 'All Suppliers' })}
                  </SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id} className='text-xs'>
                      <span>{s.name}</span>
                      {s.code && (
                        <span className='text-muted-foreground font-mono ml-1.5 text-[11px]'>
                          [{s.code}]
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Type Filter */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>
                {t('products.columns.productType', { defaultValue: 'Product Type' })}
              </Label>
              <Select
                value={selectedProductType || 'all'}
                onValueChange={(val) =>
                  onSelectProductType(val === 'all' ? null : val)
                }
              >
                <SelectTrigger className='h-9 text-xs'>
                  <SelectValue
                    placeholder={t('products.filters.allTypes', {
                      defaultValue: 'All Types',
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  {productTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className='text-xs'>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Status Filter */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>
                {t('products.columns.status', { defaultValue: 'Status' })}
              </Label>
              <Select
                value={selectedIsActive || 'all'}
                onValueChange={(val) =>
                  onSelectIsActive(val === 'all' ? null : val)
                }
              >
                <SelectTrigger className='h-9 text-xs'>
                  <SelectValue
                    placeholder={t('products.filters.allStatuses', {
                      defaultValue: 'All Statuses',
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className='text-xs'>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className='p-4 border-t gap-2 sm:gap-2 flex-row justify-between'>
          <Button
            variant='outline'
            size='sm'
            onClick={onResetAll}
            disabled={activeFiltersCount === 0}
            className='h-9 text-xs gap-1.5 flex-1'
          >
            <RotateCcw className='h-3.5 w-3.5' />
            {t('dataTable.reset', { defaultValue: 'Reset Filters' })}
          </Button>
          <SheetClose asChild>
            <Button size='sm' className='h-9 text-xs gap-1.5 flex-1'>
              <Check className='h-3.5 w-3.5' />
              {t('common.done', { defaultValue: 'Apply' })}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
