import { useTranslation } from 'react-i18next'
import {
  Calendar,
  Layers,
  MapPin,
  Clock,
  ShieldCheck,
  Building2,
  FileText,
  DollarSign,
  AlertTriangle,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useFormatters } from '@/lib/formatters'
import type { BatchListItem } from '../data/schema'

interface BatchDetailsSheetProps {
  batch: BatchListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BatchDetailsSheet({
  batch,
  open,
  onOpenChange,
}: BatchDetailsSheetProps) {
  const { t } = useTranslation()
  const { formatCurrency, formatDate } = useFormatters()

  if (!batch) return null

  const getUrgencyBadge = () => {
    if (batch.status === 'expired' || (batch.days_until_expiry !== null && batch.days_until_expiry !== undefined && batch.days_until_expiry <= 0)) {
      return (
        <Badge variant='destructive' className='gap-1'>
          <AlertTriangle className='h-3 w-3' />
          {t('batches.columns.expired', 'Expired')}
        </Badge>
      )
    }
    if (batch.expiry_urgency === 'critical') {
      return (
        <Badge variant='destructive' className='bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1'>
          <Clock className='h-3 w-3' />
          {t('batches.columns.daysLeft', {
            days: batch.days_until_expiry,
            defaultValue: `${batch.days_until_expiry} days left`,
          })}
        </Badge>
      )
    }
    if (batch.expiry_urgency === 'warning') {
      return (
        <Badge variant='secondary' className='bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1'>
          <Clock className='h-3 w-3' />
          {t('batches.columns.daysLeft', {
            days: batch.days_until_expiry,
            defaultValue: `${batch.days_until_expiry} days left`,
          })}
        </Badge>
      )
    }
    if (batch.expiry_date) {
      return (
        <Badge variant='outline' className='text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1'>
          <ShieldCheck className='h-3 w-3' />
          {t('batches.columns.healthy', 'Healthy')}
        </Badge>
      )
    }
    return (
      <Badge variant='outline' className='text-muted-foreground'>
        {t('batches.columns.noExpiry', 'No Expiry')}
      </Badge>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full sm:max-w-xl overflow-y-auto'>
        <SheetHeader className='pb-4 border-b text-start'>
          <div className='flex items-center justify-between gap-2 pe-6'>
            <div className='flex items-center gap-2'>
              <Layers className='h-5 w-5 text-primary' />
              <SheetTitle className='text-lg font-bold'>
                {batch.batch_number}
              </SheetTitle>
            </div>
            <div className='flex items-center gap-2'>
              {getUrgencyBadge()}
              <Badge
                variant={
                  batch.status === 'active'
                    ? 'default'
                    : batch.status === 'expired'
                      ? 'destructive'
                      : 'secondary'
                }
                className='capitalize'
              >
                {t(`batches.status.${batch.status}`, batch.status)}
              </Badge>
            </div>
          </div>
          <SheetDescription>
            {t('batches.details.subtitle', 'Complete history, quality flags, and bin locations for lot')}{' '}
            <span className='font-mono font-semibold text-foreground'>
              {batch.batch_number}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className='space-y-6 py-4'>
          {/* Product Variant Details */}
          <div className='rounded-lg border bg-card p-4 space-y-3'>
            <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5'>
              <Layers className='h-3.5 w-3.5 text-primary' />
              {t('batches.details.overview', 'Overview')}
            </h4>
            <div className='grid grid-cols-2 gap-3 text-sm'>
              <div>
                <span className='text-xs text-muted-foreground block'>
                  {t('batches.details.sku', 'SKU')}
                </span>
                <span className='font-mono font-medium text-foreground'>
                  {batch.product_variants?.sku || '—'}
                </span>
              </div>
              <div>
                <span className='text-xs text-muted-foreground block'>
                  {t('batches.details.barcode', 'Barcode')}
                </span>
                <span className='font-mono text-muted-foreground'>
                  {batch.product_variants?.barcode || '—'}
                </span>
              </div>
              <div className='col-span-2'>
                <span className='text-xs text-muted-foreground block'>
                  {t('batches.details.productName', 'Product Name')}
                </span>
                <span className='font-medium text-foreground'>
                  {batch.product_variants?.products?.name ||
                    batch.product_variants?.name ||
                    '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Supplier & Sourcing */}
          <div className='rounded-lg border bg-card p-4 space-y-3'>
            <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5'>
              <Building2 className='h-3.5 w-3.5 text-primary' />
              {t('batches.columns.supplier', 'Supplier')}
            </h4>
            <div className='grid grid-cols-2 gap-3 text-sm'>
              <div>
                <span className='text-xs text-muted-foreground block'>
                  {t('batches.columns.supplier', 'Supplier Name')}
                </span>
                <span className='font-medium text-foreground'>
                  {batch.suppliers?.name ||
                    t('batches.form.noSupplier', 'No supplier assigned')}
                </span>
              </div>
              <div>
                <span className='text-xs text-muted-foreground block'>
                  {t('batches.details.supplierCode', 'Supplier Code')}
                </span>
                <span className='font-mono text-muted-foreground'>
                  {batch.suppliers?.code || '—'}
                </span>
              </div>
              <div>
                <span className='text-xs text-muted-foreground block'>
                  {t('batches.details.referenceType', 'Received Via')}
                </span>
                <span className='capitalize font-medium text-foreground'>
                  {batch.received_reference_type ||
                    t('batches.details.noReference', 'Direct Lot Entry')}
                </span>
              </div>
              <div>
                <span className='text-xs text-muted-foreground block'>
                  {t('batches.details.referenceId', 'Reference ID')}
                </span>
                <span className='font-mono text-xs text-muted-foreground truncate block'>
                  {batch.received_reference_id || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Lifecycle & Dates */}
          <div className='rounded-lg border bg-card p-4 space-y-3'>
            <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5'>
              <Calendar className='h-3.5 w-3.5 text-primary' />
              {t('batches.form.mfgDate', 'Manufacturing Date')} & {t('batches.form.expiryDate', 'Expiry Date')}
            </h4>
            <div className='grid grid-cols-2 gap-3 text-sm'>
              <div>
                <span className='text-xs text-muted-foreground block'>
                  {t('batches.form.mfgDate', 'Manufacturing Date')}
                </span>
                <span className='font-medium text-foreground'>
                  {batch.manufacture_date
                    ? formatDate(batch.manufacture_date)
                    : '—'}
                </span>
              </div>
              <div>
                <span className='text-xs text-muted-foreground block'>
                  {t('batches.form.expiryDate', 'Expiry Date')}
                </span>
                <span className='font-medium text-foreground'>
                  {batch.expiry_date ? formatDate(batch.expiry_date) : '—'}
                </span>
              </div>
              <div className='col-span-2'>
                <span className='text-xs text-muted-foreground block'>
                  {t('batches.filters.urgency', 'Expiry Urgency')}
                </span>
                <div className='mt-1'>{getUrgencyBadge()}</div>
              </div>
            </div>
          </div>

          {/* Financials & Stock Quantities */}
          <div className='rounded-lg border bg-card p-4 space-y-3'>
            <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5'>
              <DollarSign className='h-3.5 w-3.5 text-primary' />
              {t('batches.details.financials', 'Financials & Valuation')}
            </h4>
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm'>
              <div className='rounded-md bg-muted/40 p-2.5'>
                <span className='text-xs text-muted-foreground block'>
                  {t('batches.details.qtyOnHand', 'On Hand')}
                </span>
                <span className='text-lg font-bold text-foreground'>
                  {batch.qty_on_hand.toLocaleString()}
                </span>
              </div>
              <div className='rounded-md bg-muted/40 p-2.5'>
                <span className='text-xs text-muted-foreground block'>
                  {t('batches.details.qtyReserved', 'Reserved')}
                </span>
                <span className='text-lg font-bold text-amber-600 dark:text-amber-400'>
                  {batch.qty_reserved.toLocaleString()}
                </span>
              </div>
              <div className='rounded-md bg-muted/40 p-2.5'>
                <span className='text-xs text-muted-foreground block'>
                  {t('batches.details.qtyAvailable', 'Available')}
                </span>
                <span className='text-lg font-bold text-emerald-600 dark:text-emerald-400'>
                  {batch.qty_available.toLocaleString()}
                </span>
              </div>
              <div className='rounded-md bg-muted/40 p-2.5'>
                <span className='text-xs text-muted-foreground block'>
                  {t('batches.columns.unitCost', 'Unit Cost')}
                </span>
                <span className='text-lg font-bold text-foreground'>
                  {formatCurrency(batch.unit_cost)}
                </span>
              </div>
              <div className='col-span-2 sm:col-span-4 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center justify-between'>
                <span className='text-xs font-medium text-emerald-700 dark:text-emerald-300'>
                  {t('batches.details.totalValuation', 'Total Lot Valuation')}
                </span>
                <span className='text-lg font-extrabold text-emerald-700 dark:text-emerald-300'>
                  {formatCurrency(batch.total_value)}
                </span>
              </div>
            </div>
          </div>

          {/* Warehouse Bin Locations Breakdown */}
          <div className='rounded-lg border bg-card p-4 space-y-3'>
            <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5'>
              <MapPin className='h-3.5 w-3.5 text-primary' />
              {t('batches.details.locations', 'Warehouse Locations Breakdown')}
            </h4>
            {batch.locations && batch.locations.length > 0 ? (
              <div className='space-y-2'>
                {batch.locations.map((loc, idx) => (
                  <div
                    key={idx}
                    className='rounded-md border p-2.5 text-xs flex flex-wrap items-center justify-between gap-2 bg-muted/20'
                  >
                    <div>
                      <div className='font-semibold text-foreground flex items-center gap-1'>
                        <Building2 className='h-3 w-3 text-muted-foreground' />
                        {loc.warehouse_name}{' '}
                        {loc.warehouse_code ? `(${loc.warehouse_code})` : ''}
                      </div>
                      <div className='text-muted-foreground mt-0.5'>
                        {t('batches.details.binLocation', 'Bin')}:{' '}
                        <span className='font-mono font-medium text-foreground'>
                          {loc.location_code}
                        </span>{' '}
                        {loc.aisle ? `• Aisle ${loc.aisle}` : ''}{' '}
                        {loc.shelf ? `• Shelf ${loc.shelf}` : ''}
                      </div>
                    </div>
                    <div className='flex items-center gap-3'>
                      <Badge variant='outline' className='capitalize text-[10px]'>
                        {loc.condition}
                      </Badge>
                      <div className='text-end'>
                        <div className='font-bold text-foreground'>
                          {loc.qty_on_hand.toLocaleString()}{' '}
                          <span className='font-normal text-muted-foreground'>
                            {t('batches.table.onHand', 'On hand')}
                          </span>
                        </div>
                        {loc.qty_reserved > 0 ? (
                          <div className='text-[10px] text-amber-600 dark:text-amber-400'>
                            {loc.qty_reserved.toLocaleString()}{' '}
                            {t('batches.table.reserved', 'Reserved')}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground'>
                {t(
                  'batches.details.noLocations',
                  'No stock currently placed in warehouse bins for this lot.'
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          {batch.notes ? (
            <div className='rounded-lg border bg-card p-4 space-y-2'>
              <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5'>
                <FileText className='h-3.5 w-3.5 text-primary' />
                {t('batches.form.notes', 'Notes / Inspection Remarks')}
              </h4>
              <p className='text-xs text-foreground whitespace-pre-wrap leading-relaxed'>
                {batch.notes}
              </p>
            </div>
          ) : null}

          {/* System Audit Timestamps */}
          <Separator />
          <div className='grid grid-cols-2 gap-2 text-[11px] text-muted-foreground'>
            <div>
              <span>{t('batches.details.createdAt', 'Registered On')}: </span>
              <span className='font-medium text-foreground'>
                {formatDate(batch.created_at)}
              </span>
            </div>
            {batch.updated_at ? (
              <div className='text-end'>
                <span>{t('batches.details.updatedAt', 'Last Modified')}: </span>
                <span className='font-medium text-foreground'>
                  {formatDate(batch.updated_at)}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
