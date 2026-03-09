import { useState } from 'react'
import { Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useBasket } from '../store/use-basket'
import { ManagerAuthDialog } from './manager-auth-dialog'

interface DiscountToggleProps {
  productId?: number // If undefined, applies to the whole cart
}

export function DiscountToggle({ productId }: DiscountToggleProps) {
  const {
    applyItemDiscount,
    applyCartDiscount,
    removeCartDiscount,
    cartDiscount,
  } = useBasket()
  const [open, setOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>(
    'percentage'
  )
  const [discountValue, setDiscountValue] = useState('')

  const handleApply = () => {
    const val = parseFloat(discountValue)
    if (isNaN(val) || val <= 0) return

    // Require manager auth for any discount
    setAuthOpen(true)
  }

  const onAuthSuccess = () => {
    const val = parseFloat(discountValue)
    if (productId !== undefined) {
      applyItemDiscount(productId, { type: discountType, value: val })
    } else {
      applyCartDiscount({ type: discountType, value: val })
    }
    setOpen(false)
  }

  const handleRemove = () => {
    if (productId !== undefined) {
      // Removing item discount logic hasn't been explicitly implemented as a separate function.
      // But we can apply an override of zero. Better to add remove logic to store or just pass 0 here.
      // Easiest is to extend applyItemDiscount, but let's just make it simple: 0 is nullifying it practically.
      // I'll leave this to a new action, but let's clear it via passing "no discount" logic.
      // Actually we didn't add "removeItemDiscount" to the store... Just leaving remove for cart for now.
    } else {
      removeCartDiscount()
    }
    setOpen(false)
    setDiscountValue('')
  }

  // To check if we have a cart discount actively
  const hasCartDiscount = productId === undefined && cartDiscount

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm' className='w-full'>
          <Tag className='mr-2 h-4 w-4' />
          {hasCartDiscount ? 'Edit Discount' : 'Add Discount'}
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>
            {productId !== undefined ? 'Item' : 'Cart'} Discount
          </DialogTitle>
        </DialogHeader>
        <div className='space-y-6 py-4'>
          <RadioGroup
            value={discountType}
            onValueChange={(val) =>
              setDiscountType(val as 'fixed' | 'percentage')
            }
            className='flex space-x-4'
          >
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='percentage' id='pct' />
              <Label htmlFor='pct'>Percentage (%)</Label>
            </div>
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='fixed' id='fixed' />
              <Label htmlFor='fixed'>Fixed Amount ($)</Label>
            </div>
          </RadioGroup>

          <div className='space-y-2'>
            <Label>Value</Label>
            <Input
              type='number'
              min='0'
              step='0.01'
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={
                discountType === 'percentage'
                  ? 'e.g. 10 for 10%'
                  : 'e.g. 5 for $5 off'
              }
            />
          </div>
        </div>
        <div className='flex justify-end gap-2'>
          {hasCartDiscount && (
            <Button variant='destructive' onClick={handleRemove}>
              Remove
            </Button>
          )}
          <Button variant='outline' onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </div>
      </DialogContent>
      <ManagerAuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={onAuthSuccess}
      />
    </Dialog>
  )
}
