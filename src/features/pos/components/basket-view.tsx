import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Minus, Trash2, CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { createPosTransaction } from '../data/api'
import { useBasket } from '../store/use-basket'
import { printReceipt } from '../utils/receipt-printer'
import { DiscountToggle } from './discount-toggle'
import { RefundDialog } from './refund-dialog'
import { ReorderDialog } from './reorder-dialog'
import { CheckoutModal } from './checkout-modal'
import type { ShipmentType } from '../schemas/checkout'
import type { CheckoutResponse } from '../types'

export function BasketView() {
  const {
    items,
    updateQuantity,
    removeItem,
    clearBasket,
    getSubtotal,
    getTotalAmount,
    getTaxAmount,
  } = useBasket()
  const { selectedBranchId } = useAuthStore((state) => state.auth)
  const queryClient = useQueryClient()
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [itemView, setItemView] = useState<'detailed' | 'compact'>('detailed')

  const subtotal = getSubtotal()
  const tax = getTaxAmount()
  const total = getTotalAmount()
  const cartDiscount = subtotal + tax - total
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0)
  const hasMissingVariantItems = items.some((item) => !item.productVariantId)

  const checkoutMutation = useMutation({
    mutationFn: async ({
      notes,
      paymentMethod,
      shipment,
    }: {
      notes: string
      paymentMethod: 'cash' | 'card' | 'mixed'
      shipment?: ShipmentType
    }) => {
      const checkoutItems = items.map((item) => {
        if (!item.productVariantId) {
          throw new Error(`Missing product variant for "${item.name}"`)
        }

        return {
          productId: item.productId,
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.unitPrice * item.quantity - item.total,
          taxAmount: 0,
        }
      })

      return createPosTransaction({
        branchId: selectedBranchId || '',
        paymentMethod,
        notes,
        isShipment: !!shipment,
        shipment,
        subtotal: subtotal,
        totalAmount: total,
        discountTotal: cartDiscount > 0 ? cartDiscount : 0,
        taxTotal: tax,
        items: checkoutItems,
      })
    },
    onSuccess: (data: CheckoutResponse) => {
      if (!data.success) {
        toast.error(`Checkout failed: ${data.error?.message || 'Unknown error'}`)
        return
      }

      const transactionId = data.invoiceId || data.transactionId || 'UNKNOWN'
      const receiptData = {
        transactionNumber: transactionId.slice(0, 8).toUpperCase(),
        date: new Date(),
        items: items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.unitPrice,
          total: i.total,
        })),
        subtotal: subtotal,
        discount: cartDiscount > 0 ? cartDiscount : undefined,
        tax: tax,
        total: total,
      }

      toast.success('Transaction completed!', {
        action: {
          label: 'Print Receipt',
          onClick: () => printReceipt(receiptData),
        },
      })
      clearBasket()
      queryClient.invalidateQueries({ queryKey: ['pos-products'] })
      queryClient.invalidateQueries({ queryKey: ['shift-metrics'] })
      queryClient.invalidateQueries({ queryKey: ['recent-pos-transactions'] })
    },
    onError: (error: Error) => {
      toast.error(`Checkout failed: ${error.message}`)
    },
  })

  const handlePay = () => {
    setIsCheckoutOpen(true)
  }

  const handleConfirmCheckout = ({
    paymentMethod,
    shipment,
  }: {
    paymentMethod: string
    shipment?: ShipmentType
  }) => {
    if (!selectedBranchId) {
      toast.error('Please select a branch before checkout.')
      return
    }

    const invalidItems = items.filter((item) => !item.productVariantId)
    if (invalidItems.length > 0) {
      const preview = invalidItems
        .slice(0, 3)
        .map((item) => item.name)
        .join(', ')
      const suffix =
        invalidItems.length > 3 ? ` and ${invalidItems.length - 3} more` : ''

      toast.error(
        `Checkout blocked: ${invalidItems.length} item(s) missing variant ID (${preview}${suffix}).`
      )
      return
    }

    checkoutMutation.mutate({
      notes: 'POS Sale',
      paymentMethod: paymentMethod as 'cash' | 'card' | 'mixed',
      shipment,
    })
    setIsCheckoutOpen(false)
  }

  const getDiscountLabel = (
    discount: NonNullable<(typeof items)[number]['discount']>
  ) =>
    discount.type === 'fixed'
      ? formatCurrency(discount.value)
      : `${discount.value}%`

  return (
    <div className='flex h-full flex-col overflow-hidden rounded-lg border bg-background shadow-sm'>
      <div className='border-b bg-background p-4'>
        <div className='mb-3 flex items-start justify-between gap-2'>
          <div>
            <h2 className='text-lg font-semibold tracking-tight'>Current Order</h2>
            <p className='text-xs text-muted-foreground'>
              {items.length === 0
                ? 'Basket is empty'
                : `${items.length} line${items.length === 1 ? '' : 's'} | ${totalUnits} item${totalUnits === 1 ? '' : 's'}`}
            </p>
          </div>
          <Badge variant='secondary' className='font-semibold tabular-nums'>
            {formatCurrency(total)}
          </Badge>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <RefundDialog />
          <ReorderDialog />
          <DiscountToggle />

          <div className='ml-auto inline-flex items-center gap-1 rounded-md border bg-muted/40 p-1'>
            <Button
              type='button'
              variant={itemView === 'detailed' ? 'secondary' : 'ghost'}
              size='sm'
              className='h-7 px-2 text-xs'
              onClick={() => setItemView('detailed')}
            >
              Detailed
            </Button>
            <Button
              type='button'
              variant={itemView === 'compact' ? 'secondary' : 'ghost'}
              size='sm'
              className='h-7 px-2 text-xs'
              onClick={() => setItemView('compact')}
            >
              Compact
            </Button>
          </div>

          {items.length > 0 && (
            <Button variant='outline' size='sm' onClick={clearBasket}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className='flex-1'>
        {items.length === 0 ? (
          <div className='flex h-full flex-col items-center justify-center px-4 py-20 text-center'>
            <p className='text-sm font-medium text-foreground'>
              No items in the basket yet
            </p>
            <p className='mt-1 text-xs text-muted-foreground'>
              Scan a barcode or select a product to begin.
            </p>
          </div>
        ) : (
          <ul className='flex flex-col gap-3 p-4'>
            {items.map((item) => (
              <li
                key={`${item.productId}-${item.productVariantId ?? 'base'}`}
                className={cn(
                  'rounded-lg border bg-background transition-colors hover:bg-muted/20',
                  itemView === 'detailed' ? 'p-3 shadow-xs' : 'p-2.5'
                )}
              >
                <div
                  className={cn(
                    'flex justify-between gap-3',
                    itemView === 'detailed' ? 'items-start' : 'items-center'
                  )}
                >
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-medium text-foreground'>
                      {item.name}
                    </p>
                    {itemView === 'detailed' && (
                      <p className='mt-0.5 truncate text-xs text-muted-foreground'>
                        SKU: {item.sku}
                      </p>
                    )}

                    <div
                      className={cn(
                        'flex items-center text-muted-foreground',
                        itemView === 'detailed'
                          ? 'mt-2 flex-wrap gap-2 text-xs'
                          : 'mt-1 gap-1 text-[11px]'
                      )}
                    >
                      <span className='tabular-nums'>
                        {formatCurrency(item.unitPrice)}
                      </span>
                      <span>x</span>
                      <span className='tabular-nums'>{item.quantity}</span>
                      {itemView === 'detailed' && (
                        <>
                          <span>|</span>
                          <span className='tabular-nums'>
                            {formatCurrency(item.subtotal)}
                          </span>
                        </>
                      )}
                    </div>

                    {item.discount && (
                      <Badge
                        variant='outline'
                        className={cn(
                          'mt-2 text-[10px]',
                          itemView === 'compact' && 'mt-1'
                        )}
                      >
                        Discount {getDiscountLabel(item.discount)}
                      </Badge>
                    )}
                  </div>

                  <div className='text-right'>
                    <p
                      className={cn(
                        'font-semibold text-foreground tabular-nums',
                        itemView === 'detailed' ? 'text-base' : 'text-sm'
                      )}
                    >
                      {formatCurrency(item.total)}
                    </p>
                    {itemView === 'detailed' && item.discount && (
                      <p className='text-[11px] text-emerald-600 tabular-nums'>
                        -{formatCurrency(item.subtotal - item.total)}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  className={cn(
                    'mt-2 flex items-center justify-between',
                    itemView === 'compact' && 'mt-1'
                  )}
                >
                  <div className='inline-flex items-center rounded-md border bg-muted/30'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='size-8 rounded-r-none'
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.quantity - 1,
                          item.productVariantId
                        )
                      }
                      aria-label={`Decrease quantity for ${item.name}`}
                    >
                      <Minus />
                    </Button>
                    <span className='flex h-8 min-w-10 items-center justify-center border-x px-2 text-sm font-medium tabular-nums'>
                      {item.quantity}
                    </span>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='size-8 rounded-l-none'
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.quantity + 1,
                          item.productVariantId
                        )
                      }
                      aria-label={`Increase quantity for ${item.name}`}
                    >
                      <Plus />
                    </Button>
                  </div>

                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='size-8 text-destructive hover:text-destructive'
                    onClick={() => removeItem(item.productId, item.productVariantId)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>

      <div className='rounded-b-lg border-t bg-muted/20 p-4'>
        <div className='flex flex-col gap-2'>
          <div className='flex justify-between text-sm text-muted-foreground'>
            <span>Subtotal</span>
            <span className='tabular-nums'>{formatCurrency(subtotal)}</span>
          </div>
          {cartDiscount > 0 && (
            <div className='flex justify-between text-sm text-orange-500'>
              <span>Discount</span>
              <span className='tabular-nums'>-{formatCurrency(cartDiscount)}</span>
            </div>
          )}
          <div className='flex justify-between text-sm text-muted-foreground'>
            <span>Tax</span>
            <span className='tabular-nums'>{formatCurrency(tax)}</span>
          </div>
        </div>
        <Separator className='my-2' />
        <div className='flex items-center justify-between text-2xl font-bold'>
          <span>Total</span>
          <span className='tabular-nums'>{formatCurrency(total)}</span>
        </div>

        <Button
          className='mt-4 h-14 w-full text-base font-semibold md:text-lg'
          disabled={
            items.length === 0 ||
            hasMissingVariantItems ||
            checkoutMutation.isPending
          }
          onClick={handlePay}
        >
          {checkoutMutation.isPending ? (
            <Loader2 data-icon='inline-start' className='animate-spin' />
          ) : (
            <CreditCard data-icon='inline-start' />
          )}
          Pay {formatCurrency(total)}
        </Button>
      </div>
      <CheckoutModal
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        total={total}
        onConfirm={handleConfirmCheckout}
        isProcessing={checkoutMutation.isPending}
      />
    </div>
  )
}
