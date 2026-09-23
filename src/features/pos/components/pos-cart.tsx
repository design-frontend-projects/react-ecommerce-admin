import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ChevronDown,
  CreditCard,
  Minus,
  Package,
  PauseCircle,
  Plus,
  Search,
  ShoppingCart,
  Tag,
  Ticket,
  Trash2,
  User,
  UserPlus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useCustomers, type Customer } from '@/features/customers/hooks/use-customers'
import { usePosStore, type PosCartItem } from '../store/use-pos-store'
import { PosQuickCustomerDialog } from './pos-quick-customer-dialog'
import { PromoCodeDialog } from './promo-code-dialog'

interface PosCartProps {
  onOpenCheckout: () => void
  onOpenHold: () => void
}

export function PosCart({ onOpenCheckout, onOpenHold }: PosCartProps) {
  const { t } = useTranslation()
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
    getTotalDiscountAmount,
    getTaxAmount,
    getTotalAmount,
    appliedPromotion,
    removePromotion,
    getItemCount,
    hasStockErrors,
    heldOrders,
  } = usePosStore()

  const stockErrorsExist = hasStockErrors()

  const { data: customers = [] } = useCustomers()
  const [customerSearch, setCustomerSearch] = useState('')
  const [isCustomerOpen, setIsCustomerOpen] = useState(false)
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false)
  const [isPromoOpen, setIsPromoOpen] = useState(false)

  // Line item discount modal state
  const [discountingItem, setDiscountingItem] = useState<PosCartItem | null>(
    null
  )
  const [lineDiscountType, setLineDiscountType] = useState<
    'percentage' | 'fixed'
  >('percentage')
  const [lineDiscountValue, setLineDiscountValue] = useState<string>('')

  // Cart-level discount popover state
  const [isCartDiscountOpen, setIsCartDiscountOpen] = useState(false)
  const [cartDiscountType, setCartDiscountType] = useState<
    'percentage' | 'fixed'
  >('percentage')
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

  const handleSelectCustomer = (c: Customer) => {
    setCustomer({
      id: c.id,
      name: `${c.first_name} ${c.last_name}`,
      email: c.email,
      phone: c.phone,
      customerGroupId: c.group_id,
    })
    setIsCustomerOpen(false)
    setCustomerSearch('')
    toast.success(
      t('pos.cartSection.customerSet', 'Customer set to {{name}}', {
        name: `${c.first_name} ${c.last_name}`,
      })
    )
  }

  const handleClearCustomer = () => {
    setCustomer(null)
  }

  const handleApplyLineDiscount = () => {
    if (!discountingItem) return
    const val = Number(lineDiscountValue)
    if (isNaN(val) || val <= 0) {
      toast.error(
        t('pos.cartSection.validDiscountError', 'Please enter a valid discount value')
      )
      return
    }

    applyItemDiscount(discountingItem.id, {
      type: lineDiscountType,
      value: val,
    })

    setDiscountingItem(null)
    setLineDiscountValue('')
    toast.success(
      t('pos.cartSection.lineDiscountApplied', 'Line discount applied')
    )
  }

  const handleApplyCartDiscount = () => {
    const val = Number(cartDiscountValue)
    if (isNaN(val) || val <= 0) {
      toast.error(
        t('pos.cartSection.validDiscountError', 'Please enter a valid discount value')
      )
      return
    }

    applyCartDiscount({
      type: cartDiscountType,
      value: val,
    })

    setIsCartDiscountOpen(false)
    setCartDiscountValue('')
    toast.success(
      t('pos.cartSection.cartDiscountApplied', 'Cart discount applied')
    )
  }

  return (
    <div className='flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-sm'>
      {/* Top Header: Customer selector & Clear Cart */}
      <div className='shrink-0 space-y-2 border-b bg-muted/20 p-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <ShoppingCart className='h-4 w-4 text-primary' />
            <h2 className='text-sm font-bold'>
              {t('pos.cartSection.title', 'Current Cart')}
            </h2>
            <Badge
              variant='secondary'
              className='h-5 px-1.5 text-xs font-semibold'
            >
              {itemCount}
            </Badge>
          </div>

          <div className='flex items-center gap-1'>
            {heldOrders.length > 0 && (
              <Button
                variant='outline'
                size='sm'
                className='h-7 gap-1 border-amber-500/40 text-xs text-amber-600 dark:text-amber-400'
                onClick={onOpenHold}
              >
                <PauseCircle className='h-3.5 w-3.5' />
                {t('pos.cartSection.heldCount', 'Held ({{count}})', {
                  count: heldOrders.length,
                })}
              </Button>
            )}

            {items.length > 0 && (
              <Button
                variant='ghost'
                size='sm'
                className='h-7 text-xs text-muted-foreground hover:text-rose-500'
                onClick={clearCart}
              >
                {t('pos.cartSection.clearCart', 'Clear')}
              </Button>
            )}
          </div>
        </div>

        {/* Customer Button / Picker */}
        <div className='flex items-center gap-1.5'>
          <Popover open={isCustomerOpen} onOpenChange={setIsCustomerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                className='h-8 flex-1 justify-between text-xs font-normal'
              >
                <div className='flex items-center gap-2 truncate'>
                  <User className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
                  <span className='truncate font-medium'>
                    {customer
                      ? customer.name
                      : t('pos.cartSection.walkInCustomer', 'Walk-in Customer')}
                  </span>
                </div>
                <div className='flex items-center gap-1'>
                  {customer && (
                    <X
                      className='h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground'
                      onClick={(e) => {
                        e.stopPropagation()
                        handleClearCustomer()
                      }}
                    />
                  )}
                  <ChevronDown className='h-3.5 w-3.5 shrink-0 opacity-50' />
                </div>
              </Button>
            </PopoverTrigger>

            <PopoverContent className='w-72 p-2' align='start'>
              <div className='space-y-2'>
                <div className='relative'>
                  <Search className='absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    placeholder={t(
                      'pos.cartSection.searchCustomerPlaceholder',
                      'Search customer...'
                    )}
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
                      className='h-8 w-full justify-start text-xs font-normal'
                      onClick={() => {
                        setCustomer(null)
                        setIsCustomerOpen(false)
                      }}
                    >
                      {t(
                        'pos.cartSection.walkInCustomerDefault',
                        'Walk-in Customer (Default)'
                      )}
                    </Button>

                    {filteredCustomers.map((c) => (
                      <Button
                        key={c.id}
                        variant={customer?.id === c.id ? 'secondary' : 'ghost'}
                        size='sm'
                        className='h-auto w-full flex-col items-start justify-start py-1.5 text-xs font-normal'
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

          {/* Quick add customer button */}
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8 shrink-0 border-dashed border-primary/30 text-primary hover:bg-primary/10'
            onClick={() => setIsQuickCustomerOpen(true)}
            title={t('pos.cartSection.addNewCustomer', 'Add New Customer')}
          >
            <UserPlus className='h-3.5 w-3.5' />
          </Button>
        </div>
      </div>

      {/* Cart Items List — scrollable middle section */}
      <div className='min-h-0 flex-1 overflow-hidden'>
        <ScrollArea className='h-full overscroll-contain'>
          <div className='p-2'>
            {items.length === 0 ? (
              <div className='flex h-64 min-h-[200px] flex-col items-center justify-center p-6 text-center text-muted-foreground'>
                <ShoppingCart className='mb-3 h-12 w-12 stroke-[1.5] opacity-20' />
                <p className='text-sm font-semibold'>{t('pos.cartSection.cartEmpty', 'Cart is empty')}</p>
                <p className='mt-1 max-w-[200px] text-xs text-muted-foreground/80'>
                  {t(
                    'pos.cartSection.cartEmptyDesc',
                    'Scan a barcode or click items from the catalog to start a sale.'
                  )}
                </p>
              </div>
            ) : (
              <div className='space-y-2'>
                {items.map((item) => {
                  const hasAvailableStock = item.availableQuantity != null
                  const isOverStock =
                    hasAvailableStock &&
                    item.quantity > (item.availableQuantity ?? 0)
                  const isAtMax =
                    hasAvailableStock &&
                    item.quantity >= (item.availableQuantity ?? 0)

                  return (
                    <div
                      key={item.id}
                      className={`group space-y-2 rounded-lg border bg-card p-2.5 shadow-sm transition-all hover:border-primary/40 ${isOverStock ? 'border-destructive/50 bg-destructive/5' : ''}`}
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <div className='min-w-0 flex-1'>
                          <div className='line-clamp-2 text-xs leading-tight font-semibold break-words'>
                            {item.name}
                          </div>
                          <div className='mt-0.5 flex items-center gap-1.5'>
                            <span className='text-[10px] text-muted-foreground'>
                              {item.sku}
                            </span>
                            <span className='text-[10px] text-muted-foreground'>
                              •
                            </span>
                            <span className='text-[11px] font-medium'>
                              {formatCurrency(item.unitPrice)}
                            </span>
                          </div>
                          {/* Stock badge */}
                          {hasAvailableStock && (
                            <div className='mt-1 flex items-center gap-1'>
                              <Package className='h-3 w-3 text-muted-foreground' />
                              <span
                                className={`text-[10px] font-medium ${isOverStock ? 'text-destructive' : 'text-muted-foreground'}`}
                              >
                                {t('pos.cartSection.available', 'Available: {{count}}', {
                                  count: item.availableQuantity,
                                })}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className='shrink-0 text-right'>
                          <div className='text-xs font-bold'>
                            {formatCurrency(item.total)}
                          </div>
                          {item.discountAmount > 0 && (
                            <div className='text-[10px] font-medium text-emerald-600 dark:text-emerald-400'>
                              -{formatCurrency(item.discountAmount)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quantity Controls & Line Discount */}
                      <div className='flex items-center justify-between border-t border-muted/50 pt-1'>
                        <div className='flex items-center gap-1 rounded-md border bg-muted/30 p-0.5'>
                          <Button
                            size='icon'
                            variant='ghost'
                            className='h-7 w-7 rounded-sm'
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                          >
                            <Minus className='h-3.5 w-3.5' />
                          </Button>
                          <span
                            className={`w-7 text-center text-xs font-bold ${isOverStock ? 'text-destructive' : ''}`}
                          >
                            {item.quantity}
                          </span>
                          <Button
                            size='icon'
                            variant='ghost'
                            className='h-7 w-7 rounded-sm'
                            disabled={isAtMax}
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            title={
                              isAtMax
                                ? t('pos.cartSection.maxStockTooltip', 'Max stock: {{max}}', {
                                    max: item.availableQuantity,
                                  })
                                : undefined
                            }
                          >
                            <Plus className='h-3.5 w-3.5' />
                          </Button>
                        </div>

                        <div className='flex items-center gap-1'>
                          {item.discount ? (
                            <Badge
                              variant='secondary'
                              className='h-6 cursor-pointer gap-1 px-1.5 text-[10px] hover:bg-destructive/10 hover:text-destructive'
                              onClick={() => removeItemDiscount(item.id)}
                              title={t(
                                'pos.cartSection.removeDiscountTooltip',
                                'Click to remove discount'
                              )}
                            >
                              {item.discount.type === 'percentage'
                                ? t('pos.cartSection.percentOff', '{{percent}}% off', {
                                    percent: item.discount.value,
                                  })
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
                              title={t(
                                'pos.cartSection.applyLineDiscount',
                                'Apply line discount'
                              )}
                            >
                              <Tag className='h-3 w-3' />
                            </Button>
                          )}

                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-6 w-6 text-muted-foreground hover:text-rose-500'
                            onClick={() => removeItem(item.id)}
                            title={t('pos.cartSection.removeLine', 'Remove line')}
                          >
                            <Trash2 className='h-3 w-3' />
                          </Button>
                        </div>
                      </div>

                      {/* Inline stock error */}
                      {isOverStock && (
                        <div className='flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-[11px] font-medium text-destructive'>
                          <AlertTriangle className='h-3.5 w-3.5 shrink-0' />
                          <span>
                            {t(
                              'pos.cartSection.exceedsStock',
                              'Exceeds available stock ({{max}}). Reduce quantity to proceed.',
                              { max: item.availableQuantity }
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Cart Totals & Checkout Actions */}
      <div className='shrink-0 space-y-2.5 border-t bg-card p-3 shadow-lg'>
        <div className='space-y-1.5 text-xs'>
          <div className='flex justify-between text-muted-foreground'>
            <span>{t('pos.cartSection.subtotal', 'Subtotal')}</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          {/* Cart-level discount row */}
          <div className='flex items-center justify-between text-muted-foreground'>
            <div className='flex items-center gap-1.5'>
              <span>{t('pos.cartSection.orderDiscount', 'Order Discount')}</span>
              <Popover
                open={isCartDiscountOpen}
                onOpenChange={setIsCartDiscountOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-5 px-1 text-[10px] text-primary hover:underline'
                  >
                    {cartDiscount
                      ? t('pos.cartSection.edit', 'Edit')
                      : t('pos.cartSection.add', '+ Add')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-64 space-y-3 p-3' align='start'>
                  <h4 className='text-xs font-bold'>
                    {t('pos.cartSection.orderLevelDiscount', 'Order Level Discount')}
                  </h4>
                  <div className='flex gap-2'>
                    <Button
                      type='button'
                      size='sm'
                      variant={
                        cartDiscountType === 'percentage'
                          ? 'default'
                          : 'outline'
                      }
                      className='h-7 flex-1 text-xs'
                      onClick={() => setCartDiscountType('percentage')}
                    >
                      {t('pos.cartSection.percent', 'Percent (%)')}
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      variant={
                        cartDiscountType === 'fixed' ? 'default' : 'outline'
                      }
                      className='h-7 flex-1 text-xs'
                      onClick={() => setCartDiscountType('fixed')}
                    >
                      {t('pos.cartSection.fixed', 'Fixed ($)')}
                    </Button>
                  </div>
                  <Input
                    type='number'
                    min='0'
                    placeholder={
                      cartDiscountType === 'percentage' ? '10%' : '5.00'
                    }
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
                        {t('pos.cartSection.remove', 'Remove')}
                      </Button>
                    )}
                    <Button
                      type='button'
                      size='sm'
                      className='h-7 text-xs'
                      onClick={handleApplyCartDiscount}
                    >
                      {t('pos.cartSection.applyBtn', 'Apply')}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <span
              className={
                totalDiscount > 0
                  ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                  : ''
              }
            >
              {totalDiscount > 0
                ? `-${formatCurrency(totalDiscount)}`
                : '$0.00'}
            </span>
          </div>

          {/* Promotions & Discounts row */}
          <div className='flex items-center justify-between text-muted-foreground'>
            <div className='flex items-center gap-1.5'>
              <Ticket className='h-3 w-3 text-primary' />
              <span className='font-medium text-foreground/85'>
                {t('pos.promotions.title', 'Promotions & Discounts')}
              </span>
            </div>
            <Button
              variant='ghost'
              size='sm'
              className='h-5 px-1 text-[10px] text-primary hover:underline font-semibold'
              onClick={() => setIsPromoOpen(true)}
            >
              {appliedPromotion
                ? t('pos.cartSection.change', 'Change')
                : t('pos.cartSection.browse', '+ Browse')}
            </Button>
          </div>
          {appliedPromotion && (
            <div className='flex items-center justify-between gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2 py-1 text-[10px]'>
              <div className='flex items-center gap-1.5 min-w-0 flex-1'>
                <Badge
                  variant='secondary'
                  className='h-4.5 gap-1 px-1.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                >
                  <Tag className='h-2.5 w-2.5' />
                  <span className='truncate max-w-[130px]'>
                    {appliedPromotion.code || appliedPromotion.name}
                  </span>
                </Badge>
                <span className='text-[10px] text-emerald-600 dark:text-emerald-400 font-medium'>
                  {appliedPromotion.discount_type === 'fixed'
                    ? formatCurrency(Number(appliedPromotion.discount_value))
                    : `${appliedPromotion.discount_value}%`}{' '}
                  off
                </span>
              </div>
              <Button
                variant='ghost'
                size='sm'
                className='h-4 w-4 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10'
                onClick={() => removePromotion()}
                title={t('pos.promotions.remove', 'Remove')}
              >
                <X className='h-3 w-3' />
              </Button>
            </div>
          )}

          <div className='flex justify-between text-muted-foreground'>
            <span>{t('pos.cartSection.taxes', 'Taxes')}</span>
            <span>{formatCurrency(tax)}</span>
          </div>

          <Separator />

          <div className='flex items-baseline justify-between pt-1'>
            <span className='text-xs sm:text-sm font-bold tracking-tight'>
              {t('pos.cartSection.total', 'TOTAL')}
            </span>
            <span className='text-xl sm:text-2xl font-black tracking-tight text-primary'>
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className='grid grid-cols-4 gap-2 pt-1'>
          <Button
            type='button'
            variant='outline'
            className='col-span-1 h-11 gap-1 border-amber-500/30 px-2 text-xs font-semibold hover:bg-amber-500/10'
            disabled={items.length === 0}
            onClick={onOpenHold}
            title={t('pos.cartSection.holdTooltip', 'Hold / Suspend Cart (F4)')}
          >
            <PauseCircle className='h-4 w-4 text-amber-500 shrink-0' />
            <span className='hidden sm:inline'>{t('pos.cartSection.hold', 'Hold')}</span>
          </Button>

          <Button
            type='button'
            disabled={items.length === 0 || stockErrorsExist}
            onClick={onOpenCheckout}
            className='col-span-3 h-11 gap-1.5 sm:gap-2 bg-primary px-3 text-sm sm:text-base font-extrabold text-primary-foreground shadow-md transition-all hover:shadow-lg active:scale-[0.98]'
            title={
              stockErrorsExist ? t('pos.cartSection.fixStockErrors', 'Fix Stock Errors') : undefined
            }
          >
            <CreditCard className='h-4 w-4 sm:h-5 sm:w-5 shrink-0' />
            <span className='truncate'>
              {stockErrorsExist
                ? t('pos.cartSection.fixStockErrors', 'Fix Stock Errors')
                : t('pos.cartSection.payF9', 'Pay (F9) • {{amount}}', {
                    amount: formatCurrency(total),
                  })}
            </span>
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
              {t('pos.cartSection.lineDiscountTitle', 'Discount for {{name}}', {
                name: discountingItem?.name,
              })}
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-3 py-2'>
            <div className='flex gap-2'>
              <Button
                type='button'
                size='sm'
                variant={
                  lineDiscountType === 'percentage' ? 'default' : 'outline'
                }
                className='h-8 flex-1 text-xs'
                onClick={() => setLineDiscountType('percentage')}
              >
                {t('pos.cartSection.percent', 'Percent (%)')}
              </Button>
              <Button
                type='button'
                size='sm'
                variant={lineDiscountType === 'fixed' ? 'default' : 'outline'}
                className='h-8 flex-1 text-xs'
                onClick={() => setLineDiscountType('fixed')}
              >
                {t('pos.cartSection.fixed', 'Fixed ($)')}
              </Button>
            </div>
            <div className='space-y-1'>
              <Label className='text-xs'>{t('pos.cartSection.discountValue', 'Discount Value')}</Label>
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
              {t('pos.cartSection.cancel', 'Cancel')}
            </Button>
            <Button type='button' size='sm' onClick={handleApplyLineDiscount}>
              {t('pos.cartSection.applyDiscountBtn', 'Apply Discount')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Customer Dialog */}
      <PosQuickCustomerDialog
        open={isQuickCustomerOpen}
        onOpenChange={setIsQuickCustomerOpen}
        onCustomerCreated={(c) => {
          setCustomer({
            id: c.id,
            name: `${c.first_name} ${c.last_name}`,
            email: c.email,
            phone: c.phone,
          })
          setIsQuickCustomerOpen(false)
        }}
      />

      {/* Promo Code Dialog */}
      <PromoCodeDialog open={isPromoOpen} onOpenChange={setIsPromoOpen} />
    </div>
  )
}
