import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useWarehouseOptions, useStoreOptions } from '@/hooks/use-inventory-lookups'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import type { MovementFilters } from './data/schema'
import { useInventoryMovements } from './hooks/use-inventory-movements'

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

export function InventoryMovements() {
  const { t } = useTranslation()
  const [movementType, setMovementType] = useState<string>(ALL)
  const [warehouseId, setWarehouseId] = useState<string>(ALL)

  const { data: warehouses = [] } = useWarehouseOptions()
  const { data: stores = [] } = useStoreOptions()

  const isSelectedWarehouse = warehouses.some((w) => w.id === warehouseId)
  const isSelectedStore = stores.some((s) => s.store_id === warehouseId)

  const filters: MovementFilters = {
    movementType: movementType === ALL ? undefined : movementType,
    warehouseId:
      warehouseId === ALL ? undefined : isSelectedWarehouse ? warehouseId : undefined,
    storeId:
      warehouseId === ALL ? undefined : isSelectedStore ? warehouseId : undefined,
  }
  const { data: movements, isLoading, error } = useInventoryMovements(filters)

  const locationOptions = [
    ...warehouses.map((w) => ({
      id: w.id,
      name: w.code ? `${w.name} (${w.code})` : w.name,
    })),
    ...stores.map((s) => ({
      id: s.store_id,
      name: s.name ? `${s.name} (Store)` : s.store_id,
    })),
  ]

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h2 className='bg-linear-to-r from-primary to-primary/60 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent'>{t('inventoryMovements.title')}</h2>
          <p className='text-muted-foreground'>
            {t('inventoryMovements.description')}
          </p>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Select value={movementType} onValueChange={setMovementType}>
            <SelectTrigger className='w-56'>
              <SelectValue placeholder={t('inventoryMovements.filters.allMovementTypes')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('inventoryMovements.filters.allMovementTypes')}</SelectItem>
              {MOVEMENT_TYPES.map((type) => (
                <SelectItem key={type} value={type} className='capitalize'>
                  {type.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger className='w-56'>
              <SelectValue placeholder={t('inventoryMovements.filters.allWarehouses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('inventoryMovements.filters.allWarehousesStores')}</SelectItem>
              {locationOptions.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className='flex min-h-[400px] flex-1 items-center justify-center'>
            <Loader2 className='h-10 w-10 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='flex flex-1 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-500'>
            <p className='font-medium'>{t('inventoryMovements.error.loadFailed')}</p>
          </div>
        ) : (
          <div className='overflow-hidden rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inventoryMovements.table.date')}</TableHead>
                  <TableHead>{t('inventoryMovements.table.type')}</TableHead>
                  <TableHead>{t('inventoryMovements.table.variantSku')}</TableHead>
                  <TableHead>{t('inventoryMovements.table.warehouseStore')}</TableHead>
                  <TableHead className='text-end'>{t('inventoryMovements.table.in')}</TableHead>
                  <TableHead className='text-end'>{t('inventoryMovements.table.out')}</TableHead>
                  <TableHead className='text-end'>{t('inventoryMovements.table.unitCost')}</TableHead>
                  <TableHead>{t('inventoryMovements.table.reference')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements?.length ? (
                  movements.map((movement) => {
                    const locName =
                      movement.warehouses?.name ??
                      movement.stores?.name ??
                      '—'
                    return (
                      <TableRow key={movement.id}>
                        <TableCell className='whitespace-nowrap'>
                          {new Date(movement.movement_date).toLocaleString(
                            undefined,
                            { dateStyle: 'medium', timeStyle: 'short' }
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant='outline' className='capitalize'>
                            {movement.movement_type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className='font-mono font-medium'>
                            {movement.product_variants?.sku ??
                              movement.product_variant_id.slice(0, 8)}
                          </span>
                        </TableCell>
                        <TableCell>{locName}</TableCell>
                        <TableCell className='text-end font-semibold text-emerald-600'>
                          {movement.qty_in > 0 ? `+${movement.qty_in}` : ''}
                        </TableCell>
                        <TableCell className='text-end font-semibold text-rose-600'>
                          {movement.qty_out > 0 ? `-${movement.qty_out}` : ''}
                        </TableCell>
                        <TableCell className='text-end font-mono text-sm'>
                          {movement.unit_cost > 0 ? `$${Number(movement.unit_cost).toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell>
                          {movement.reference_type === 'inventory_transaction' || movement.source_document_type ? (
                            <Link
                              to='/inventory-transactions'
                              className='font-medium text-primary hover:underline inline-flex items-center gap-1 text-xs'
                            >
                              <span>{movement.source_document_type ?? t('inventoryMovements.reference.txn')}</span>
                              <span className='text-[10px] text-muted-foreground font-mono'>→</span>
                            </Link>
                          ) : (
                            <span className='text-muted-foreground text-xs'>
                              {movement.reference_type
                                ? movement.reference_type.replace(/_/g, ' ')
                                : '—'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className='h-24 text-center'>
                      {t('inventoryMovements.empty.noMovements')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Main>
    </>
  )
}
