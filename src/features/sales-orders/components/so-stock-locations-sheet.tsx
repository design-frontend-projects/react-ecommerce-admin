import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Warehouse,
  Building2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Package,
  Layers,
  MapPin,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { SOVariantOption } from './so-product-variant-picker'
import {
  getVariantLocationBreakdown,
  type LocationStockItem,
} from '../utils/variant-stock'

export interface SalesOrderStockLocationsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productName?: string
  variant: SOVariantOption | null
  stores: Array<{ store_id: string; name?: string | null }>
  warehouses: Array<{ id: string; name: string; code?: string | null }>
  currentStoreId?: string | null
  currentWarehouseId?: string | null
  storeWarehouseIds?: string[]
  onSelectWarehouse?: (warehouseId: string) => void
}

export function SalesOrderStockLocationsSheet({
  open,
  onOpenChange,
  productName,
  variant,
  stores = [],
  warehouses = [],
  currentStoreId,
  currentWarehouseId,
  storeWarehouseIds = [],
  onSelectWarehouse,
}: SalesOrderStockLocationsSheetProps) {
  const { t } = useTranslation()

  if (!variant) return null

  const locationItems: LocationStockItem[] = getVariantLocationBreakdown(
    variant,
    stores,
    warehouses,
    currentStoreId,
    currentWarehouseId,
    storeWarehouseIds
  )

  const currentStore = stores.find((s) => s.store_id === currentStoreId)
  const currentWarehouse = warehouses.find((w) => w.id === currentWarehouseId)
  const currentLocName =
    currentWarehouse?.name || currentStore?.name || t('salesOrders.stock.currentLocation', 'Current Location')

  const totalOrgAvailable = locationItems.reduce(
    (sum, loc) => sum + loc.available,
    0
  )
  const locationsWithStock = locationItems.filter((loc) => loc.available > 0)

  const handleSwitchWarehouse = (whId: string, whName: string) => {
    if (onSelectWarehouse) {
      onSelectWarehouse(whId)
      toast.success(
        t(
          'salesOrders.stock.switchedWarehouseToast',
          'Fulfillment location switched to {{name}}',
          { name: whName }
        )
      )
      onOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='w-full sm:max-w-md md:max-w-lg p-0 flex flex-col h-full bg-background'
      >
        <SheetHeader className='p-6 pb-4 border-b bg-muted/20'>
          <div className='flex items-center gap-2'>
            <div className='p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400'>
              <Warehouse className='h-5 w-5' />
            </div>
            <div>
              <SheetTitle className='text-lg font-bold'>
                {t('salesOrders.stock.panelTitle', 'Stock Across Locations')}
              </SheetTitle>
              <SheetDescription className='text-xs text-muted-foreground'>
                {t(
                  'salesOrders.stock.panelSubtitle',
                  'Locate available inventory in other warehouses and stores.'
                )}
              </SheetDescription>
            </div>
          </div>

          {/* Product and Variant Pill */}
          <div className='mt-3 p-3 rounded-lg border bg-card/60 flex items-center justify-between gap-2'>
            <div className='flex items-center gap-2 min-w-0'>
              <Package className='h-4 w-4 text-primary shrink-0' />
              <div className='truncate'>
                <p className='text-xs font-semibold truncate text-foreground'>
                  {productName || 'Product'}
                </p>
                <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
                  <Layers className='h-3 w-3 shrink-0' />
                  <span className='font-mono font-medium'>{variant.sku}</span>
                  {variant.name && <span>· {variant.name}</span>}
                </div>
              </div>
            </div>
            <Badge
              variant={totalOrgAvailable > 0 ? 'secondary' : 'outline'}
              className={cn(
                'shrink-0 text-xs font-semibold font-mono',
                totalOrgAvailable > 0
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                  : 'text-rose-600 border-rose-300'
              )}
            >
              {totalOrgAvailable > 0
                ? t('salesOrders.stock.totalAvailableUnits', '{{count}} in network', { count: totalOrgAvailable })
                : t('salesOrders.stock.noStockInNetwork', '0 in network')}
            </Badge>
          </div>
        </SheetHeader>

        {/* Current Location Status Warning */}
        <div className='px-6 pt-4 pb-2'>
          <div className='p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 flex items-start gap-2.5 text-xs'>
            <AlertCircle className='h-4 w-4 shrink-0 mt-0.5 text-amber-600' />
            <div>
              <p className='font-semibold'>
                {t('salesOrders.stock.outOfStockAtCurrentLoc', 'Out of stock at {{location}}', {
                  location: currentLocName,
                })}
              </p>
              <p className='text-[11px] text-muted-foreground mt-0.5'>
                {locationsWithStock.length > 0
                  ? t(
                      'salesOrders.stock.stockFoundInOtherLocs',
                      'Inventory is available in {{count}} other location(s) below.',
                      { count: locationsWithStock.length }
                    )
                  : t(
                      'salesOrders.stock.noLocationsHaveStock',
                      'No warehouse or store in your organization currently holds stock for this item.'
                    )}
              </p>
            </div>
          </div>
        </div>

        {/* Locations List */}
        <ScrollArea className='flex-1 px-6 py-2'>
          <div className='space-y-3 pb-6'>
            {locationItems.length === 0 ? (
              <div className='py-12 text-center text-muted-foreground text-xs'>
                <MapPin className='h-8 w-8 mx-auto mb-2 opacity-30' />
                <p>{t('salesOrders.stock.noLocationRecords', 'No inventory records found for this variant.')}</p>
              </div>
            ) : (
              locationItems.map((loc) => {
                const hasStock = loc.available > 0
                const isCurrent = loc.isCurrentLocation
                const canSwitchToWarehouse =
                  loc.locationType === 'warehouse' &&
                  hasStock &&
                  !isCurrent &&
                  Boolean(onSelectWarehouse)

                return (
                  <div
                    key={`${loc.locationType}-${loc.locationId}`}
                    className={cn(
                      'p-3.5 rounded-lg border transition-colors space-y-2.5',
                      isCurrent
                        ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                        : hasStock
                        ? 'border-border bg-card/80 hover:border-border/80'
                        : 'border-dashed border-border/60 bg-muted/10 opacity-75'
                    )}
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div className='space-y-1'>
                        <div className='flex items-center gap-1.5 flex-wrap'>
                          {loc.locationType === 'warehouse' ? (
                            <Warehouse className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                          ) : (
                            <Building2 className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                          )}
                          <span className='font-semibold text-xs text-foreground'>
                            {loc.locationName}
                          </span>
                          {loc.code && (
                            <span className='font-mono text-[10px] text-muted-foreground'>
                              ({loc.code})
                            </span>
                          )}
                          {isCurrent && (
                            <Badge
                              variant='default'
                              className='text-[9px] h-4 px-1.5 bg-primary/20 text-primary border-primary/30'
                            >
                              {t('salesOrders.stock.currentSelected', 'Active')}
                            </Badge>
                          )}
                          {loc.isLinkedToStore && !isCurrent && (
                            <Badge
                              variant='outline'
                              className='text-[9px] h-4 px-1.5 text-muted-foreground'
                            >
                              {t('salesOrders.stock.linkedToStore', 'Linked Store Warehouse')}
                            </Badge>
                          )}
                        </div>
                        <span className='text-[10px] text-muted-foreground block capitalize'>
                          {loc.locationType === 'warehouse'
                            ? t('salesOrders.stock.warehouseType', 'Fulfillment Warehouse')
                            : t('salesOrders.stock.storeType', 'Store Location')}
                        </span>
                      </div>

                      {/* Available Qty Badge */}
                      <div className='text-right shrink-0'>
                        <span
                          className={cn(
                            'font-mono font-bold text-xs px-2 py-0.5 rounded-full inline-block',
                            hasStock
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {loc.available} {t('salesOrders.stock.availUnits', 'avail.')}
                        </span>
                      </div>
                    </div>

                    {/* Stock Numbers (On Hand, Reserved, Available) */}
                    <div className='grid grid-cols-3 gap-2 text-center pt-2 border-t text-[11px] bg-muted/20 rounded p-1.5'>
                      <div>
                        <span className='text-[10px] text-muted-foreground block'>
                          {t('salesOrders.stock.onHand', 'On Hand')}
                        </span>
                        <span className='font-mono font-medium'>{loc.onHand}</span>
                      </div>
                      <div>
                        <span className='text-[10px] text-muted-foreground block'>
                          {t('salesOrders.stock.reserved', 'Reserved')}
                        </span>
                        <span className='font-mono font-medium text-amber-600 dark:text-amber-400'>
                          {loc.reserved}
                        </span>
                      </div>
                      <div>
                        <span className='text-[10px] text-muted-foreground block'>
                          {t('salesOrders.stock.available', 'Available')}
                        </span>
                        <span
                          className={cn(
                            'font-mono font-bold',
                            hasStock ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                          )}
                        >
                          {loc.available}
                        </span>
                      </div>
                    </div>

                    {/* Quick action to switch fulfillment warehouse if stock is available */}
                    {canSwitchToWarehouse && (
                      <div className='pt-1'>
                        <Button
                          type='button'
                          size='sm'
                          variant='secondary'
                          className='w-full h-8 text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30'
                          onClick={() => handleSwitchWarehouse(loc.locationId, loc.locationName)}
                        >
                          <CheckCircle2 className='mr-1.5 h-3.5 w-3.5 text-emerald-600' />
                          {t('salesOrders.stock.switchFulfillmentAction', 'Fulfill from this Warehouse')}
                          <ArrowRight className='ml-auto h-3.5 w-3.5 opacity-70' />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className='p-4 border-t bg-muted/20 flex items-center justify-between'>
          <p className='text-[11px] text-muted-foreground'>
            {t('salesOrders.stock.footerTip', 'Tip: You can change the fulfillment warehouse to fulfill this line item immediately.')}
          </p>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
          >
            {t('common.close', 'Close')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
