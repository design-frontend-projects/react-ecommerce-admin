import { useTranslation } from 'react-i18next'
import {
  Package,
  Warehouse,
  MapPin,
  Store,
  Boxes,
  ShieldCheck,
  Calendar,
  Pencil,
  Trash2,
  Copy,
  Check,
  DollarSign,
  Info,
} from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Can } from '@/components/rbac/Can'
import { useInventoryContext } from './inventory-provider'

export function InventoryDetailSheet() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow, openEdit, openDelete } = useInventoryContext()
  const [copiedId, setCopiedId] = useState(false)

  const isOpen = open === 'detail' && !!currentRow

  const handleCopyId = () => {
    if (!currentRow) return
    void navigator.clipboard.writeText(String(currentRow.inventory_id))
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  if (!currentRow) return null

  const product = currentRow.products
  const variant = currentRow.product_variants
  const warehouse = currentRow.warehouses
  const location = currentRow.warehouse_locations
  const store = currentRow.stores

  const onHand = Number(currentRow.qty_on_hand ?? currentRow.quantity ?? 0)
  const available = Number(currentRow.qty_available ?? onHand)
  const reserved = Number(currentRow.qty_reserved ?? 0)
  const minStock = currentRow.reorder_point ?? currentRow.min_quantity ?? currentRow.reorder_level ?? 0
  const maxStock = currentRow.max_quantity ?? currentRow.max_stock_level
  const avgCost = Number(currentRow.avg_cost ?? 0)
  const totalValuation = onHand * avgCost

  let statusBadge: { variant: 'default' | 'destructive' | 'secondary' | 'outline'; text: string } = {
    variant: 'default',
    text: t('inventory.status.inStock', 'In Stock'),
  }

  if (onHand === 0) {
    statusBadge = {
      variant: 'destructive',
      text: t('inventory.status.outOfStock', 'Out of Stock'),
    }
  } else if (onHand <= minStock) {
    statusBadge = {
      variant: 'secondary',
      text: t('inventory.status.lowStock', 'Low Stock'),
    }
  } else if (maxStock != null && onHand > maxStock) {
    statusBadge = {
      variant: 'outline',
      text: t('inventory.status.overstocked', 'Overstocked'),
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(val) => !val && setOpen(null)}>
      <SheetContent className='flex flex-col sm:max-w-md p-0 overflow-hidden'>
        {/* Top Header Banner */}
        <div className='relative bg-gradient-to-br from-primary/15 via-primary/5 to-background p-6 border-b'>
          <SheetHeader className='p-0 space-y-3'>
            <div className='flex items-start justify-between gap-2 pe-6'>
              <div className='flex items-center gap-3'>
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20'>
                  <Package className='h-6 w-6' />
                </div>
                <div>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <Badge variant={statusBadge.variant} className='text-xs font-semibold'>
                      {statusBadge.text}
                    </Badge>
                    {product?.sku && (
                      <Badge variant='outline' className='font-mono text-xs'>
                        SKU: {product.sku}
                      </Badge>
                    )}
                  </div>
                  <SheetTitle className='text-lg font-bold mt-1 text-foreground line-clamp-1'>
                    {product?.name || t('inventory.unknownProduct', 'Unknown Product')}
                  </SheetTitle>
                  {variant && (
                    <p className='text-xs text-muted-foreground font-mono mt-0.5'>
                      {variant.name || t('common.default', 'Default')} [{variant.sku}]
                    </p>
                  )}
                </div>
              </div>
            </div>

            <SheetDescription className='text-xs text-muted-foreground flex items-center gap-2'>
              <span>ID: #{currentRow.inventory_id}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-5 w-5 text-muted-foreground hover:text-foreground'
                      onClick={handleCopyId}
                    >
                      {copiedId ? (
                        <Check className='h-3 w-3 text-emerald-500' />
                      ) : (
                        <Copy className='h-3 w-3' />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side='bottom' className='text-xs'>
                    {copiedId ? t('common.copied', 'Copied!') : t('common.copyId', 'Copy ID')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Scrollable Content */}
        <div className='flex-1 overflow-y-auto px-6 py-5 space-y-6'>
          {/* Stock Quantities Card */}
          <div className='rounded-xl border bg-card p-4 space-y-3 shadow-xs'>
            <div className='flex items-center justify-between'>
              <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                <Boxes className='h-3.5 w-3.5 text-primary' />
                {t('inventory.detail.stockLevels', 'Live Stock Balances')}
              </h4>
              <Badge variant='outline' className='text-[10px] uppercase'>
                {currentRow.condition || 'good'}
              </Badge>
            </div>

            <div className='grid grid-cols-3 gap-2 text-center pt-1'>
              <div className='rounded-lg bg-muted/40 p-2.5'>
                <div className='text-xs text-muted-foreground font-medium'>
                  {t('inventory.columns.onHand', 'On-Hand')}
                </div>
                <div className='text-lg font-bold text-foreground mt-0.5'>
                  {onHand.toLocaleString()}
                </div>
              </div>
              <div className='rounded-lg bg-muted/40 p-2.5'>
                <div className='text-xs text-muted-foreground font-medium'>
                  {t('inventory.detail.available', 'Available')}
                </div>
                <div className='text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5'>
                  {available.toLocaleString()}
                </div>
              </div>
              <div className='rounded-lg bg-muted/40 p-2.5'>
                <div className='text-xs text-muted-foreground font-medium'>
                  {t('inventory.detail.reserved', 'Reserved')}
                </div>
                <div className='text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5'>
                  {reserved.toLocaleString()}
                </div>
              </div>
            </div>

            <div className='flex items-center gap-2 text-[11px] text-muted-foreground pt-1 bg-muted/20 p-2 rounded-md'>
              <Info className='h-3.5 w-3.5 shrink-0 text-primary' />
              <span>
                {t(
                  'inventory.detail.quantitiesNote',
                  'Actual quantities are maintained through stock movements & adjustments.'
                )}
              </span>
            </div>
          </div>

          {/* Physical Location Assignment Card */}
          <div className='rounded-xl border bg-card p-4 space-y-3 shadow-xs'>
            <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
              <Warehouse className='h-3.5 w-3.5 text-primary' />
              {t('inventory.detail.locationAssignment', 'Storage Location')}
            </h4>

            <div className='space-y-2.5 text-sm'>
              {warehouse ? (
                <div className='flex items-center justify-between'>
                  <span className='text-xs text-muted-foreground flex items-center gap-1.5'>
                    <Warehouse className='h-3.5 w-3.5 text-muted-foreground' />
                    {t('inventory.form.warehouse', 'Warehouse')}
                  </span>
                  <div className='flex items-center gap-1.5'>
                    <Badge variant='outline' className='font-mono text-xs'>
                      {warehouse.code}
                    </Badge>
                    <span className='font-medium'>{warehouse.name}</span>
                  </div>
                </div>
              ) : (
                <div className='text-xs text-muted-foreground italic'>
                  {t('inventory.detail.noWarehouse', 'No specific warehouse assigned')}
                </div>
              )}

              {location ? (
                <div className='flex items-center justify-between'>
                  <span className='text-xs text-muted-foreground flex items-center gap-1.5'>
                    <MapPin className='h-3.5 w-3.5 text-muted-foreground' />
                    {t('inventory.form.location', 'Bin / Location')}
                  </span>
                  <div className='flex items-center gap-1.5 text-end'>
                    <Badge variant='secondary' className='text-xs font-mono'>
                      {location.code}
                    </Badge>
                    {location.name && <span className='text-xs'>{location.name}</span>}
                  </div>
                </div>
              ) : null}

              {store && (
                <div className='flex items-center justify-between'>
                  <span className='text-xs text-muted-foreground flex items-center gap-1.5'>
                    <Store className='h-3.5 w-3.5 text-muted-foreground' />
                    {t('inventory.form.store', 'Assigned Store')}
                  </span>
                  <span className='font-medium text-xs'>{store.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Safety Thresholds */}
          <div className='rounded-xl border bg-card p-4 space-y-3 shadow-xs'>
            <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
              <ShieldCheck className='h-3.5 w-3.5 text-primary' />
              {t('inventory.detail.thresholds', 'Safety Thresholds')}
            </h4>

            <div className='grid grid-cols-2 gap-3 text-sm'>
              <div className='rounded-lg border p-3'>
                <span className='text-xs text-muted-foreground'>
                  {t('inventory.form.reorderPoint', 'Reorder Point (Min)')}
                </span>
                <div className='text-base font-bold text-foreground mt-1'>
                  {minStock}
                </div>
              </div>
              <div className='rounded-lg border p-3'>
                <span className='text-xs text-muted-foreground'>
                  {t('inventory.form.maxCapacity', 'Max Capacity')}
                </span>
                <div className='text-base font-bold text-foreground mt-1'>
                  {maxStock != null ? maxStock : '∞'}
                </div>
              </div>
            </div>
          </div>

          {/* Valuation & Costing */}
          <div className='rounded-xl border bg-card p-4 space-y-3 shadow-xs'>
            <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
              <DollarSign className='h-3.5 w-3.5 text-primary' />
              {t('inventory.detail.valuation', 'Valuation & Costing')}
            </h4>

            <div className='flex items-center justify-between text-sm py-1'>
              <span className='text-xs text-muted-foreground'>
                {t('inventory.detail.avgCost', 'Weighted Unit Cost')}
              </span>
              <span className='font-semibold font-mono'>
                ${avgCost.toFixed(2)}
              </span>
            </div>
            <Separator />
            <div className='flex items-center justify-between text-sm py-1'>
              <span className='text-xs text-muted-foreground'>
                {t('inventory.detail.totalValue', 'Total Stock Value')}
              </span>
              <span className='font-bold font-mono text-base text-emerald-600 dark:text-emerald-400'>
                ${totalValuation.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Date Tracking */}
          <div className='rounded-xl border bg-muted/30 p-3.5 space-y-2 text-xs text-muted-foreground'>
            <div className='flex items-center justify-between'>
              <span className='flex items-center gap-1.5'>
                <Calendar className='h-3.5 w-3.5' />
                {t('inventory.form.lastCountDate', 'Last Count Verified')}
              </span>
              <span className='font-medium text-foreground'>
                {currentRow.last_count_date
                  ? new Date(currentRow.last_count_date).toLocaleDateString()
                  : t('common.never', 'Never')}
              </span>
            </div>
            {currentRow.created_at && (
              <div className='flex items-center justify-between'>
                <span>{t('common.createdAt', 'Created')}</span>
                <span>{new Date(currentRow.created_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className='p-4 border-t bg-muted/20 flex items-center justify-between gap-2 mt-auto'>
          <Can permission='inventory.manage'>
            <Button
              variant='outline'
              size='sm'
              className='text-destructive hover:bg-destructive/10 gap-1.5'
              onClick={() => openDelete(currentRow)}
            >
              <Trash2 className='h-3.5 w-3.5' />
              {t('common.delete', 'Delete')}
            </Button>

            <Button
              size='sm'
              className='gap-1.5'
              onClick={() => openEdit(currentRow)}
            >
              <Pencil className='h-3.5 w-3.5' />
              {t('common.edit', 'Edit Settings')}
            </Button>
          </Can>
        </div>
      </SheetContent>
    </Sheet>
  )
}
