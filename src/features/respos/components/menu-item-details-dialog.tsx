import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useMenuItem } from '../api/queries'
import { formatCurrency } from '../lib/formatters'
import type { ResMenuItemWithDetails, SelectedProperty } from '../types'

interface MenuItemDetailsDialogProps {
  itemId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddToOrder: (
    item: ResMenuItemWithDetails,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden rounded-[2.5rem] border-0 p-0 outline-none sm:max-w-[425px]'>
        {isLoading || !itemDetails ? (
          <div className='flex h-40 items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : (
          // key={itemDetails.id} ensures all state resets when switching items
          <MenuItemDetailsContent
            key={itemDetails.id}
            itemDetails={itemDetails}
            onAddToOrder={onAddToOrder}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Inner component that holds per-item state. Keyed by item id so React
 *  naturally resets all useState hooks when the item changes. */
function MenuItemDetailsContent({
  itemDetails,
  onAddToOrder,
  onOpenChange,
}: {
  itemDetails: ResMenuItemWithDetails
  onAddToOrder: MenuItemDetailsDialogProps['onAddToOrder']
  onOpenChange: (open: boolean) => void
}) {
  // Derive the initial variant id once via useMemo (no setState, pure derivation)
  const initialVariantId = useMemo(() => {
    const defaultVariant = itemDetails.variants.find((v) => v.is_default)
    return defaultVariant?.id || itemDetails.variants[0]?.id || null
  }, [itemDetails])

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    initialVariantId
  )
  const [selectedProperties, setSelectedProperties] = useState<
    Record<string, boolean>
  >({})
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  // Calculate total price
  const basePrice = itemDetails.base_price || 0
  const variantPrice =
    itemDetails.variants.find((v) => v.id === selectedVariantId)
      ?.price_adjustment || 0

  const propertiesPrice =
    itemDetails.properties
      .filter((p) => selectedProperties[p.id])
      .reduce((sum, p) => sum + p.price, 0) || 0

  const unitPrice = basePrice + variantPrice + propertiesPrice
  const totalPrice = unitPrice * quantity

  const handleAddToCart = () => {
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
    <div className='flex h-full flex-col bg-background'>
      <div className='px-6 pt-6 pb-2'>
        <DialogHeader>
          <DialogTitle className='text-2xl font-black tracking-tight'>
            {itemDetails.name}
          </DialogTitle>
        </DialogHeader>
      </div>

      <ScrollArea className='flex-1 px-6'>
        <div className='space-y-8 py-4'>
          {/* Image */}
          {itemDetails.image_url && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className='aspect-video w-full overflow-hidden rounded-3xl border shadow-inner'
            >
              <img
                src={itemDetails.image_url}
                alt={itemDetails.name}
                className='h-full w-full object-cover transition-transform hover:scale-105'
              />
            </motion.div>
          )}

          {itemDetails.description && (
            <p className='text-sm leading-relaxed font-medium text-muted-foreground'>
              {itemDetails.description}
            </p>
          )}

          {/* Variants */}
          {itemDetails.variants.length > 0 && (
            <div className='space-y-4'>
              <Label className='text-xs font-black tracking-widest text-muted-foreground uppercase'>
                Size / Option
              </Label>
              <RadioGroup
                value={selectedVariantId || ''}
                onValueChange={setSelectedVariantId}
                className='grid grid-cols-1 gap-3'
              >
                {itemDetails.variants.map((variant) => (
                  <motion.div key={variant.id} whileTap={{ scale: 0.98 }}>
                    <Label
                      htmlFor={variant.id}
                      className={cn(
                        'flex cursor-pointer items-center justify-between rounded-2xl border-2 p-4 transition-all duration-200',
                        'hover:border-orange-500/50 hover:bg-orange-500/5 dark:hover:bg-orange-500/10',
                        selectedVariantId === variant.id
                          ? 'border-orange-500 bg-orange-500/5 shadow-lg shadow-orange-500/10 dark:bg-orange-500/10'
                          : 'border-transparent bg-muted/30'
                      )}
                    >
                      <div className='flex items-center gap-3'>
                        <RadioGroupItem
                          value={variant.id}
                          id={variant.id}
                          className='sr-only'
                        />
                        <span className='font-bold'>{variant.name}</span>
                      </div>
                      {variant.price_adjustment !== 0 && (
                        <span
                          className={cn(
                            'text-sm font-bold',
                            selectedVariantId === variant.id
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-muted-foreground'
                          )}
                        >
                          {variant.price_adjustment > 0 ? '+' : ''}
                          {formatCurrency(variant.price_adjustment)}
                        </span>
                      )}
                    </Label>
                  </motion.div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Properties / Add-ons */}
          {itemDetails.properties.length > 0 && (
            <div className='space-y-4'>
              <Label className='text-xs font-black tracking-widest text-muted-foreground uppercase'>
                Add-ons
              </Label>
              <div className='grid grid-cols-1 gap-3'>
                {itemDetails.properties.map((property) => (
                  <motion.div key={property.id} whileTap={{ scale: 0.98 }}>
                    <Label
                      htmlFor={property.id}
                      className={cn(
                        'flex cursor-pointer items-center justify-between rounded-2xl border-2 p-4 transition-all duration-200',
                        'hover:border-orange-500/50 hover:bg-orange-500/5 dark:hover:bg-orange-500/10',
                        selectedProperties[property.id]
                          ? 'border-orange-500 bg-orange-500/5 shadow-lg shadow-orange-500/10 dark:bg-orange-500/10'
                          : 'border-transparent bg-muted/30'
                      )}
                    >
                      <div className='flex items-center gap-3'>
                        <Checkbox
                          id={property.id}
                          checked={!!selectedProperties[property.id]}
                          onCheckedChange={(checked) =>
                            setSelectedProperties((prev) => ({
                              ...prev,
                              [property.id]: !!checked,
                            }))
                          }
                          className='sr-only'
                        />
                        <span className='font-bold'>{property.name}</span>
                      </div>
                      <span
                        className={cn(
                          'text-sm font-bold',
                          selectedProperties[property.id]
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-muted-foreground'
                        )}
                      >
                        +{formatCurrency(property.price)}
                      </span>
                    </Label>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className='space-y-4'>
            <Label
              htmlFor='notes'
              className='text-xs font-black tracking-widest text-muted-foreground uppercase'
            >
              Special Instructions
            </Label>
            <Textarea
              id='notes'
              placeholder='E.g. No onions, extra spicy...'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className='min-h-[100px] rounded-3xl border-0 bg-muted/50 p-4 transition-all focus-visible:ring-2 focus-visible:ring-orange-500/30'
            />
          </div>
        </div>
      </ScrollArea>

      <div className='z-10 border-t bg-background/80 p-6 backdrop-blur-xl'>
        <div className='flex flex-col gap-4'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-black tracking-widest text-muted-foreground uppercase'>
              Quantity
            </span>
            <div className='flex items-center gap-1 rounded-2xl border-2 bg-muted/30 p-1'>
              <Button
                variant='ghost'
                size='icon'
                className='h-10 w-10 rounded-xl hover:bg-background'
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className='h-4 w-4' />
              </Button>
              <span className='w-12 text-center text-lg font-black'>
                {quantity}
              </span>
              <Button
                variant='ghost'
                size='icon'
                className='h-10 w-10 rounded-xl hover:bg-background'
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className='h-4 w-4' />
              </Button>
            </div>
          </div>

          <Button
            size='lg'
            className='h-14 w-full justify-between rounded-2xl bg-orange-600 px-8 text-lg font-black shadow-xl shadow-orange-600/20 hover:bg-orange-700 hover:shadow-orange-600/30 active:scale-[0.98]'
            onClick={handleAddToCart}
            disabled={itemDetails.variants.length > 0 && !selectedVariantId}
          >
            <span>Add to Order</span>
            <div className='flex items-center gap-2'>
              <Separator orientation='vertical' className='h-4 bg-white/20' />
              <span>{formatCurrency(totalPrice)}</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  )
}
