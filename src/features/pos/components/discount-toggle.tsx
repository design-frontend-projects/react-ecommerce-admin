import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
          {hasCartDiscount
            ? t('pos.cartSection.editDiscount', 'Edit Discount')
            : t('pos.cartSection.addDiscount', 'Add Discount')}
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>
            {productId !== undefined
              ? t('pos.cartSection.itemDiscount', 'Item Discount')
              : t('pos.cartSection.cartDiscount', 'Cart Discount')}
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
              <Label htmlFor='pct'>{t('pos.cartSection.percentageDiscount', 'Percentage (%)')}</Label>
            </div>
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='fixed' id='fixed' />
              <Label htmlFor='fixed'>{t('pos.cartSection.fixedDiscount', 'Fixed Amount ($)')}</Label>
            </div>
          </RadioGroup>

          <div className='space-y-2'>
            <Label>{t('pos.cartSection.discountValue', 'Value')}</Label>
            <Input
              type='number'
              min='0'
              step='0.01'
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={
                discountType === 'percentage'
                  ? t('pos.cartSection.percentagePlaceholder', 'e.g. 10 for 10%')
                  : t('pos.cartSection.fixedPlaceholder', 'e.g. 5 for $5 off')
              }
            />
          </div>
        </div>
        <div className='flex justify-end gap-2'>
          {hasCartDiscount && (
            <Button variant='destructive' onClick={handleRemove}>
              {t('pos.cartSection.remove', 'Remove')}
            </Button>
          )}
          <Button variant='outline' onClick={() => setOpen(false)}>
            {t('pos.cartSection.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleApply}>{t('pos.cartSection.apply', 'Apply')}</Button>
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
