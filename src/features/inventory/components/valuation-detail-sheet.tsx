import { useTranslation } from 'react-i18next'
import {
  DollarSign,
  Package,
  Warehouse,
  Truck,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
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
import type { ValuationItemRow } from '../data/valuation-schema'

interface ValuationDetailSheetProps {
  item: ValuationItemRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  currencySymbol?: string
}

export function ValuationDetailSheet({
  item,
  open,
  onOpenChange,
  currencySymbol,
}: ValuationDetailSheetProps) {
  const { t } = useTranslation()

  if (!item) return null

  const symbol = currencySymbol || item.currencySymbol || '$'
  const formatPrice = (amount: number) => {
    const formatted = amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    const sym = symbol.trim()
    const needsSpace = sym.length > 1 && !sym.endsWith(' ')
    return needsSpace ? `${sym} ${formatted}` : `${sym}${formatted}`
  }

  const avcoTotal = item.onHand * item.avcoUnitCost
  const standardTotal = item.onHand * item.standardUnitCost
  const fifoTotal = item.onHand * item.fifoUnitCost

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full sm:max-w-lg overflow-y-auto p-6 space-y-6'>
        {/* Header */}
        <SheetHeader className='space-y-1.5 text-start'>
          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='font-mono text-xs font-semibold'>
              {item.sku}
            </Badge>
            {item.condition && (
              <Badge
                variant='secondary'
                className='text-[10px] font-semibold uppercase tracking-wider'
              >
                {item.condition}
              </Badge>
            )}
            <Badge
              variant={
                item.stockStatus === 'in_stock'
                  ? 'default'
                  : item.stockStatus === 'low_stock'
                  ? 'secondary'
                  : 'destructive'
              }
              className='text-[10px] font-semibold ml-auto'
            >
              {item.stockStatus === 'in_stock' && (
                <CheckCircle2 className='mr-1 h-3 w-3 inline text-emerald-400' />
              )}
              {item.stockStatus === 'low_stock' && (
                <AlertTriangle className='mr-1 h-3 w-3 inline text-amber-400' />
              )}
              {item.stockStatus === 'out_of_stock' && (
                <XCircle className='mr-1 h-3 w-3 inline' />
              )}
              {item.stockStatus === 'in_stock'
                ? t('inventory.valuationPage.inStock', 'In Stock')
                : item.stockStatus === 'low_stock'
                ? t('inventory.valuationPage.lowStockAlert', 'Low Stock')
                : t('inventory.valuationPage.outOfStock', 'Out of Stock')}
            </Badge>
          </div>

          <SheetTitle className='text-lg font-bold leading-tight'>
            {item.productName}
          </SheetTitle>
          <SheetDescription className='text-xs'>
            {t(
              'inventory.valuationPage.detailDescription',
              'Comprehensive valuation and multi-ledger cost profile for this inventory position.'
            )}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        {/* Financial Valuation Method Comparison */}
        <div className='space-y-3'>
          <h4 className='text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
            <DollarSign className='h-3.5 w-3.5 text-emerald-600' />
            {t('inventory.valuationPage.costingComparison', 'Costing Method Valuation')}
          </h4>

          <div className='grid grid-cols-3 gap-2.5'>
            {/* AVCO */}
            <div className='rounded-lg border bg-card p-3 space-y-1'>
              <div className='text-[10px] font-semibold text-muted-foreground uppercase'>
                {t('inventory.valuationPage.avco', 'AVCO (Average)')}
              </div>
              <div className='text-sm font-bold text-foreground'>
                {formatPrice(item.avcoUnitCost)}
              </div>
              <div className='text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold'>
                Total: {formatPrice(avcoTotal)}
              </div>
            </div>

            {/* Standard Cost */}
            <div className='rounded-lg border bg-card p-3 space-y-1'>
              <div className='text-[10px] font-semibold text-muted-foreground uppercase'>
                {t('inventory.valuationPage.standard', 'Standard Cost')}
              </div>
              <div className='text-sm font-bold text-foreground'>
                {formatPrice(item.standardUnitCost)}
              </div>
              <div className='text-[11px] text-blue-600 dark:text-blue-400 font-semibold'>
                Total: {formatPrice(standardTotal)}
              </div>
            </div>

            {/* FIFO */}
            <div className='rounded-lg border bg-card p-3 space-y-1'>
              <div className='text-[10px] font-semibold text-muted-foreground uppercase'>
                {t('inventory.valuationPage.fifo', 'FIFO Estimated')}
              </div>
              <div className='text-sm font-bold text-foreground'>
                {formatPrice(item.fifoUnitCost)}
              </div>
              <div className='text-[11px] text-purple-600 dark:text-purple-400 font-semibold'>
                Total: {formatPrice(fifoTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* Retail Realization & Profit Margins */}
        <div className='space-y-2 rounded-xl border bg-muted/20 p-3.5'>
          <div className='flex items-center justify-between text-xs'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              <TrendingUp className='h-3.5 w-3.5 text-primary' />
              {t('inventory.valuationPage.sellingPrice', 'Unit Selling Price')}
            </span>
            <span className='font-bold text-foreground'>
              {formatPrice(item.sellingPrice)}
            </span>
          </div>

          <div className='flex items-center justify-between text-xs'>
            <span className='text-muted-foreground'>
              {t('inventory.valuationPage.potentialRevenue', 'Potential Gross Revenue')}
            </span>
            <span className='font-bold text-foreground'>
              {formatPrice(item.potentialRevenue)}
            </span>
          </div>

          <div className='flex items-center justify-between text-xs'>
            <span className='text-muted-foreground'>
              {t('inventory.valuationPage.potentialMargin', 'Projected Markup Margin')}
            </span>
            <span className={`font-bold ${item.potentialMargin >= 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
              {item.potentialMargin.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Physical Stock Ledger Position */}
        <div className='space-y-3'>
          <h4 className='text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
            <Package className='h-3.5 w-3.5 text-primary' />
            {t('inventory.valuationPage.stockPosition', 'Physical Stock Quantities')}
          </h4>

          <div className='grid grid-cols-3 gap-2.5 text-center'>
            <div className='rounded-lg border p-2.5 bg-card'>
              <div className='text-[10px] text-muted-foreground uppercase font-semibold'>
                {t('inventory.valuationPage.onHand', 'On-Hand')}
              </div>
              <div className='text-base font-extrabold text-foreground mt-0.5'>
                {item.onHand.toLocaleString()}
              </div>
            </div>

            <div className='rounded-lg border p-2.5 bg-card'>
              <div className='text-[10px] text-muted-foreground uppercase font-semibold'>
                {t('inventory.valuationPage.reserved', 'Reserved')}
              </div>
              <div className='text-base font-extrabold text-muted-foreground mt-0.5'>
                {item.reserved.toLocaleString()}
              </div>
            </div>

            <div className='rounded-lg border p-2.5 bg-card'>
              <div className='text-[10px] text-muted-foreground uppercase font-semibold'>
                {t('inventory.valuationPage.available', 'Available')}
              </div>
              <div className='text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5'>
                {item.available.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Location & Catalog Metadata */}
        <div className='space-y-2 rounded-xl border p-3.5 text-xs'>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              <Warehouse className='h-3.5 w-3.5 text-muted-foreground' />
              {t('inventory.valuationPage.facility', 'Facility')}
            </span>
            <span className='font-semibold'>
              {item.warehouseName
                ? `${item.warehouseName} ${item.warehouseCode ? `[${item.warehouseCode}]` : ''}`
                : item.storeName || 'Store Location'}
            </span>
          </div>

          {item.locationName && (
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>
                {t('inventory.valuationPage.binLocation', 'Bin / Zone')}
              </span>
              <span className='font-mono font-medium'>{item.locationName}</span>
            </div>
          )}

          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              <Layers className='h-3.5 w-3.5 text-muted-foreground' />
              {t('inventory.valuationPage.category', 'Category')}
            </span>
            <span>{item.categoryName}</span>
          </div>

          {item.supplierName && (
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground flex items-center gap-1.5'>
                <Truck className='h-3.5 w-3.5 text-muted-foreground' />
                {t('inventory.valuationPage.supplier', 'Supplier / Vendor')}
              </span>
              <span>{item.supplierName}</span>
            </div>
          )}

          {item.lastMovementAt && (
            <div className='flex items-center justify-between pt-1 border-t'>
              <span className='text-muted-foreground flex items-center gap-1.5'>
                <Clock className='h-3.5 w-3.5 text-muted-foreground' />
                {t('inventory.valuationPage.lastMovement', 'Last Movement')}
              </span>
              <span className='text-[11px] text-muted-foreground'>
                {new Date(item.lastMovementAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
