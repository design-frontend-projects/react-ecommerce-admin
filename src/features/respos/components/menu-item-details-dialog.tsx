import { useState, useMemo } from 'react'
import { Check, Loader2, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { useMenuItem } from '../api/queries'
import { formatCurrency } from '../lib/formatters'
import type { ResMenuItem, SelectedProperty } from '../types'

interface MenuItemDetailsDialogProps {
  itemId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddToOrder: (
    item: ResMenuItem,
    variantId?: string,
    properties?: SelectedProperty[],
    quantity?: number,
    notes?: string
  ) => void
}

export function MenuItemDetailsDialog({
  itemId,
  open,
  onOpenChange,
  onAddToOrder,
}: MenuItemDetailsDialogProps) {
  const { data: itemDetails, isLoading } = useMenuItem(itemId || '')

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null
  )
  const [selectedProperties, setSelectedProperties] = useState<
    Record<string, boolean>
  >({}) // propertyId -> boolean
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  // Reset state when opening new item
  useMemo(() => {
    if (open && itemDetails) {
      // Auto-select default variant if exists
      const defaultVariant = itemDetails.variants.find((v) => v.is_default)
      setSelectedVariantId(
        defaultVariant?.id || itemDetails.variants[0]?.id || null
      )
      setSelectedProperties({})
      setQuantity(1)
      setNotes('')
    }
  }, [open, itemDetails])

  if (!itemId) return null

  // Calculate total price
  const basePrice = itemDetails?.base_price || 0
  const variantPrice =
    itemDetails?.variants.find((v) => v.id === selectedVariantId)
      ?.price_adjustment || 0

  const propertiesPrice =
    itemDetails?.properties
      .filter((p) => selectedProperties[p.id])
      .reduce((sum, p) => sum + p.price, 0) || 0

  const unitPrice = basePrice + variantPrice + propertiesPrice
  const totalPrice = unitPrice * quantity

  const handleAddToCart = () => {
    if (!itemDetails) return

    // Collect selected properties with details
    const properties: SelectedProperty[] = itemDetails.properties
      .filter((p) => selectedProperties[p.id])
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
      }))

    onAddToOrder(
      itemDetails,
      selectedVariantId || undefined,
      properties,
      quantity,
      notes
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col sm:max-w-[425px]'>
        {isLoading || !itemDetails ? (
          <div className='flex h-40 items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{itemDetails.name}</DialogTitle>
            </DialogHeader>

            <ScrollArea className='-mr-4 flex-1 pr-4'>
              <div className='space-y-6 py-4'>
                {/* Image */}
                {itemDetails.image_url && (
                  <div className='aspect-video w-full overflow-hidden rounded-md'>
                    <img
                      src={itemDetails.image_url}
                      alt={itemDetails.name}
                      className='h-full w-full object-cover'
                    />
                  </div>
                )}

                {itemDetails.description && (
                  <p className='text-sm text-muted-foreground'>
                    {itemDetails.description}
                  </p>
                )}

                {/* Variants */}
                {itemDetails.variants.length > 0 && (
                  <div className='space-y-3'>
                    <Label className='text-base font-semibold'>
                      Size / Option
                    </Label>
                    <RadioGroup
                      value={selectedVariantId || ''}
                      onValueChange={setSelectedVariantId}
                    >
                      {itemDetails.variants.map((variant) => (
                        <div
                          key={variant.id}
                          className='flex items-center justify-between space-x-2 rounded-md border p-3 hover:bg-accent/50'
                        >
                          <div className='flex items-center space-x-2'>
                            <RadioGroupItem
                              value={variant.id}
                              id={variant.id}
                            />
                            <Label
                              htmlFor={variant.id}
                              className='cursor-pointer font-medium'
                            >
                              {variant.name}
                            </Label>
                          </div>
                          {variant.price_adjustment !== 0 && (
                            <span className='text-sm text-muted-foreground'>
                              {variant.price_adjustment > 0 ? '+' : ''}
                              {formatCurrency(variant.price_adjustment)}
                            </span>
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {/* Properties / Add-ons */}
                {itemDetails.properties.length > 0 && (
                  <div className='space-y-3'>
                    <Label className='text-base font-semibold'>Add-ons</Label>
                    <div className='space-y-2'>
                      {itemDetails.properties.map((property) => (
                        <div
                          key={property.id}
                          className='flex items-center justify-between space-x-2 rounded-md border p-3 hover:bg-accent/50'
                        >
                          <div className='flex items-center space-x-2'>
                            <Checkbox
                              id={property.id}
                              checked={!!selectedProperties[property.id]}
                              onCheckedChange={(checked) =>
                                setSelectedProperties((prev) => ({
                                  ...prev,
                                  [property.id]: !!checked,
                                }))
                              }
                            />
                            <Label
                              htmlFor={property.id}
                              className='cursor-pointer font-medium'
                            >
                              {property.name}
                            </Label>
                          </div>
                          <span className='text-sm text-muted-foreground'>
                            +{formatCurrency(property.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className='space-y-3'>
                  <Label htmlFor='notes' className='text-base font-semibold'>
                    Special Instructions
                  </Label>
                  <Textarea
                    id='notes'
                    placeholder='E.g. No onions, extra spicy...'
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className='resize-none'
                  />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className='flex-col gap-3 sm:flex-col'>
              {/* Quantity */}
              <div className='flex items-center justify-between rounded-lg border bg-muted/20 p-2'>
                <span className='font-medium'>Quantity</span>
                <div className='flex items-center gap-3'>
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-8 w-8'
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className='h-4 w-4' />
                  </Button>
                  <span className='w-8 text-center text-lg font-bold'>
                    {quantity}
                  </span>
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-8 w-8'
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className='h-4 w-4' />
                  </Button>
                </div>
              </div>

              {/* Add Button */}
              <Button
                size='lg'
                className='w-full justify-between bg-orange-600 text-lg font-bold hover:bg-orange-700'
                onClick={handleAddToCart}
                disabled={itemDetails.variants.length > 0 && !selectedVariantId}
              >
                <span>Add to Order</span>
                <span>{formatCurrency(totalPrice)}</span>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
