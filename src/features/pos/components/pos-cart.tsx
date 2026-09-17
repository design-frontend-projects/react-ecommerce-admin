import { useState } from 'react'
import {
  Plus,
  Minus,
  Trash2,
  Tag,
  User,
  PauseCircle,
  CreditCard,
  Percent,
  X,
  Search,
  ShoppingCart,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { usePosStore, type PosCartItem, type PosCustomer } from '../store/use-pos-store'
import { useCustomers } from '@/features/customers/hooks/use-customers'

interface PosCartProps {
  onOpenCheckout: () => void
  onOpenHold: () => void
}

export function PosCart({ onOpenCheckout, onOpenHold }: PosCartProps) {
  const {
    items,
    customer,
    setCustomer,
    removeItem,
    updateQuantity,
    applyItemDiscount,
    removeItemDiscount,
    applyCartDiscount,
    removeCartDiscount,
    cartDiscount,
    clearCart,
    getSubtotal,
    getItemDiscountAmount,
    getCartDiscountAmount,
    getTotalDiscountAmount,
    getTaxAmount,
    getTotalAmount,
    getItemCount,
    heldOrders,
  } = usePosStore()

  const { data: customers = [] } = useCustomers()
  const [customerSearch, setCustomerSearch] = useState('')
  const [isCustomerOpen, setIsCustomerOpen] = useState(false)

  // Line item discount modal state
  const [discountingItem, setDiscountingItem] = useState<PosCartItem | null>(null)
  const [lineDiscountType, setLineDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [lineDiscountValue, setLineDiscountValue] = useState<string>('')

  // Cart-level discount popover state
  const [isCartDiscountOpen, setIsCartDiscountOpen] = useState(false)
  const [cartDiscountType, setCartDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [cartDiscountValue, setCartDiscountValue] = useState<string>('')

  const subtotal = getSubtotal()
  const totalDiscount = getTotalDiscountAmount()
  const tax = getTaxAmount()
  const total = getTotalAmount()
  const itemCount = getItemCount()

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch) return true
    const q = customerSearch.toLowerCase()
    const name = `${c.first_name} ${c.last_name}`.toLowerCase()
    const phone = c.phone?.toLowerCase() || ''
    const email = c.email?.toLowerCase() || ''
    return name.includes(q) || phone.includes(q) || email.includes(q)
  })

  const handleSelectCustomer = (c: any) => {
    setCustomer({
      id: c.id,
      name: `${c.first_name} ${c.last_name}`,
      email: c.email,
      phone: c.phone,
      customerGroupId: c.group_id,
    })
    setIsCustomerOpen(false)
    setCustomerSearch('')
    toast.success(`Customer set to ${c.first_name} ${c.last_name}`)
  }

  const handleClearCustomer = () => {
    setCustomer(null)
  }

  const handleApplyLineDiscount = () => {
    if (!discountingItem) return
    const val = Number(lineDiscountValue)
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid discount value')
      return
    }

    applyItemDiscount(discountingItem.id, {
      type: lineDiscountType,
      value: val,
    })

    setDiscountingItem(null)
    setLineDiscountValue('')
    toast.success('Line discount applied')
  }

  const handleApplyCartDiscount = () => {
    const val = Number(cartDiscountValue)
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid discount value')
      return
    }

    applyCartDiscount({
      type: cartDiscountType,
      value: val,
    })

    setIsCartDiscountOpen(false)
    setCartDiscountValue('')
    toast.success('Cart discount applied')
  }

  return (
    <div className='flex h-full flex-col rounded-lg border bg-card shadow-sm overflow-hidden'>
      {/* Top Header: Customer selector & Clear Cart */}
      <div className='border-b p-3 space-y-2 bg-muted/20'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <ShoppingCart className='h-4 w-4 text-primary' />
            <h2 className='font-bold text-sm'>Current Cart</h2>
            <Badge variant='secondary' className='h-5 px-1.5 text-xs font-semibold'>
              {itemCount}
            </Badge>
          </div>

          <div className='flex items-center gap-1'>
            {heldOrders.length > 0 && (
              <Button
                variant='outline'
                size='sm'
                className='h-7 text-xs gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400'
                onClick={onOpenHold}
              >
                <PauseCircle className='h-3.5 w-3.5' />
                Held ({heldOrders.length})
              </Button>
            )}

            {items.length > 0 && (
              <Button
                variant='ghost'
                size='sm'
                className='h-7 text-xs text-muted-foreground hover:text-rose-500'
                onClick={clearCart}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Customer Button / Picker */}
        <Popover open={isCustomerOpen} onOpenChange={setIsCustomerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              size='sm'
              className='w-full justify-between h-8 text-xs font-normal'
            >
              <div className='flex items-center gap-2 truncate'>
                <User className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                <span className='truncate font-medium'>
                  {customer ? customer.name : 'Walk-in Customer'}
                </span>
              </div>
              <div className='flex items-center gap-1'>
                {customer && (
                  <X
                    className='h-3.5 w-3.5 text-muted-foreground hover:text-foreground shrink-0'
                    onClick={(e) => {
                      e.stopPropagation()
                      handleClearCustomer()
                    }}
                  />
                )}
                <ChevronDown className='h-3.5 w-3.5 opacity-50 shrink-0' />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-72 p-2' align='start'>
            <div className='space-y-2'>
              <div className='relative'>
                <Search className='absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
                <Input
                  placeholder='Search customer...'
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className='h-8 pl-7 text-xs'
                  autoFocus
                />
              </div>

              <ScrollArea className='h-48'>
                <div className='space-y-1'>
                  <Button
                    variant={customer === null ? 'secondary' : 'ghost'}
                    size='sm'
                    className='w-full justify-start text-xs h-8 font-normal'
                    onClick={() => {
                      setCustomer(null)
                      setIsCustomerOpen(false)
                    }}
                  >
                    Walk-in Customer (Default)
                  </Button>

                  {filteredCustomers.map((c) => (
                    <Button
                      key={c.id}
                      variant={customer?.id === c.id ? 'secondary' : 'ghost'}
                      size='sm'
                      className='w-full justify-start text-xs h-auto py-1.5 font-normal flex-col items-start'
                      onClick={() => handleSelectCustomer(c)}
                    >
                      <span className='font-semibold'>
                        {c.first_name} {c.last_name}
                      </span>
                      {c.phone && (
                        <span className='text-[10px] text-muted-foreground'>
                          {c.phone}
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Cart Items List */}
      <div className='flex-1 overflow-y-auto p-2'>
        {items.length === 0 ? (
          <div className='flex h-full flex-col items-center justify-center text-muted-foreground p-6 text-center'>
            <ShoppingCart className='h-12 w-12 stroke-[1.5] opacity-20 mb-3' />
            <p className='text-sm font-semibold'>Cart is empty</p>
            <p className='text-xs text-muted-foreground/80 mt-1 max-w-[200px]'>
              Scan a barcode or click items from the catalog to start a sale.
            </p>
          </div>
        ) : (
          <div className='space-y-2'>
            {items.map((item) => (
              <div
                key={item.id}
                className='group rounded-lg border bg-card p-2.5 shadow-sm transition-all hover:border-primary/40 space-y-2'
              >
                <div className='flex justify-between items-start gap-2'>
                  <div className='min-w-0 flex-1'>
                    <div className='font-semibold text-xs leading-tight line-clamp-2'>
                      {item.name}
                    </div>
                    <div className='flex items-center gap-1.5 mt-0.5'>
                      <span className='text-[10px] text-muted-foreground'>
                        {item.sku}
                      </span>
                      <span className='text-[10px] text-muted-foreground'>•</span>
                      <span className='text-[11px] font-medium'>
                        {formatCurrency(item.unitPrice)}
                      </span>
                    </div>
                  </div>

                  <div className='text-right shrink-0'>
                    <div className='font-bold text-xs'>
                      {formatCurrency(item.total)}
                    </div>
                    {item.discountAmount > 0 && (
                      <div className='text-[10px] text-emerald-600 dark:text-emerald-400 font-medium'>
                        -{formatCurrency(item.discountAmount)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quantity Controls & Line Discount */}
                <div className='flex items-center justify-between pt-1 border-t border-muted/50'>
                  <div className='flex items-center gap-1 bg-muted/30 rounded-md p-0.5 border'>
                    <Button
                      size='icon'
                      variant='ghost'
                      className='h-6 w-6 rounded-sm'
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className='h-3 w-3' />
                    </Button>
                    <span className='w-7 text-center text-xs font-bold'>
                      {item.quantity}
                    </span>
                    <Button
                      size='icon'
                      variant='ghost'
                      className='h-6 w-6 rounded-sm'
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className='h-3 w-3' />
                    </Button>
                  </div>

                  <div className='flex items-center gap-1'>
                    {item.discount ? (
                      <Badge
                        variant='secondary'
                        className='h-6 px-1.5 text-[10px] cursor-pointer hover:bg-destructive/10 hover:text-destructive gap-1'
                        onClick={() => removeItemDiscount(item.id)}
                        title='Click to remove discount'
                      >
                        {item.discount.type === 'percentage'
                          ? `${item.discount.value}% off`
                          : `-${formatCurrency(item.discount.value)}`}
                        <X className='h-3 w-3' />
                      </Badge>
                    ) : (
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-6 w-6 text-muted-foreground hover:text-foreground'
                        onClick={() => {
                          setDiscountingItem(item)
                          setLineDiscountType('percentage')
                          setLineDiscountValue('')
                        }}
                        title='Apply line discount'
                      >
                        <Tag className='h-3 w-3' />
                      </Button>
                    )}

                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6 text-muted-foreground hover:text-rose-500'
                      onClick={() => removeItem(item.id)}
                      title='Remove line'
                    >
                      <Trash2 className='h-3 w-3' />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Totals & Checkout Actions */}
      <div className='border-t bg-card p-3 space-y-2.5 shadow-lg'>
        <div className='space-y-1.5 text-xs'>
          <div className='flex justify-between text-muted-foreground'>
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          {/* Cart-level discount row */}
          <div className='flex justify-between items-center text-muted-foreground'>
            <div className='flex items-center gap-1.5'>
              <span>Order Discount</span>
              <Popover open={isCartDiscountOpen} onOpenChange={setIsCartDiscountOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-5 px-1 text-[10px] text-primary hover:underline'
                  >
                    {cartDiscount ? 'Edit' : '+ Add'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-64 p-3 space-y-3' align='start'>
                  <h4 className='font-bold text-xs'>Order Level Discount</h4>
                  <div className='flex gap-2'>
                    <Button
                      type='button'
                      size='sm'
                      variant={cartDiscountType === 'percentage' ? 'default' : 'outline'}
                      className='flex-1 h-7 text-xs'
                      onClick={() => setCartDiscountType('percentage')}
                    >
                      Percent (%)
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      variant={cartDiscountType === 'fixed' ? 'default' : 'outline'}
                      className='flex-1 h-7 text-xs'
                      onClick={() => setCartDiscountType('fixed')}
                    >
                      Fixed ($)
                    </Button>
                  </div>
                  <Input
                    type='number'
                    min='0'
                    placeholder={cartDiscountType === 'percentage' ? '10%' : '5.00'}
                    className='h-8 text-xs'
                    value={cartDiscountValue}
                    onChange={(e) => setCartDiscountValue(e.target.value)}
                    autoFocus
                  />
                  <div className='flex justify-end gap-1.5'>
                    {cartDiscount && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='h-7 text-xs text-rose-500'
                        onClick={() => {
                          removeCartDiscount()
                          setIsCartDiscountOpen(false)
                        }}
                      >
                        Remove
                      </Button>
                    )}
                    <Button
                      type='button'
                      size='sm'
                      className='h-7 text-xs'
                      onClick={handleApplyCartDiscount}
                    >
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <span
              className={
                totalDiscount > 0
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : ''
              }
            >
              {totalDiscount > 0 ? `-${formatCurrency(totalDiscount)}` : '$0.00'}
            </span>
          </div>

          <div className='flex justify-between text-muted-foreground'>
            <span>Taxes</span>
            <span>{formatCurrency(tax)}</span>
          </div>

          <Separator />

          <div className='flex justify-between items-baseline pt-1'>
            <span className='font-bold text-sm tracking-tight'>TOTAL</span>
            <span className='text-2xl font-black text-primary tracking-tight'>
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className='grid grid-cols-4 gap-2 pt-1'>
          <Button
            type='button'
            variant='outline'
            className='col-span-1 h-11 text-xs font-semibold gap-1 px-2 border-amber-500/30 hover:bg-amber-500/10'
            disabled={items.length === 0}
            onClick={onOpenHold}
            title='Hold / Suspend Cart (F4)'
          >
            <PauseCircle className='h-4 w-4 text-amber-500' />
            <span className='hidden sm:inline'>Hold</span>
          </Button>

          <Button
            type='button'
            disabled={items.length === 0}
            onClick={onOpenCheckout}
            className='col-span-3 h-11 text-base font-extrabold gap-2 bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all active:scale-[0.98]'
          >
            <CreditCard className='h-5 w-5' />
            Pay (F9) • {formatCurrency(total)}
          </Button>
        </div>
      </div>

      {/* Line Discount Modal */}
      <Dialog
        open={Boolean(discountingItem)}
        onOpenChange={(open) => !open && setDiscountingItem(null)}
      >
        <DialogContent className='sm:max-w-xs'>
          <DialogHeader>
            <DialogTitle className='text-sm font-bold'>
              Discount for {discountingItem?.name}
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-3 py-2'>
            <div className='flex gap-2'>
              <Button
                type='button'
                size='sm'
                variant={lineDiscountType === 'percentage' ? 'default' : 'outline'}
                className='flex-1 h-8 text-xs'
                onClick={() => setLineDiscountType('percentage')}
              >
                Percent (%)
              </Button>
              <Button
                type='button'
                size='sm'
                variant={lineDiscountType === 'fixed' ? 'default' : 'outline'}
                className='flex-1 h-8 text-xs'
                onClick={() => setLineDiscountType('fixed')}
              >
                Fixed ($)
              </Button>
            </div>
            <div className='space-y-1'>
              <Label className='text-xs'>Discount Value</Label>
              <Input
                type='number'
                min='0'
                placeholder={lineDiscountType === 'percentage' ? '15' : '2.50'}
                className='h-9 font-semibold'
                value={lineDiscountValue}
                onChange={(e) => setLineDiscountValue(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setDiscountingItem(null)}
            >
              Cancel
            </Button>
            <Button
              type='button'
              size='sm'
              onClick={handleApplyLineDiscount}
            >
              Apply Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
