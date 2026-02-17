import { useEffect } from 'react'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
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

const checkoutSchema = z
  .object({
    paymentMethodId: z.string().min(1, 'Payment method is required'),
    customerName: z.string().optional(),
    discountType: z.enum(['percent', 'amount']),
    discountValue: z.number().min(0),
    amountPaid: z.number().min(0, 'Amount paid is required'),
    tipAmount: z.number().min(0),
    // Card details (UI only, not stored in DB)
    cardNumber: z.string().optional(),
    holderName: z.string().optional(),
    expiryDate: z.string().optional(),
    cvv: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.discountType === 'percent') {
        return data.discountValue <= 100
      }
      return true
    },
    {
      message: 'Percentage cannot exceed 100%',
      path: ['discountValue'],
    }
  )

type CheckoutFormValues = z.infer<typeof checkoutSchema>

export function CheckoutDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: CheckoutDialogProps) {
  const { data: paymentMethods, isLoading: methodsLoading } =
    usePaymentMethods()
  const { mutate: updateOrder, isPending: isProcessing } =
    useUpdateOrderStatus()

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethodId: '',
      customerName: '',
      discountType: 'amount',
      discountValue: 0,
      amountPaid: 0,
      tipAmount: 0,
      cardNumber: '',
      holderName: '',
      expiryDate: '',
      cvv: '',
    },
  })

  // Set initial values when order opens
  useEffect(() => {
    if (order && open) {
      form.reset({
        paymentMethodId: '',
        customerName: order.customer_name || '',
        discountType: 'amount',
        discountValue: 0,
        amountPaid: order.total_amount || 0,
        tipAmount: 0,
        cardNumber: '',
        holderName: '',
        expiryDate: '',
        cvv: '',
      })
    }
  }, [order, open, form])

  // Calculate totals dynamically
  const discountType = form.watch('discountType')
  const discountValue = form.watch('discountValue')
  const amountPaid = form.watch('amountPaid')
  // Watch payment method to conditionally show card fields
  const paymentMethodId = form.watch('paymentMethodId')

  // Find selected method name to know if it's a card
  const selectedMethod = paymentMethods?.find((m) => m.id === paymentMethodId)
  const isCard =
    selectedMethod?.name.toLowerCase().includes('card') ||
    selectedMethod?.name.toLowerCase().includes('visa') ||
    selectedMethod?.name.toLowerCase().includes('master')

  const subtotal = order?.subtotal || 0

  // Calculate discount amount based on type
  let calculatedDiscount = 0
  if (discountType === 'percent') {
    calculatedDiscount = (subtotal * (discountValue || 0)) / 100
  } else {
    calculatedDiscount = discountValue || 0
  }

  // Calculate total after discount
  const totalAfterDiscount = Math.max(0, subtotal - calculatedDiscount)

  // Calculate tip/change
  // If amount paid > total, the rest is tip/change
  const remaining = Math.max(0, (amountPaid || 0) - totalAfterDiscount)

  // Update tip amount field whenever calculation changes
  useEffect(() => {
    form.setValue('tipAmount', remaining)
  }, [remaining, form])

  // Custom validation for max discount amount (10% rule)
  useEffect(() => {
    if (discountType === 'amount' && subtotal > 0) {
      const maxDiscount = subtotal * 0.1
      if (discountValue > maxDiscount) {
        form.setError('discountValue', {
          type: 'manual',
          message: `Discount cannot exceed 10% (${formatCurrency(maxDiscount)})`,
        })
      } else {
        form.clearErrors('discountValue')
      }
    }
  }, [discountValue, discountType, subtotal, form])

  const onSubmit = (values: CheckoutFormValues) => {
    if (!order) return

    // Final validation check before submit
    if (discountType === 'amount' && subtotal > 0) {
      const maxDiscount = subtotal * 0.1
      if (discountValue > maxDiscount) {
        form.setError('discountValue', {
          type: 'manual',
          message: `Discount cannot exceed 10% (${formatCurrency(maxDiscount)})`,
        })
        return
      }
    }

    updateOrder(
      {
        orderId: order.id,
        status: 'paid',
        paymentMethod: values.paymentMethodId,
        customerName: values.customerName,
        discountType: values.discountType,
        discountAmount: calculatedDiscount,
        tipAmount: values.tipAmount,
      },
      {
        onSuccess: () => {
          toast.success('Payment processed successfully')
          onOpenChange(false)
          form.reset()
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
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>Checkout Order #{order.order_number}</DialogTitle>
          <DialogDescription>
            Table {order.table?.table_number} • {order.items?.length || 0} items
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-6 py-4'
          >
            {/* Customer Info */}
            <FormField
              control={form.control}
              name='customerName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Enter customer name (optional)'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Discount Section */}
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='discountType'
                render={({ field }) => (
                  <FormItem className='space-y-3'>
                    <FormLabel>Discount Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className='flex flex-row space-x-4'
                      >
                        <FormItem className='flex items-center space-y-0 space-x-2'>
                          <FormControl>
                            <RadioGroupItem value='amount' />
                          </FormControl>
                          <FormLabel className='font-normal'>Amount</FormLabel>
                        </FormItem>
                        <FormItem className='flex items-center space-y-0 space-x-2'>
                          <FormControl>
                            <RadioGroupItem value='percent' />
                          </FormControl>
                          <FormLabel className='font-normal'>Percent</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='discountValue'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Discount Value
                      {discountType === 'percent' ? ' (%)' : ''}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={0}
                        step={discountType === 'percent' ? 1 : 0.01}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Order Summary */}
            <div className='space-y-2 rounded-lg bg-slate-50 p-4 dark:bg-slate-900'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className='flex justify-between text-sm text-green-600'>
                <span>Discount</span>
                <span>- {formatCurrency(calculatedDiscount)}</span>
              </div>
              <Separator className='my-2' />
              <div className='flex justify-between text-lg font-bold'>
                <span>Total Amount</span>
                <span className='text-orange-600'>
                  {formatCurrency(totalAfterDiscount)}
                </span>
              </div>
            </div>

            {/* Payment Section */}
            <div className='space-y-4'>
              <FormField
                control={form.control}
                name='paymentMethodId'
                render={({ field }) => (
                  <FormItem className='space-y-3'>
                    <FormLabel>Payment Method</FormLabel>
                    {methodsLoading ? (
                      <div className='flex justify-center p-2'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                      </div>
                    ) : (
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className='grid grid-cols-2 gap-4'
                        >
                          {paymentMethods?.map((method) => (
                            <div key={method.id}>
                              <RadioGroupItem
                                value={method.id}
                                id={method.id}
                                className='peer sr-only'
                              />
                              <Label
                                htmlFor={method.id}
                                className='flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 peer-data-[state=checked]:border-primary hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary'
                              >
                                {method.name}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Card Details - Conditional Render */}
              {isCard && (
                <div className='animate-in space-y-4 rounded-md border p-4 fade-in slide-in-from-top-2'>
                  <div className='grid grid-cols-2 gap-4'>
                    <FormField
                      control={form.control}
                      name='holderName'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Holder Name</FormLabel>
                          <FormControl>
                            <Input placeholder='Name on card' {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='cardNumber'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='**** **** **** ****'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className='grid grid-cols-2 gap-4'>
                    <FormField
                      control={form.control}
                      name='expiryDate'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry Date</FormLabel>
                          <FormControl>
                            <Input placeholder='MM/YY' {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='cvv'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CVV</FormLabel>
                          <FormControl>
                            <Input placeholder='123' maxLength={4} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Payment Details */}
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='amountPaid'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Tendered</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          step={0.01}
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='tipAmount'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Change / Tip (Auto)</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          {...field}
                          readOnly
                          className='bg-slate-100 dark:bg-slate-800'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className='pt-4'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={isProcessing}
                className='bg-orange-600 hover:bg-orange-700'
              >
                {isProcessing && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                Process Payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
