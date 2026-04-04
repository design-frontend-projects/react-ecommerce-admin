import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { PosProductVariant } from '../data/api'

interface VariantSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productName: string
  variants: PosProductVariant[]
  basePrice: number
  categoryName: string | null
  onSelect: (variant: PosProductVariant, priceToUse: number) => void
}

export function VariantSelectionDialog({
  open,
  onOpenChange,
  productName,
  variants,
  basePrice,
  categoryName,
  onSelect,
}: VariantSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Variant - {productName}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4 max-h-[60vh] overflow-y-auto">
          {variants.map((v) => {
            const isFoodOrFruit = categoryName && 
              ['food', 'fruit', 'fruite'].includes(categoryName.toLowerCase())
            const price = isFoodOrFruit ? basePrice : v.price

            return (
              <Card
                key={v.id}
                className="cursor-pointer hover:border-primary active:scale-95 transition-all"
                onClick={() => {
                  onSelect(v, price)
                  onOpenChange(false)
                }}
              >
                <CardContent className="p-4 flex flex-col gap-2 relative">
                  {v.dimensions && (
                    <div className="font-semibold">{v.dimensions}</div>
                  )}
                  {!v.dimensions && (
                    <div className="font-semibold line-clamp-1">{v.sku}</div>
                  )}
                  
                  <div className="text-sm text-muted-foreground">
                    SKU: {v.sku}
                  </div>
                  
                  <div className="text-lg font-bold mt-auto">
                    {formatCurrency(price)}
                  </div>
                  
                  {isFoodOrFruit && (
                    <div className="text-xs text-muted-foreground absolute top-4 right-4 bg-muted px-2 py-1 rounded">
                      Base Price
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
