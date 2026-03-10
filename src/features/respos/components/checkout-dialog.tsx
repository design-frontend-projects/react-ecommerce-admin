import { useEffect, useState } from 'react'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, Tag, X } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { useRecordPromotionUsage, useUpdateOrderStatus } from '../api/mutations'
import { usePaymentMethods, useValidatePromoCode } from '../api/queries'
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
    mobileNumber: z.string().optional(),
    discountType: z.enum(['percent', 'amount']),
    discountValue: z.number().min(0),
    promoCode: z.string().optional(),
    receivedAmount: z.number().min(0, 'Received amount is required'),
    tipAmount: z.number().min(0),
    // Card UI fields (not stored)
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
  const { cart, clearCart } = useResposStore()
  const { data: paymentMethods, isLoading: methodsLoading } = usePaymentMethods()
  const { mutate: updateOrder, isPending: isProcessing } = useUpdateOrderStatus()
  const { mutate: recordPromoUsage } = useRecordPromotionUsage()

  // Promo code state — debounced input drives the query
  const [promoInput, setPromoInput] = useState('')
  const [appliedPromoCode, setAppliedPromoCode] = useState<string>('')
  const subtotal = order?.subtotal ?? 0

  const {
    data: promoResult,
    isLoading: isValidatingPromo,
    isFetching: isFetchingPromo,
  } = useValidatePromoCode(promoInput, subtotal)

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethodId: '',
      customerName: '',
      mobileNumber: '',
      discountType: 'amount',
      discountValue: 0,
      promoCode: '',
      receivedAmount: 0,
      tipAmount: 0,
      cardNumber: '',
      holderName: '',
      expiryDate: '',
      cvv: '',
    },
  })

  // Reset when dialog opens
  useEffect(() => {
    if (order && open) {
      // Find payment method ID if name matches
      const methodId = paymentMethods?.find(m => m.name === cart.paymentMethod)?.id || ''
      
      form.reset({
        paymentMethodId: methodId,
        customerName: order.customer_name ?? '',
        mobileNumber: cart.customerMobile || order.mobile_number || '',
        discountType: cart.manualDiscountType === 'percentage' ? 'percent' : 'amount',
        discountValue: cart.manualDiscountAmount || 0,
        promoCode: cart.promoCode || '',
        receivedAmount: cart.receivedAmount || 0,
        tipAmount: 0,
        cardNumber: '',
        holderName: '',
        expiryDate: '',
        cvv: '',
      })
      setPromoInput(cart.promoCode || '')
      setAppliedPromoCode(cart.promoCode || '')
    }
  }, [order, open, form, cart, paymentMethods])

  // Computed values
  const discountType = form.watch('discountType')
  const discountValue = form.watch('discountValue')
  const receivedAmount = form.watch('receivedAmount')
  const paymentMethodId = form.watch('paymentMethodId')

  const selectedMethod = paymentMethods?.find((m) => m.id === paymentMethodId)
  const isCard =
    selectedMethod?.name.toLowerCase().includes('card') ||
    selectedMethod?.name.toLowerCase().includes('visa') ||
    selectedMethod?.name.toLowerCase().includes('master')

  // Manual discount amount
  let manualDiscount = 0
  if (discountType === 'percent') {
    manualDiscount = (subtotal * (discountValue || 0)) / 100
  } else {
    manualDiscount = discountValue || 0
  }

  // Promo discount (only when a valid promo is applied)
  const promoDiscount = appliedPromoCode && promoResult?.valid ? (promoResult.discountAmount ?? 0) : 0
  const appliedPromotion = appliedPromoCode && promoResult?.valid ? promoResult.promotion : undefined

  // Total calculations
  const totalDiscount = manualDiscount + promoDiscount
  const totalAfterDiscount = Math.max(0, subtotal - totalDiscount)
  const taxAmount = order?.tax_amount ?? 0
  const grandTotal = totalAfterDiscount + taxAmount

  // Change / tip
  const change = Math.max(0, (receivedAmount || 0) - grandTotal)
  const shortfall = receivedAmount > 0 && receivedAmount < grandTotal ? grandTotal - receivedAmount : 0

  // Enforce 10% max for manual discount amounts
  useEffect(() => {
    if (discountType === 'amount' && subtotal > 0) {
      const maxDiscount = subtotal * 0.1
      if (discountValue > maxDiscount) {
        form.setError('discountValue', {
          type: 'manual',
          message: `Max discount is 10% (${formatCurrency(maxDiscount)})`,
        })
      } else {
        form.clearErrors('discountValue')
      }
    }
  }, [discountValue, discountType, subtotal, form])

  function handleApplyPromo() {
    if (!promoInput.trim()) return
    if (!promoResult) return
    if (promoResult.valid) {
      setAppliedPromoCode(promoInput.toUpperCase().trim())
      toast.success(`Promo "${promoInput.toUpperCase().trim()}" applied — ${formatCurrency(promoResult.discountAmount)} off`)
    } else {
      toast.error(promoResult.error ?? 'Invalid promo code')
    }
  }

  function handleRemovePromo() {
    setPromoInput('')
    setAppliedPromoCode('')
  }

  const onSubmit = (values: CheckoutFormValues) => {
    if (!order) return

    // Block if received amount is less than grand total
    if (values.receivedAmount < grandTotal && !isCard) {
      form.setError('receivedAmount', {
        type: 'manual',
        message: `Amount must be at least ${formatCurrency(grandTotal)}`,
      })
      return
    }

    updateOrder(
      {
        orderId: order.id,
        status: 'paid',
        paymentMethod: values.paymentMethodId,
        customerName: values.customerName,
        mobileNumber: values.mobileNumber,
        discountType: values.discountType,
        discountAmount: manualDiscount,
        promotionId: appliedPromotion?.id,
        promoDiscountAmount: promoDiscount,
        receivedAmount: values.receivedAmount,
        changeAmount: change,
        tipAmount: change, // tip = change for cash scenarios
      },
      {
        onSuccess: (data) => {
          // Record promo usage after successful payment
          if (appliedPromotion?.id) {
            recordPromoUsage({
              promotionId: appliedPromotion.id,
              orderId: data.id,
            })
          }
          toast.success('Payment processed successfully')
          onOpenChange(false)
          form.reset()
          setPromoInput('')
          setAppliedPromoCode('')
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
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[640px]'>
        <DialogHeader>
          <DialogTitle>Checkout — Order #{order.order_number}</DialogTitle>
          <DialogDescription>
            {order.table ? `Table ${order.table.table_number}` : 'Takeaway'} •{' '}
            {order.items?.length || 0} items
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-5 py-2'>
            {/* Customer Info */}
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='customerName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Optional' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='mobileNumber'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder='Optional' type='tel' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Discount Section */}
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='discountType'
                render={({ field }) => (
                  <FormItem className='space-y-3'>
                    <FormLabel>Manual Discount</FormLabel>
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
                          <FormLabel className='font-normal'>%</FormLabel>
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
                      Discount Value{discountType === 'percent' ? ' (%)' : ''}
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

            {/* Promo Code */}
            <div className='space-y-2'>
              <Label className='text-sm font-medium'>Promo Code</Label>
              {appliedPromoCode ? (
                <div className='flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-2 dark:border-green-800 dark:bg-green-950'>
                  <CheckCircle2 className='h-4 w-4 text-green-600' />
                  <span className='flex-1 text-sm font-medium text-green-700 dark:text-green-400'>
                    {appliedPromoCode}
                    {appliedPromotion && (
                      <Badge variant='secondary' className='ml-2 text-xs'>
                        -{formatCurrency(promoDiscount)}
                      </Badge>
                    )}
                  </span>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-6 w-6 p-0 text-green-700 hover:text-destructive'
                    onClick={handleRemovePromo}
                  >
                    <X className='h-3 w-3' />
                  </Button>
                </div>
              ) : (
                <div className='flex gap-2'>
                  <Input
                    placeholder='Enter promo code'
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleApplyPromo()
                      }
                    }}
                    className='uppercase'
                  />
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleApplyPromo}
                    disabled={!promoInput.trim() || isValidatingPromo || isFetchingPromo}
                    className='shrink-0'
                  >
                    {(isValidatingPromo || isFetchingPromo) ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <Tag className='h-4 w-4' />
                    )}
                    <span className='ml-2'>Apply</span>
                  </Button>
                </div>
              )}
              {promoInput && !appliedPromoCode && promoResult && !promoResult.valid && (
                <p className='text-xs text-destructive'>{promoResult.error}</p>
              )}
            </div>

            <Separator />

            {/* Order Summary */}
            <div className='space-y-2 rounded-lg bg-slate-50 p-4 dark:bg-slate-900'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {manualDiscount > 0 && (
                <div className='flex justify-between text-sm text-green-600'>
                  <span>Manual Discount</span>
                  <span>- {formatCurrency(manualDiscount)}</span>
                </div>
              )}
              {promoDiscount > 0 && (
                <div className='flex justify-between text-sm text-green-600'>
                  <span>Promo ({appliedPromoCode})</span>
                  <span>- {formatCurrency(promoDiscount)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className='flex justify-between text-sm text-muted-foreground'>
                  <span>Tax</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <Separator className='my-2' />
              <div className='flex justify-between text-lg font-bold'>
                <span>Total Due</span>
                <span className='text-orange-600'>{formatCurrency(grandTotal)}</span>
              </div>
              {receivedAmount > 0 && change > 0 && (
                <div className='flex justify-between text-sm font-semibold text-emerald-600'>
                  <span>Change</span>
                  <span>{formatCurrency(change)}</span>
                </div>
              )}
              {shortfall > 0 && (
                <div className='flex justify-between text-sm font-semibold text-destructive'>
                  <span>Shortfall</span>
                  <span>- {formatCurrency(shortfall)}</span>
                </div>
              )}
            </div>

            {/* Payment Method */}
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
                        className='grid grid-cols-3 gap-3'
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
                              className='flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 text-sm peer-data-[state=checked]:border-primary hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer'
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

            {/* Card Details */}
            {isCard && (
              <div className='animate-in space-y-4 rounded-md border p-4 fade-in slide-in-from-top-2'>
                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='holderName'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Card Holder</FormLabel>
                        <FormControl>
                          <Input placeholder='Name on card' {...field} />
                        </FormControl>
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
                          <Input placeholder='**** **** **** ****' {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='expiryDate'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiry</FormLabel>
                        <FormControl>
                          <Input placeholder='MM/YY' {...field} />
                        </FormControl>
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
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Received / Change */}
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='receivedAmount'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Received</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={0}
                        step={0.01}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className={shortfall > 0 ? 'border-destructive' : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='space-y-2'>
                <Label className='text-sm font-medium'>Change</Label>
                <div
                  className={`flex h-10 items-center rounded-md border px-3 text-sm font-semibold ${
                    change > 0
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {formatCurrency(change)}
                </div>
              </div>
            </div>

            <DialogFooter className='pt-2'>
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
                {isProcessing && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Process Payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
