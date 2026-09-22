import { useTranslation } from 'react-i18next'
import { cn, formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Package, AlertTriangle } from 'lucide-react'
import type { PosProductVariant } from '../data/api'
import { parseDimensionsLabel } from '../utils'

interface VariantSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productName: string
  variants: PosProductVariant[]
  onSelect: (variantId: string, variant: PosProductVariant) => void
  isVariantDisabled?: (variant: PosProductVariant) => boolean
}

export function VariantSelectionDialog({
  open,
  onOpenChange,
  productName,
  variants,
  onSelect,
  isVariantDisabled,
}: VariantSelectionDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Package className='h-5 w-5 text-primary' />
            {t('pos.variantSelection.title', 'Select Variant — {{name}}', {
              name: productName,
            })}
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground'>
            {t(
              'pos.variantSelection.desc',
              'Choose a variant to add to the cart. Out-of-stock variants are disabled.'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className='grid max-h-[60vh] grid-cols-1 gap-3 overflow-y-auto py-3 sm:grid-cols-2 md:grid-cols-3'>
          {variants.map((v) => {
            const price = Number(v.price ?? 0)
            const disabled = isVariantDisabled?.(v) ?? false
            const available = v.stockAvailable ?? v.stock_quantity ?? 0
            const onHand = v.stockOnHand ?? v.stock_quantity ?? 0
            const isLowStock = available > 0 && available <= (v.min_stock || 5)

            return (
              <Card
                key={v.id}
                className={cn(
                  'group relative transition-all duration-200',
                  disabled
                    ? 'cursor-not-allowed border-destructive/40 opacity-50 grayscale'
                    : 'cursor-pointer border-border hover:border-primary hover:shadow-md active:scale-[0.97]'
                )}
                onClick={() => {
                  if (disabled) return
                  onSelect(v.id, v)
                  onOpenChange(false)
                }}
              >
                {/* Top status stripe */}
                <span
                  className={cn(
                    'absolute top-0 right-0 left-0 h-1 rounded-t-lg',
                    disabled
                      ? 'bg-destructive'
                      : isLowStock
                        ? 'bg-amber-400'
                        : 'bg-emerald-500'
                  )}
                />

                <CardContent className='relative flex flex-col gap-2 p-4 pt-3'>
                  {/* Variant label */}
                  {v.dimensions ? (
                    <div className='line-clamp-1 text-sm font-bold'>
                      {parseDimensionsLabel(v.dimensions)}
                    </div>
                  ) : (
                    <div className='line-clamp-1 text-sm font-bold'>
                      {v.sku}
                    </div>
                  )}

                  {/* SKU */}
                  <div className='text-[11px] font-mono text-muted-foreground'>
                    SKU: {v.sku}
                  </div>

                  {/* Price */}
                  <div className='mt-auto text-lg font-extrabold tracking-tight text-foreground'>
                    {formatCurrency(price)}
                  </div>

                  {/* Stock info */}
                  <div className='flex items-center justify-between gap-1'>
                    {disabled ? (
                      <Badge
                        variant='destructive'
                        className='gap-1 text-[10px] font-semibold'
                      >
                        <AlertTriangle className='h-3 w-3' />
                        {t('pos.variantSelection.outOfStock', 'Out of stock')}
                      </Badge>
                    ) : isLowStock ? (
                      <Badge
                        variant='outline'
                        className='gap-1 border-amber-400/50 bg-amber-50 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                      >
                        <AlertTriangle className='h-3 w-3' />
                        {t('pos.variantSelection.lowStock', 'Low')}: {available} left
                      </Badge>
                    ) : (
                      <Badge
                        variant='outline'
                        className='gap-1 border-emerald-400/50 bg-emerald-50 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                      >
                        <Package className='h-3 w-3' />
                        {t('pos.variantSelection.available', 'Avail')}: {available}
                      </Badge>
                    )}
                    <span className='text-[10px] text-muted-foreground'>
                      {t('pos.variantSelection.onHand', 'On hand')}: {onHand}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
