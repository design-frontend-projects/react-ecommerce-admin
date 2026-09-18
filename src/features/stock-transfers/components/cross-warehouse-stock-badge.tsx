import * as React from 'react'
import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  Warehouse,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  useCrossWarehouseStock,
  type WarehouseStockEntry,
} from '../hooks/use-stock-transfer-products'

export interface CrossWarehouseStockBadgeProps {
  productVariantId?: string | null
  sourceWarehouseId?: string | null
  sourceWarehouseName?: string | null
  requestedQty?: number
  onSwitchSourceWarehouse?: (warehouseId: string) => void
  compact?: boolean
}

export function CrossWarehouseStockBadge({
  productVariantId,
  sourceWarehouseId,
  sourceWarehouseName,
  requestedQty = 1,
  onSwitchSourceWarehouse,
  compact = false,
}: CrossWarehouseStockBadgeProps) {
  const { t } = useTranslation()
  const { isLoading, getOtherWarehousesWithStock, getStockForWarehouse } =
    useCrossWarehouseStock(productVariantId)

  if (!productVariantId) return null

  const originStock = getStockForWarehouse(sourceWarehouseId)
  const availableAtOrigin = originStock ? originStock.qtyAvailable : 0
  const isOutOfStockAtOrigin = availableAtOrigin <= 0
  const isInsufficientAtOrigin = availableAtOrigin < requestedQty

  // Don't display anything if stock is plenty and not out of stock
  if (!isInsufficientAtOrigin && availableAtOrigin > 0) {
    return null
  }

  const otherWarehouses = getOtherWarehousesWithStock(sourceWarehouseId)

  if (isLoading) {
    return (
      <div className='flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground'>
        <span className='h-2 w-2 animate-pulse rounded-full bg-amber-500' />
        {t(
          'stockTransfers.crossWarehouse.checking',
          'Checking cross-warehouse availability...'
        )}
      </div>
    )
  }

  if (compact) {
    return (
      <div className='flex flex-wrap items-center gap-1.5 pt-1 text-[11px]'>
        {isOutOfStockAtOrigin ? (
          <Badge
            variant='destructive'
            className='h-4 gap-1 px-1.5 py-0 text-[10px]'
          >
            <AlertTriangle className='h-2.5 w-2.5' />
            {t('stockTransfers.crossWarehouse.outOfStock', 'Out of Stock')}
          </Badge>
        ) : (
          <Badge
            variant='outline'
            className='h-4 border-amber-500/40 px-1.5 py-0 text-[10px] text-amber-600'
          >
            {t('stockTransfers.crossWarehouse.lowStock', {
              count: availableAtOrigin,
              defaultValue: `Low Stock (${availableAtOrigin})`,
            })}
          </Badge>
        )}

        {otherWarehouses.length > 0 ? (
          <span className='font-medium text-muted-foreground'>
            {t('stockTransfers.crossWarehouse.availableAtOtherWarehouses', {
              count: otherWarehouses.length,
              defaultValue: `Available at ${otherWarehouses.length} other warehouse${otherWarehouses.length > 1 ? 's' : ''}`,
            })}
          </span>
        ) : (
          <span className='text-[10px] text-destructive/80'>
            {t(
              'stockTransfers.crossWarehouse.noStockInOtherWarehouses',
              'No stock in other tenant warehouses'
            )}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className='mt-2 animate-in space-y-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs duration-200 fade-in'>
      {/* Alert Header */}
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300'>
          <AlertTriangle className='h-4 w-4 shrink-0 text-amber-600' />
          <span>
            {isOutOfStockAtOrigin
              ? t('stockTransfers.crossWarehouse.outOfStockAtOrigin', {
                  defaultValue: 'Out of Stock at {{warehouse}}',
                  warehouse: sourceWarehouseName || 'Source Warehouse',
                })
              : t('stockTransfers.crossWarehouse.insufficientStock', {
                  defaultValue:
                    'Insufficient Stock at {{warehouse}} ({{available}} available, {{requested}} requested)',
                  warehouse: sourceWarehouseName || 'Source Warehouse',
                  available: availableAtOrigin,
                  requested: requestedQty,
                })}
          </span>
        </div>

        <Badge
          variant='outline'
          className='bg-background/60 font-mono text-[10px]'
        >
          {t(
            'stockTransfers.crossWarehouse.tenantBalanceCheck',
            'Tenant Balance Check'
          )}
        </Badge>
      </div>

      {/* Other Warehouses with stock */}
      {otherWarehouses.length > 0 ? (
        <div className='space-y-1.5'>
          <p className='text-[11px] font-medium text-muted-foreground'>
            {t('stockTransfers.crossWarehouse.availableInOthers', {
              defaultValue:
                'Product is available in {{count}} other warehouse(s) of this tenant:',
              count: otherWarehouses.length,
            })}
          </p>

          <div className='grid grid-cols-1 gap-2 pt-0.5 sm:grid-cols-2'>
            {otherWarehouses.map((wh: WarehouseStockEntry) => (
              <div
                key={wh.warehouseId}
                className='flex items-center justify-between gap-2 rounded-md border bg-background/80 p-2 text-xs shadow-2xs'
              >
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-1 truncate'>
                    <Building2 className='h-3.5 w-3.5 shrink-0 text-primary' />
                    <span className='truncate font-semibold text-foreground'>
                      {wh.warehouseName}
                    </span>
                    <span className='font-mono text-[10px] text-muted-foreground'>
                      ({wh.warehouseCode})
                    </span>
                  </div>
                  <div className='mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground'>
                    <span className='font-bold text-emerald-600 dark:text-emerald-400'>
                      {t('stockTransfers.crossWarehouse.availableCount', {
                        count: wh.qtyAvailable,
                        defaultValue: `${wh.qtyAvailable} available`,
                      })}
                    </span>
                    <span>•</span>
                    <span>
                      {t('stockTransfers.crossWarehouse.onHandCount', {
                        count: wh.qtyOnHand,
                        defaultValue: `${wh.qtyOnHand} on hand`,
                      })}
                    </span>
                  </div>
                </div>

                {onSwitchSourceWarehouse && (
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={() => onSwitchSourceWarehouse(wh.warehouseId)}
                    className='h-7 shrink-0 gap-1 border-primary/40 px-2 text-[11px] hover:bg-primary/10 hover:text-primary'
                  >
                    <ArrowRightLeft className='h-3 w-3' />
                    <span>
                      {t(
                        'stockTransfers.crossWarehouse.switchOrigin',
                        'Switch Origin'
                      )}
                    </span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className='flex items-center gap-2 text-[11px] text-destructive'>
          <Warehouse className='h-3.5 w-3.5 shrink-0' />
          <span>
            {t('stockTransfers.crossWarehouse.noStockAnywhere', {
              defaultValue:
                'This item is currently out of stock across all tenant warehouses.',
            })}
          </span>
        </div>
      )}
    </div>
  )
}
