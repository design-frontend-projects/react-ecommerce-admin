import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import {
  Package,
  MapPin,
  Layers,
  DollarSign,
  FileText,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  ExternalLink,
  Tag,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { MovementRow } from '../data/schema'

export interface InventoryMovementsDrawerProps {
  movement: MovementRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InventoryMovementsDrawer({
  movement,
  open,
  onOpenChange,
}: InventoryMovementsDrawerProps) {
  const { t } = useTranslation()

  if (!movement) {
    return null
  }

  const delta = movement.quantity_delta
  const isInbound = delta > 0 || movement.qty_in > 0
  const isOutbound = delta < 0 || movement.qty_out > 0

  const typeLabel = t(
    `inventoryMovements.types.${movement.movement_type}`,
    movement.movement_type.replace(/_/g, ' ')
  )

  const formattedDate = new Date(movement.movement_date).toLocaleString(
    undefined,
    { dateStyle: 'full', timeStyle: 'medium' }
  )

  const occurredAtFormatted = movement.occurred_at
    ? new Date(movement.occurred_at).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null

  const createdAtFormatted = movement.created_at
    ? new Date(movement.created_at).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null

  const locationName =
    movement.warehouses?.name ??
    movement.stores?.name ??
    movement.branches?.name ??
    t('common.unspecified', '—')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='sm:max-w-xl w-full flex flex-col gap-0 p-0 overflow-y-auto'
      >
        <SheetHeader className='p-6 pb-4 border-b bg-muted/20'>
          <div className='flex items-center justify-between gap-2'>
            <Badge
              variant='outline'
              className={
                isInbound
                  ? 'border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 capitalize text-xs gap-1'
                  : isOutbound
                    ? 'border-rose-500/40 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 capitalize text-xs gap-1'
                    : 'border-slate-500/40 bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300 capitalize text-xs gap-1'
              }
            >
              {isInbound ? (
                <ArrowDownRight className='h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400' />
              ) : isOutbound ? (
                <ArrowUpRight className='h-3.5 w-3.5 text-rose-600 dark:text-rose-400' />
              ) : null}
              <span>{typeLabel}</span>
            </Badge>

            {movement.condition && (
              <Badge variant='secondary' className='text-[10px] uppercase font-mono'>
                {movement.condition}
              </Badge>
            )}
          </div>

          <SheetTitle className='text-xl font-bold tracking-tight mt-2'>
            {movement.movement_no
              ? `${t('inventoryMovements.drawer.movementNumber', 'Movement')} #${movement.movement_no}`
              : t('inventoryMovements.drawer.title', 'Movement Audit Details')}
          </SheetTitle>
          <SheetDescription className='text-xs text-muted-foreground'>
            {t(
              'inventoryMovements.drawer.description',
              'Comprehensive immutable ledger transaction inspection'
            )}
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 p-6 space-y-6'>
          {/* Section: Quantity & Balances */}
          <div className='rounded-lg border bg-card p-4 space-y-3 shadow-2xs'>
            <div className='flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              <Layers className='h-3.5 w-3.5 text-primary' />
              <span>{t('inventoryMovements.drawer.quantityInfo', 'Quantity & Balances')}</span>
            </div>
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 text-center'>
              <div className='p-2.5 rounded-md bg-muted/40 flex flex-col justify-center'>
                <span className='text-[11px] text-muted-foreground font-medium'>
                  {t('inventoryMovements.drawer.quantityDelta', 'Net Delta')}
                </span>
                <span
                  className={`text-lg font-bold font-mono ${
                    delta > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : delta < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-foreground'
                  }`}
                >
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              </div>

              <div className='p-2.5 rounded-md bg-muted/40 flex flex-col justify-center'>
                <span className='text-[11px] text-muted-foreground font-medium'>
                  {t('inventoryMovements.drawer.balanceBefore', 'Stock Before')}
                </span>
                <span className='text-lg font-bold font-mono text-foreground'>
                  {movement.qty_before != null ? movement.qty_before : '—'}
                </span>
              </div>

              <div className='p-2.5 rounded-md bg-muted/40 flex flex-col justify-center'>
                <span className='text-[11px] text-muted-foreground font-medium'>
                  {t('inventoryMovements.drawer.balanceAfter', 'Stock After')}
                </span>
                <span className='text-lg font-bold font-mono text-foreground'>
                  {movement.qty_after != null ? movement.qty_after : '—'}
                </span>
              </div>

              <div className='p-2.5 rounded-md bg-muted/40 flex flex-col justify-center'>
                <span className='text-[11px] text-muted-foreground font-medium'>
                  {isInbound
                    ? t('inventoryMovements.drawer.qtyIn', 'Inbound')
                    : t('inventoryMovements.drawer.qtyOut', 'Outbound')}
                </span>
                <span className='text-lg font-bold font-mono text-foreground'>
                  {isInbound ? movement.qty_in : movement.qty_out}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Product Information */}
          <div className='rounded-lg border bg-card p-4 space-y-3 shadow-2xs'>
            <div className='flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              <Package className='h-3.5 w-3.5 text-primary' />
              <span>{t('inventoryMovements.drawer.productInfo', 'Product Information')}</span>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs'>
              <div>
                <span className='text-muted-foreground block text-[11px]'>
                  {t('inventoryMovements.drawer.variantName', 'Variant Name')}
                </span>
                <span className='font-semibold text-foreground text-sm'>
                  {movement.product_variants?.name ?? t('common.unnamed', 'Unnamed Product')}
                </span>
              </div>
              <div>
                <span className='text-muted-foreground block text-[11px]'>
                  {t('inventoryMovements.drawer.sku', 'SKU')}
                </span>
                <span className='font-mono font-medium text-foreground bg-muted/50 px-2 py-0.5 rounded text-xs'>
                  {movement.product_variants?.sku ?? movement.product_variant_id}
                </span>
              </div>
              {movement.product_variants?.barcode && (
                <div>
                  <span className='text-muted-foreground block text-[11px]'>
                    {t('inventoryMovements.drawer.barcode', 'Barcode')}
                  </span>
                  <span className='font-mono text-muted-foreground'>
                    {movement.product_variants.barcode}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section: Location & Valuation */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {/* Location */}
            <div className='rounded-lg border bg-card p-4 space-y-2 shadow-2xs'>
              <div className='flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                <MapPin className='h-3.5 w-3.5 text-primary' />
                <span>{t('inventoryMovements.drawer.locationInfo', 'Location')}</span>
              </div>
              <div className='text-xs space-y-1.5'>
                <div className='font-medium text-foreground text-sm'>
                  {locationName}
                  {movement.warehouses?.code && ` (${movement.warehouses.code})`}
                </div>
                {movement.warehouse_locations && (
                  <div className='text-muted-foreground'>
                    <span className='font-medium'>{t('inventoryMovements.drawer.binLocation', 'Bin')}: </span>
                    <span className='font-mono bg-muted/60 px-1.5 py-0.5 rounded text-[11px]'>
                      {movement.warehouse_locations.code ?? movement.warehouse_locations.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Valuation */}
            <div className='rounded-lg border bg-card p-4 space-y-2 shadow-2xs'>
              <div className='flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                <DollarSign className='h-3.5 w-3.5 text-primary' />
                <span>{t('inventoryMovements.drawer.valuationInfo', 'Valuation & Cost')}</span>
              </div>
              <div className='text-xs space-y-1.5'>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>{t('inventoryMovements.drawer.unitCost', 'Unit Cost')}:</span>
                  <span className='font-mono font-medium text-foreground'>
                    ${Number(movement.unit_cost ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-muted-foreground'>{t('inventoryMovements.drawer.totalCost', 'Total Valuation')}:</span>
                  <span className='font-mono font-bold text-foreground text-sm'>
                    ${Number(movement.total_cost ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Tracking & Batches (if present) */}
          {(movement.batch_id || movement.serial_id) && (
            <div className='rounded-lg border bg-card p-4 space-y-3 shadow-2xs'>
              <div className='flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                <Tag className='h-3.5 w-3.5 text-primary' />
                <span>{t('inventoryMovements.drawer.trackingInfo', 'Tracking & Batches')}</span>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs'>
                {movement.batch_id && (
                  <div>
                    <span className='text-muted-foreground block text-[11px]'>
                      {t('inventoryMovements.drawer.batchId', 'Batch Number')}
                    </span>
                    <span className='font-mono font-medium text-foreground'>
                      {movement.batch_id}
                    </span>
                  </div>
                )}
                {movement.serial_id && (
                  <div>
                    <span className='text-muted-foreground block text-[11px]'>
                      {t('inventoryMovements.drawer.serialId', 'Serial Number')}
                    </span>
                    <span className='font-mono font-medium text-foreground'>
                      {movement.serial_id}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: Source & Provenance */}
          <div className='rounded-lg border bg-card p-4 space-y-3 shadow-2xs'>
            <div className='flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              <FileText className='h-3.5 w-3.5 text-primary' />
              <span>{t('inventoryMovements.drawer.provenanceInfo', 'Document Reference & Notes')}</span>
            </div>
            <div className='space-y-2 text-xs'>
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <span className='text-muted-foreground block text-[11px]'>
                    {t('inventoryMovements.drawer.referenceType', 'Reference Type')}
                  </span>
                  <span className='font-medium text-foreground capitalize'>
                    {movement.reference_type ? movement.reference_type.replace(/_/g, ' ') : '—'}
                  </span>
                </div>
                <div>
                  <span className='text-muted-foreground block text-[11px]'>
                    {t('inventoryMovements.drawer.referenceId', 'Reference ID')}
                  </span>
                  <span className='font-mono text-muted-foreground truncate block'>
                    {movement.reference_id ?? '—'}
                  </span>
                </div>
              </div>

              {movement.remarks && (
                <div className='pt-2 border-t'>
                  <span className='text-muted-foreground block text-[11px] mb-0.5'>
                    {t('inventoryMovements.drawer.remarks', 'Remarks')}
                  </span>
                  <p className='text-foreground text-xs leading-relaxed bg-muted/30 p-2 rounded'>
                    {movement.remarks}
                  </p>
                </div>
              )}

              {movement.notes && (
                <div className='pt-1'>
                  <span className='text-muted-foreground block text-[11px] mb-0.5'>
                    {t('inventoryMovements.drawer.notes', 'Notes')}
                  </span>
                  <p className='text-muted-foreground text-xs leading-relaxed'>
                    {movement.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section: Timestamp & Audit Metadata */}
          <div className='rounded-lg border bg-muted/20 p-4 text-xs space-y-2'>
            <div className='flex items-center gap-1.5 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]'>
              <Clock className='h-3.5 w-3.5 text-primary' />
              <span>{t('inventoryMovements.drawer.timestamp', 'Audit Timestamps')}</span>
            </div>
            <div className='space-y-1 text-muted-foreground'>
              <div>
                <span className='font-medium text-foreground'>Movement Date: </span>
                {formattedDate}
              </div>
              {occurredAtFormatted && (
                <div>
                  <span className='font-medium text-foreground'>Occurred At: </span>
                  {occurredAtFormatted}
                </div>
              )}
              {createdAtFormatted && (
                <div>
                  <span className='font-medium text-foreground'>Ledger Recorded At: </span>
                  {createdAtFormatted}
                </div>
              )}
            </div>
          </div>
        </div>

        <SheetFooter className='p-4 border-t bg-muted/20 flex flex-row items-center justify-between sm:justify-between'>
          {movement.reference_type === 'inventory_transaction' || movement.source_document_type ? (
            <Link
              to='/inventory-transactions'
              className='text-xs font-medium text-primary hover:underline inline-flex items-center gap-1'
            >
              <span>{t('inventoryMovements.drawer.viewTransaction', 'View Linked Transaction')}</span>
              <ExternalLink className='h-3.5 w-3.5' />
            </Link>
          ) : (
            <div />
          )}

          <SheetClose asChild>
            <Button variant='outline' size='sm' className='text-xs'>
              {t('inventoryMovements.drawer.close', 'Close')}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
