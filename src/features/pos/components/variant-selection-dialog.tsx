import { formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PosProductVariant } from '../data/api'

interface VariantSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productName: string
  variants: PosProductVariant[]
  onSelect: (variant: PosProductVariant) => void
}

export function VariantSelectionDialog({
  open,
  onOpenChange,
  productName,
  variants,
  onSelect,
}: VariantSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Select Variant - {productName}</DialogTitle>
        </DialogHeader>
        <div className='grid max-h-[60vh] grid-cols-2 gap-4 overflow-y-auto py-4 md:grid-cols-3'>
          {variants.map((v) => {
            const price = Number(v.price ?? 0)

            return (
              <Card
                key={v.id}
                className='cursor-pointer transition-all hover:border-primary active:scale-95'
                onClick={() => {
                  onSelect(v)
                  onOpenChange(false)
                }}
              >
                <CardContent className='relative flex flex-col gap-2 p-4'>
                  {v.dimensions && (
                    <div className='font-semibold'>{v.dimensions}</div>
                  )}
                  {!v.dimensions && (
                    <div className='line-clamp-1 font-semibold'>{v.sku}</div>
                  )}

                  <div className='text-sm text-muted-foreground'>
                    SKU: {v.sku}
                  </div>

                  <div className='mt-auto text-lg font-bold'>
                    {formatCurrency(price)}
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
