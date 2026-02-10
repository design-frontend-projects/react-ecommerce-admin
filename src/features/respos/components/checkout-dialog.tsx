import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { useUpdateOrderStatus } from '../api/mutations'
import { usePaymentMethods } from '../api/queries'
import { formatCurrency } from '../lib/formatters'
import type { ResOrderWithDetails } from '../types'

interface CheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: ResOrderWithDetails | null
  onSuccess?: () => void
}

export function CheckoutDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: CheckoutDialogProps) {
  const [paymentMethodId, setPaymentMethodId] = useState<string>('')

  const { data: paymentMethods, isLoading: methodsLoading } =
    usePaymentMethods()
  const { mutate: updateOrder, isPending: isProcessing } =
    useUpdateOrderStatus()

  const handlePayment = () => {
    if (!order || !paymentMethodId) return

    // Find method name for better data consistency if needed, but ID is usually fine
    // The schema expects a string, could be 'cash', 'card', etc. or UUID.
    // Assuming we pass the ID for now or name if preferrable. 'res_payment_methods' has 'name' and 'id'.
    // Let's pass the ID as that's more robust.

    updateOrder(
      {
        orderId: order.id,
        status: 'paid',
        paymentMethod: paymentMethodId,
      },
      {
        onSuccess: () => {
          toast.success('Payment processed successfully')
          onOpenChange(false)
          setPaymentMethodId('') // Reset
          onSuccess?.()
        },
        onError: () => {
          toast.error('Failed to process payment')
        },
      }
    )
  }

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Checkout Order #{order.order_number}</DialogTitle>
          <DialogDescription>
            Table {order.table?.table_number} • {order.items?.length || 0} items
          </DialogDescription>
        </DialogHeader>

        <div className='py-4'>
          {/* Order Summary */}
          <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {/* Tax would be calculated in backend or trusted from order total if it includes it */}
            <div className='flex justify-between text-lg font-bold'>
              <span>Total Amount</span>
              <span className='text-orange-600'>
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>

          <Separator className='my-4' />

          {/* Payment Method */}
          <div className='space-y-3'>
            <Label>Payment Method</Label>
            {methodsLoading ? (
              <div className='flex justify-center p-2'>
                <Loader2 className='h-4 w-4 animate-spin' />
              </div>
            ) : (
              <RadioGroup
                value={paymentMethodId}
                onValueChange={setPaymentMethodId}
              >
                <div className='grid gap-2'>
                  {paymentMethods?.map((method) => (
                    <div
                      key={method.id}
                      className='flex items-center space-x-2 rounded border p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900'
                    >
                      <RadioGroupItem value={method.id} id={method.id} />
                      <Label
                        htmlFor={method.id}
                        className='flex-1 cursor-pointer font-medium'
                      >
                        {method.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePayment}
            disabled={!paymentMethodId || isProcessing}
            className='bg-orange-600 hover:bg-orange-700'
          >
            {isProcessing && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Pay {formatCurrency(order.total_amount)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
