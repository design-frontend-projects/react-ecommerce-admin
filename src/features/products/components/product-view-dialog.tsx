'use client'

import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { type Product } from '../data/schema'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Product
}

export function ProductViewDialog({ open, onOpenChange, currentRow }: Props) {
  if (!currentRow) return null

  // Ensure these exist if joined
  const categoryName = currentRow.categories?.name || 'N/A'

  // Collect variant information if available
  const variants = currentRow.product_variants || []
  const hasVariants = variants.length > 0

  // Format price helper
  const formatPrice = (price: number | string | null | undefined) => {
    if (price === null || price === undefined) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(price))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] max-w-2xl flex-col overflow-hidden'>
        <DialogHeader>
          <div className='mt-2 flex items-center justify-between'>
            <DialogTitle className='text-2xl font-bold'>
              {currentRow.name}
            </DialogTitle>
            <Badge variant={currentRow.is_active ? 'default' : 'secondary'}>
              {currentRow.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className='-mr-4 flex-1 pr-4'>
          <div className='space-y-6 pb-6'>
            {/* Basic Details */}
            <div className='space-y-3'>
              <h4 className='text-sm font-bold tracking-wider text-muted-foreground uppercase'>
                Product Details
              </h4>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>SKU</Label>
                  <p className='text-sm font-medium'>
                    {currentRow.sku || 'N/A'}
                  </p>
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>
                    Barcode
                  </Label>
                  <p className='text-sm font-medium'>
                    {currentRow.barcode || 'N/A'}
                  </p>
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>
                    Category
                  </Label>
                  <p className='text-sm font-medium'>{categoryName}</p>
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>
                    Weight
                  </Label>
                  <p className='text-sm font-medium'>
                    {currentRow.weight
                      ? `${Number(currentRow.weight)} kg`
                      : 'N/A'}
                  </p>
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>
                    Dimensions
                  </Label>
                  <p className='text-sm font-medium'>
                    {currentRow.dimensions || 'N/A'}
                  </p>
                </div>
              </div>

              {currentRow.description && (
                <div className='space-y-1 pt-2'>
                  <Label className='text-xs text-muted-foreground'>
                    Description
                  </Label>
                  <p className='text-sm leading-relaxed text-foreground/80'>
                    {currentRow.description}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Metrics */}
            {(currentRow.weight || currentRow.dimensions) && (
              <div className='space-y-3'>
                <h4 className='text-sm font-bold tracking-wider text-muted-foreground uppercase'>
                  Logistics
                </h4>
                <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
                  <div className='space-y-1'>
                    <Label className='text-xs text-muted-foreground'>
                      Weight
                    </Label>
                    <p className='text-sm font-medium'>
                      {currentRow.weight
                        ? `${Number(currentRow.weight)} kg`
                        : 'N/A'}
                    </p>
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-xs text-muted-foreground'>
                      Dimensions
                    </Label>
                    <p className='text-sm font-medium'>
                      {currentRow.dimensions || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Variants table if exists */}
            {hasVariants && (
              <>
                <Separator />
                <div className='space-y-3'>
                  <h4 className='text-sm font-bold tracking-wider text-muted-foreground uppercase'>
                    Variants & Pricing
                  </h4>
                  <div className='overflow-hidden rounded-md border'>
                    <table className='w-full text-left text-sm'>
                      <thead className='border-b bg-muted/50'>
                        <tr>
                          <th className='px-4 py-2 font-medium'>Variant SKU</th>
                          <th className='px-4 py-2 font-medium'>Price</th>
                          <th className='px-4 py-2 font-medium'>Cost</th>
                          <th className='px-4 py-2 text-right font-medium'>
                            Stock
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y'>
                        {variants.map((v, index) => (
                          <tr key={v.id || index} className='bg-background'>
                            <td className='px-4 py-3 font-medium'>{v.sku}</td>
                            <td className='px-4 py-3'>
                              {formatPrice(v.price)}
                            </td>
                            <td className='px-4 py-3 text-muted-foreground'>
                              {v.cost_price ? formatPrice(v.cost_price) : '-'}
                            </td>
                            <td className='px-4 py-3 text-right'>
                              <Badge
                                variant={
                                  Number(v.stock_quantity) <=
                                  Number(v.min_stock || 0)
                                    ? 'destructive'
                                    : 'outline'
                                }
                              >
                                {Number(v.stock_quantity)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {!hasVariants && (
              <>
                <Separator />
                <div className='space-y-3'>
                  <h4 className='text-sm font-bold tracking-wider text-muted-foreground uppercase'>
                    Variants & Pricing
                  </h4>
                  <div className='rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground'>
                    No variants assigned to this product.
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
