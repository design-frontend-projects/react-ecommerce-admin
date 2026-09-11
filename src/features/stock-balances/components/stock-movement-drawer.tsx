import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { History, ArrowUpRight, ArrowDownRight, RefreshCw, Calendar, FileText } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { StockBalanceRow } from '../data/schema'
import { useStockBalanceMovements } from '../hooks/use-stock-balances'

interface Props {
  currentRow: StockBalanceRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const getMovementBadgeVariants = (
  t: TFunction
): Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; colorClass: string }
> => ({
  purchase: {
    label: t('stockBalances.movementTypes.purchase', 'Purchase In'),
    variant: 'default',
    colorClass: 'bg-emerald-600 text-white hover:bg-emerald-700',
  },
  sale: {
    label: t('stockBalances.movementTypes.sale', 'Sale Out'),
    variant: 'default',
    colorClass: 'bg-blue-600 text-white hover:bg-blue-700',
  },
  adjustment_in: {
    label: t('stockBalances.movementTypes.adjustment_in', 'Adjustment In'),
    variant: 'default',
    colorClass: 'bg-teal-600 text-white hover:bg-teal-700',
  },
  adjustment_out: {
    label: t('stockBalances.movementTypes.adjustment_out', 'Adjustment Out'),
    variant: 'default',
    colorClass: 'bg-amber-600 text-white hover:bg-amber-700',
  },
  damage: {
    label: t('stockBalances.movementTypes.damage', 'Damage'),
    variant: 'destructive',
    colorClass: '',
  },
  expired: {
    label: t('stockBalances.movementTypes.expired', 'Expired'),
    variant: 'destructive',
    colorClass: '',
  },
  transfer_in: {
    label: t('stockBalances.movementTypes.transfer_in', 'Transfer In'),
    variant: 'secondary',
    colorClass: 'bg-purple-600 text-white hover:bg-purple-700',
  },
  transfer_out: {
    label: t('stockBalances.movementTypes.transfer_out', 'Transfer Out'),
    variant: 'secondary',
    colorClass: 'bg-purple-700 text-white hover:bg-purple-800',
  },
  opening_stock: {
    label: t('stockBalances.movementTypes.opening_stock', 'Opening Stock'),
    variant: 'outline',
    colorClass: 'border-emerald-500 text-emerald-600',
  },
  cycle_count_in: {
    label: t('stockBalances.movementTypes.cycle_count_in', 'Count Gain'),
    variant: 'default',
    colorClass: 'bg-emerald-500 text-white',
  },
  cycle_count_out: {
    label: t('stockBalances.movementTypes.cycle_count_out', 'Count Loss'),
    variant: 'destructive',
    colorClass: '',
  },
})

export function StockMovementDrawer({ currentRow, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const movementBadgeVariants = useMemo(() => getMovementBadgeVariants(t), [t])

  const facility = currentRow
    ? {
        warehouseId: currentRow.warehouse_id,
        storeId: currentRow.store_id,
      }
    : undefined

  const { data: movements = [], isLoading } = useStockBalanceMovements(
    currentRow?.product_variant_id,
    facility
  )

  const productName =
    currentRow?.product_variants?.products?.name ||
    t('stockBalances.columns.unknownProduct', 'Product')
  const sku = currentRow?.product_variants?.sku || '—'
  const facilityName =
    currentRow?.warehouses?.name ||
    currentRow?.stores?.name ||
    t('stockBalances.movementsDrawer.allFacilities', 'All Facilities')
  const locationCode = currentRow?.warehouse_locations?.code
    ? `${t('stockBalances.columns.bin', 'Bin')}: ${currentRow.warehouse_locations.code}`
    : ''

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex w-full flex-col sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle className='flex items-center gap-2 text-xl font-bold'>
            <History className='h-5 w-5 text-primary' />
            {t('stockBalances.movementsDrawer.title', 'Movement Audit Ledger')}
          </SheetTitle>
          <SheetDescription asChild>
            <div className='space-y-1 text-sm'>
              <div className='font-semibold text-foreground'>{productName}</div>
              <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                <span>
                  {t('stockBalances.columns.sku', 'SKU')}: {sku}
                </span>
                <span>•</span>
                <span>
                  {facilityName} {locationCode && `(${locationCode})`}
                </span>
              </div>
            </div>
          </SheetDescription>
        </SheetHeader>

        {/* Header Snapshot Card */}
        {currentRow && (
          <div className='mt-3 grid grid-cols-3 gap-2 rounded-lg border bg-muted/40 p-3 text-center'>
            <div>
              <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                {t('stockBalances.movementsDrawer.onHand', 'On Hand')}
              </span>
              <p className='font-mono text-lg font-bold'>
                {Number(currentRow.qty_on_hand).toLocaleString()}
              </p>
            </div>
            <div>
              <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                {t('stockBalances.movementsDrawer.reserved', 'Reserved')}
              </span>
              <p className='font-mono text-lg font-bold text-muted-foreground'>
                {Number(currentRow.qty_reserved).toLocaleString()}
              </p>
            </div>
            <div>
              <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                {t('stockBalances.movementsDrawer.available', 'Available')}
              </span>
              <p className='font-mono text-lg font-bold text-primary'>
                {Number(currentRow.qty_available ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        <div className='mt-4 flex items-center justify-between border-b pb-2 text-xs font-semibold uppercase text-muted-foreground'>
          <span>{t('stockBalances.movementsDrawer.auditHistory', 'Audit History')}</span>
          <span>
            {t('stockBalances.movementsDrawer.recordsCount', {
              count: movements.length,
              defaultValue: `${movements.length} Record(s)`,
            })}
          </span>
        </div>

        <ScrollArea className='flex-1 pe-3'>
          {isLoading ? (
            <div className='space-y-3 py-4'>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className='space-y-2 rounded-md border p-3'>
                  <Skeleton className='h-4 w-1/3' />
                  <Skeleton className='h-3 w-2/3' />
                  <Skeleton className='h-3 w-1/2' />
                </div>
              ))}
            </div>
          ) : movements.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-center text-muted-foreground'>
              <History className='h-10 w-10 stroke-[1.5] text-muted-foreground/40' />
              <p className='mt-2 font-medium'>
                {t('stockBalances.movementsDrawer.noMovementsTitle', 'No inventory movements recorded yet')}
              </p>
              <p className='text-xs'>
                {t(
                  'stockBalances.movementsDrawer.noMovementsDesc',
                  'Movements will appear here once purchases, adjustments, or sales occur.'
                )}
              </p>
            </div>
          ) : (
            <div className='space-y-3 py-3'>
              {movements.map((mov) => {
                const delta = Number(mov.quantity_delta || 0)
                const isPositive = delta > 0
                const badgeInfo = movementBadgeVariants[mov.movement_type] || {
                  label: mov.movement_type.replace(/_/g, ' '),
                  variant: 'outline',
                  colorClass: '',
                }

                return (
                  <div
                    key={mov.id}
                    className='relative rounded-lg border bg-card p-3 shadow-xs transition-colors hover:bg-muted/30'
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-1.5'>
                        <Badge
                          variant={badgeInfo.variant}
                          className={`text-[11px] capitalize ${badgeInfo.colorClass}`}
                        >
                          {badgeInfo.label}
                        </Badge>
                        {mov.condition && mov.condition !== 'good' && (
                          <Badge variant='outline' className='text-[10px] uppercase text-amber-600'>
                            {t(`stockBalances.conditions.${mov.condition}`, mov.condition)}
                          </Badge>
                        )}
                      </div>

                      <div className='flex items-center gap-1 font-mono font-bold text-sm'>
                        {isPositive ? (
                          <ArrowUpRight className='h-4 w-4 text-emerald-600' />
                        ) : (
                          <ArrowDownRight className='h-4 w-4 text-destructive' />
                        )}
                        <span className={isPositive ? 'text-emerald-600' : 'text-destructive'}>
                          {isPositive ? `+${delta.toLocaleString()}` : delta.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Before & After Qty */}
                    {(mov.qty_before !== null || mov.qty_after !== null) && (
                      <div className='mt-2 flex items-center justify-between text-xs text-muted-foreground'>
                        <span>
                          {t('stockBalances.movementsDrawer.before', 'Before:')}{' '}
                          <strong className='font-mono text-foreground'>
                            {Number(mov.qty_before ?? 0).toLocaleString()}
                          </strong>
                        </span>
                        <RefreshCw className='h-3 w-3 text-muted-foreground/50' />
                        <span>
                          {t('stockBalances.movementsDrawer.after', 'After:')}{' '}
                          <strong className='font-mono text-foreground'>
                            {Number(mov.qty_after ?? 0).toLocaleString()}
                          </strong>
                        </span>
                      </div>
                    )}

                    {/* Remarks / Reason */}
                    {(mov.remarks || mov.reason_code) && (
                      <div className='mt-2 flex items-start gap-1 text-xs text-muted-foreground'>
                        <FileText className='mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60' />
                        <span className='line-clamp-2'>
                          {mov.reason_code ? `[${mov.reason_code}] ` : ''}
                          {mov.remarks}
                        </span>
                      </div>
                    )}

                    {/* Footer Date & Reference */}
                    <div className='mt-2.5 flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground'>
                      <div className='flex items-center gap-1'>
                        <Calendar className='h-3 w-3' />
                        {new Date(mov.movement_date).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      {mov.reference_type && (
                        <span className='font-mono text-[10px] text-muted-foreground/80'>
                          {t('stockBalances.movementsDrawer.ref', 'Ref:')} {mov.reference_type}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
