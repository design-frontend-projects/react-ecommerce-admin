import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { Plus, Minus, Trash2, CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { createPosTransaction } from '../data/api'
import { useBasket } from '../store/use-basket'
import { printReceipt } from '../utils/receipt-printer'
import { DiscountToggle } from './discount-toggle'
import { ReorderDialog } from './reorder-dialog'

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
  const { orgId, userId } = useAuth()
  const queryClient = useQueryClient()

  const subtotal = getSubtotal()
  const tax = getTaxAmount()
  const total = getTotalAmount()
  const cartDiscount = subtotal + tax - total

  const checkoutMutation = useMutation({
    mutationFn: async ({
      notes,
      transactionNumber,
    }: {
      notes: string
      transactionNumber: string
    }) => {
      return createPosTransaction({
        tenant_id: orgId || '',
        clerk_user_id: userId || '',
        transaction_number: transactionNumber,
        notes,
        items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount_amount: item.unitPrice * item.quantity - item.total,
          tax_amount: 0,
        })),
      })
    },
    onSuccess: (transactionId: string) => {
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
    const transactionNumber = `POS-${Date.now()}`
    checkoutMutation.mutate({ notes: 'POS Sale', transactionNumber })
  }

  return (
    <div className='flex h-full flex-col rounded-lg border bg-white shadow'>
      <div className='flex items-center justify-between rounded-t-lg border-b bg-muted/50 p-4'>
        <h2 className='text-lg font-bold'>Current Order</h2>
        <div className='flex items-center gap-2'>
          <ReorderDialog />
          <DiscountToggle />
          {items.length > 0 && (
            <Button
              variant='ghost'
              size='sm'
              className='text-destructive'
              onClick={clearBasket}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className='flex-1 p-4'>
        {items.length === 0 ? (
          <div className='flex h-full items-center justify-center py-20 text-muted-foreground'>
            Basket is empty. Scan an item.
          </div>
        ) : (
          <ul className='space-y-4'>
            {items.map((item) => (
              <li
                key={item.productId}
                className='flex items-center justify-between'
              >
                <div className='min-w-0 flex-1 pr-4'>
                  <p className='truncate font-medium'>{item.name}</p>
                  <p className='text-sm text-muted-foreground'>
                    {formatCurrency(item.unitPrice)} x {item.quantity}
                  </p>
                  {item.discount && (
                    <p className='flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-500'>
                      Discount:{' '}
                      {item.discount.type === 'fixed'
                        ? formatCurrency(item.discount.value)
                        : `${item.discount.value}%`}
                    </p>
                  )}
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-8 w-8'
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity - 1)
                    }
                  >
                    <Minus className='h-4 w-4' />
                  </Button>
                  <span className='w-6 text-center tabular-nums'>
                    {item.quantity}
                  </span>
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-8 w-8'
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity + 1)
                    }
                  >
                    <Plus className='h-4 w-4' />
                  </Button>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='ml-2 h-8 w-8 text-destructive'
                    onClick={() => removeItem(item.productId)}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
                <div className='w-20 text-right font-medium tabular-nums'>
                  {formatCurrency(item.total)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>

      <div className='space-y-2 rounded-b-lg border-t bg-muted/20 p-4'>
        <div className='flex justify-between text-sm text-muted-foreground'>
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {cartDiscount > 0 && (
          <div className='flex justify-between text-sm text-orange-500'>
            <span>Discount</span>
            <span>-{formatCurrency(cartDiscount)}</span>
          </div>
        )}
        <div className='flex justify-between text-sm text-muted-foreground'>
          <span>Tax</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <Separator className='my-2' />
        <div className='flex justify-between text-2xl font-bold'>
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>

        <Button
          className='mt-4 h-16 w-full text-xl'
          disabled={items.length === 0 || checkoutMutation.isPending}
          onClick={handlePay}
        >
          {checkoutMutation.isPending ? (
            <Loader2 className='mr-2 h-6 w-6 animate-spin' />
          ) : (
            <CreditCard className='mr-2 h-6 w-6' />
          )}
          Pay {formatCurrency(total)}
        </Button>
      </div>
    </div>
  )
}
