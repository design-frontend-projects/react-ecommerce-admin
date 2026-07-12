import { useEffect, useState } from 'react'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, Tag, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useResposStore } from '@/stores/respos-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
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
import { PromoUsageError, useUpdateOrderStatus } from '../api/mutations'
import { usePaymentMethods, useValidatePromoCode } from '../api/queries'
import { useTaxSync } from '../hooks/use-tax-sync'
import { formatCurrency } from '../lib/formatters'
import type { PromoCartLine } from '../lib/promo-engine'
import { computeOrderTotals } from '../lib/totals'
import type { OrderChannel, ResOrderWithDetails } from '../types'

interface CheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: ResOrderWithDetails | null
  onSuccess?: () => void
}

const checkoutSchema = z
  .object({
    paymentMethodId: z.string().min(1, 'respos.checkout.errors.paymentMethodRequired'),
    customerName: z.string().optional(),
    mobileNumber: z.string().optional(),
    discountType: z.enum(['percent', 'amount']),
    discountValue: z.number().min(0),
    promoCode: z.string().optional(),
    receivedAmount: z.number().min(0, 'respos.checkout.errors.receivedAmountRequired'),
    keepTip: z.boolean(),
    tipAmount: z.number().min(0).optional(),
    recipientName: z.string().optional(),
    recipientPhone: z.string().optional(),
    deliveryAddress: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    deliveryNotes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.discountType === 'percent') {
        return data.discountValue <= 100
      }
      return true
    },
    {
      message: 'respos.checkout.errors.percentageExceeds',
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
  const { t } = useTranslation()
  const { cart } = useResposStore()
  const taxConfig = useResposStore((state) => state.taxConfig)
  useTaxSync()
  const { data: paymentMethods, isLoading: methodsLoading } =
    usePaymentMethods()
  const { mutate: updateOrder, isPending: isProcessing } =
    useUpdateOrderStatus()

  // Promo state — the order row (persisted at placement) is the source of
  // truth; the input only applies a NEW promo when the order has none.
  const [promoInput, setPromoInput] = useState('')
  const [appliedPromoCode, setAppliedPromoCode] = useState<string>('')
  // Set when the cashier removes the order's persisted promo (or the RPC
  // rejects it at payment time) — submits applied_promotion_id: null.
  const [promoRemoved, setPromoRemoved] = useState(false)
  const subtotal = order?.subtotal ?? 0
  const orderHasPromo = !!order?.applied_promotion_id && !promoRemoved

  const orderChannel: OrderChannel =
    order?.order_type ?? (order?.table_id ? 'dine_in' : 'delivery')

  const promoLines: PromoCartLine[] =
    order?.items?.map((orderItem) => ({
      itemId: orderItem.item_id,
      categoryId: orderItem.item?.category_id ?? null,
      quantity: orderItem.quantity,
      unitPrice: orderItem.unit_price,
      lineTotal: orderItem.unit_price * orderItem.quantity,
    })) ?? []

  const {
    data: promoResult,
    isLoading: isValidatingPromo,
    isFetching: isFetchingPromo,
  } = useValidatePromoCode(promoInput, {
    lines: promoLines,
    subtotal,
    orderType: orderChannel,
    customerMobile: cart.customerMobile || order?.mobile_number || undefined,
  })

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
      keepTip: false,
      tipAmount: 0,
      recipientName: '',
      recipientPhone: '',
      deliveryAddress: '',
      city: '',
      state: '',
      postalCode: '',
      deliveryNotes: '',
    },
  })

  // Shipment details are only required for actual delivery orders — takeaway
  // is tableless but needs none. Older rows without order_type fall back to
  // the table heuristic.
  const isDeliveryOrder = orderChannel === 'delivery'

  // Reset when dialog opens
  useEffect(() => {
    if (order && open) {
      // Find payment method ID if name matches
      const methodId =
        paymentMethods?.find((m) => m.name === cart.paymentMethod)?.id || ''

      form.reset({
        paymentMethodId: methodId,
        customerName: order.customer_name ?? '',
        mobileNumber: cart.customerMobile || order.mobile_number || '',
        discountType:
          cart.manualDiscountType === 'percentage' ? 'percent' : 'amount',
        discountValue: cart.manualDiscountAmount || 0,
        promoCode: cart.promoCode || '',
        receivedAmount: cart.receivedAmount || 0,
        keepTip: false,
        tipAmount: 0,
        recipientName: order.shipment?.recipient_name ?? '',
        recipientPhone: order.shipment?.recipient_phone ?? '',
        deliveryAddress: order.shipment?.delivery_address ?? '',
        city: order.shipment?.city ?? '',
        state: order.shipment?.state ?? '',
        postalCode: order.shipment?.postal_code ?? '',
        deliveryNotes: order.shipment?.notes ?? '',
      })
      setPromoInput('')
      setAppliedPromoCode('')
      setPromoRemoved(false)
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

  // Promo discount: either persisted on the order at placement, or from a
  // promo newly applied in this dialog.
  const newlyAppliedPromotion =
    appliedPromoCode && promoResult?.valid ? promoResult.promotion : undefined
  const promoDiscount = newlyAppliedPromotion
    ? (promoResult?.discountAmount ?? 0)
    : orderHasPromo
      ? (order?.promo_discount_amount ?? 0)
      : 0

  // Totals via the shared formula (tax recomputed after discounts, honoring
  // inclusive/exclusive configuration) so checkout, cart panel, and invoice
  // can never disagree.
  const totals = computeOrderTotals({
    subtotal,
    manualDiscount,
    promoDiscount,
    taxConfig,
  })
  const taxAmount = totals.taxAmount
  const grandTotal = totals.total

  // Change / tip
  const change = Math.max(0, (receivedAmount || 0) - grandTotal)
  const shortfall =
    receivedAmount > 0 && receivedAmount < grandTotal
      ? grandTotal - receivedAmount
      : 0

  // Enforce 10% max for manual discount amounts
  useEffect(() => {
    if (discountType === 'amount' && subtotal > 0) {
      const maxDiscount = subtotal * 0.1
      if (discountValue > maxDiscount) {
        form.setError('discountValue', {
          type: 'manual',
          message: t('respos.checkout.errors.maxDiscount', {
            amount: formatCurrency(maxDiscount),
          }),
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
      toast.success(t('respos.promo.applied'), {
        description: t('respos.promo.appliedDesc', {
          code: promoInput.toUpperCase().trim(),
        }),
      })
    } else {
      toast.error(
        promoResult.error
          ? t(promoResult.error.key, {
              ...promoResult.error.params,
              defaultValue: promoResult.error.key,
            })
          : t('respos.promo.error.invalid')
      )
    }
  }

  function handleRemovePromo() {
    setPromoInput('')
    setAppliedPromoCode('')
    if (order?.applied_promotion_id) setPromoRemoved(true)
  }

  const onSubmit = (values: CheckoutFormValues) => {
    if (!order) return

    if (isDeliveryOrder) {
      if (!values.recipientName?.trim()) {
        form.setError('recipientName', {
          type: 'manual',
          message: t('respos.checkout.errors.recipientNameRequired'),
        })
        return
      }
      if (!values.recipientPhone?.trim()) {
        form.setError('recipientPhone', {
          type: 'manual',
          message: t('respos.checkout.errors.recipientPhoneRequired'),
        })
        return
      }
      if (!values.deliveryAddress?.trim()) {
        form.setError('deliveryAddress', {
          type: 'manual',
          message: t('respos.checkout.errors.deliveryAddressRequired'),
        })
        return
      }
    }

    // Block if received amount is less than grand total
    if (values.receivedAmount < grandTotal && !isCard) {
      form.setError('receivedAmount', {
        type: 'manual',
        message: t('respos.checkout.errors.amountAtLeast', {
          amount: formatCurrency(grandTotal),
        }),
      })
      return
    }

    if (values.keepTip) {
      if (!values.tipAmount || values.tipAmount <= 0) {
        form.setError('tipAmount', {
          type: 'manual',
          message: t('respos.checkout.errors.tipAmountMin'),
        })
        return
      }
      if (values.tipAmount > change) {
        form.setError('tipAmount', {
          type: 'manual',
          message: t('respos.checkout.errors.tipAmountMax', { amount: formatCurrency(change) }),
        })
        return
      }
    }

    const finalTipAmount = values.keepTip ? (values.tipAmount || 0) : 0
    const finalChangeAmount = Math.max(0, change - finalTipAmount)

    updateOrder(
      {
        orderId: order.id,
        status: 'paid',
        paymentMethod: values.paymentMethodId,
        customerName: values.customerName,
        mobileNumber: values.mobileNumber,
        isDelivery: isDeliveryOrder,
        shipment: isDeliveryOrder
          ? {
              recipientName: values.recipientName?.trim() || '',
              recipientPhone: values.recipientPhone?.trim() || '',
              deliveryAddress: values.deliveryAddress?.trim() || '',
              city: values.city?.trim() || '',
              state: values.state?.trim() || '',
              postalCode: values.postalCode?.trim() || '',
              notes: values.deliveryNotes?.trim() || '',
            }
          : undefined,
        discountType: values.discountType,
        discountAmount: manualDiscount,
        appliedPromotionId:
          newlyAppliedPromotion?.promotion_id ??
          (promoRemoved ? null : order.applied_promotion_id),
        promoDiscountAmount: promoDiscount,
        receivedAmount: values.receivedAmount,
        changeAmount: finalChangeAmount,
        tipAmount: finalTipAmount,
      },
      {
        // Promo usage is recorded atomically inside the mutation, before the
        // order flips to paid — no separate recording step here.
        onSuccess: () => {
          toast.success(t('respos.checkout.paymentSuccess'))
          onOpenChange(false)
          form.reset()
          setPromoInput('')
          setAppliedPromoCode('')
          onSuccess?.()
        },
        onError: (error) => {
          if (error instanceof PromoUsageError) {
            // Limit exhausted between apply and pay — drop the promo so the
            // cashier sees corrected totals and can retry.
            setPromoInput('')
            setAppliedPromoCode('')
            setPromoRemoved(true)
            toast.error(
              t(error.promoErrorKey, { defaultValue: error.promoErrorKey })
            )
            return
          }
          toast.error(t('respos.checkout.paymentFailed'))
        },
      }
    )
  }

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[640px]'>
        <DialogHeader>
          <DialogTitle>
            {t('respos.checkout.title')} — {t('respos.checkout.orderNumber', { orderNumber: order.order_number })}
          </DialogTitle>
          <DialogDescription>
            {order.table
              ? t('respos.checkout.tableNumber', { number: order.table.table_number })
              : t('respos.checkout.takeaway')}{' '}
            • {order.items?.length || 0} {t('respos.checkout.items')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-5 py-2'
          >
            {/* Customer Info */}
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='customerName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('respos.checkout.customerName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('respos.checkout.optional')} {...field} />
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
                    <FormLabel>{t('respos.checkout.mobileNumber')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('respos.checkout.optional')} type='tel' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isDeliveryOrder && (
              <>
                <Separator />
                <div className='space-y-4'>
                  <h4 className='text-sm font-semibold'>{t('respos.checkout.deliveryDetails')}</h4>
                  <div className='grid grid-cols-2 gap-4'>
                    <FormField
                      control={form.control}
                      name='recipientName'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('respos.checkout.recipientName')} *</FormLabel>
                          <FormControl>
                            <Input placeholder={t('respos.checkout.fullName')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='recipientPhone'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('respos.checkout.recipientPhone')} *</FormLabel>
                          <FormControl>
                            <Input placeholder={t('respos.checkout.phoneNumber')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='deliveryAddress'
                      render={({ field }) => (
                        <FormItem className='col-span-2'>
                          <FormLabel>{t('respos.checkout.deliveryAddress')} *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('respos.checkout.deliveryAddressPlaceholder')}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='city'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('respos.checkout.city')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('respos.checkout.city')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='state'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('respos.checkout.state')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('respos.checkout.state')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='postalCode'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('respos.checkout.postalCode')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('respos.checkout.postalCode')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='deliveryNotes'
                      render={({ field }) => (
                        <FormItem className='col-span-2'>
                          <FormLabel>{t('respos.checkout.deliveryNotes')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('respos.checkout.deliveryNotesPlaceholder')}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Discount Section */}
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='discountType'
                render={({ field }) => (
                  <FormItem className='space-y-3'>
                    <FormLabel>{t('respos.checkout.manualDiscount')}</FormLabel>
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
                          <FormLabel className='font-normal'>{t('respos.checkout.amount')}</FormLabel>
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
                      {t('respos.checkout.discountValue')}{discountType === 'percent' ? ' (%)' : ''}
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
              <Label className='text-sm font-medium'>
                {t('respos.promo.title')}
              </Label>
              {appliedPromoCode || orderHasPromo ? (
                <div className='flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-2 dark:border-green-800 dark:bg-green-950'>
                  <CheckCircle2 className='h-4 w-4 text-green-600' />
                  <span className='flex-1 text-sm font-medium text-green-700 dark:text-green-400'>
                    {appliedPromoCode || t('respos.promo.appliedOnOrder')}
                    <Badge variant='secondary' className='ml-2 text-xs'>
                      -{formatCurrency(promoDiscount)}
                    </Badge>
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
                    placeholder={t('respos.promo.placeholder')}
                    value={promoInput}
                    onChange={(e) =>
                      setPromoInput(e.target.value.toUpperCase())
                    }
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
                    disabled={
                      !promoInput.trim() || isValidatingPromo || isFetchingPromo
                    }
                    className='shrink-0'
                  >
                    {isValidatingPromo || isFetchingPromo ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <Tag className='h-4 w-4' />
                    )}
                    <span className='ml-2'>{t('respos.promo.apply')}</span>
                  </Button>
                </div>
              )}
              {promoInput &&
                !appliedPromoCode &&
                promoResult &&
                !promoResult.valid && (
                  <p className='text-xs text-destructive'>
                    {promoResult.error
                      ? t(promoResult.error.key, {
                          ...promoResult.error.params,
                          defaultValue: promoResult.error.key,
                        })
                      : t('respos.promo.error.invalid')}
                  </p>
                )}
            </div>

            <Separator />

            {/* Order Summary */}
            <div className='space-y-2 rounded-lg bg-slate-50 p-4 dark:bg-slate-900'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>
                  {t('respos.checkout.subtotal')}
                </span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {manualDiscount > 0 && (
                <div className='flex justify-between text-sm text-green-600'>
                  <span>{t('respos.checkout.discount')}</span>
                  <span>- {formatCurrency(manualDiscount)}</span>
                </div>
              )}
              {promoDiscount > 0 && (
                <div className='flex justify-between text-sm text-green-600'>
                  <span>
                    {t('respos.checkout.promoDiscount')}
                    {appliedPromoCode ? ` (${appliedPromoCode})` : ''}
                  </span>
                  <span>- {formatCurrency(promoDiscount)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className='flex justify-between text-sm text-muted-foreground'>
                  <span>
                    {taxConfig.isInclusive
                      ? t('respos.checkout.taxIncluded')
                      : t('respos.checkout.tax')}
                  </span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <Separator className='my-2' />
              <div className='flex justify-between text-lg font-bold'>
                <span>{t('respos.checkout.total')}</span>
                <span className='text-orange-600'>
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              {receivedAmount > 0 && change > 0 && (
                <div className='flex justify-between text-sm font-semibold text-emerald-600'>
                  <span>{t('respos.checkout.change')}</span>
                  <span>{formatCurrency(change)}</span>
                </div>
              )}
              {shortfall > 0 && (
                <div className='flex justify-between text-sm font-semibold text-destructive'>
                  <span>{t('respos.checkout.shortfall')}</span>
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
                  <FormLabel>{t('respos.checkout.paymentMethod')}</FormLabel>
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
                              className='flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 text-sm peer-data-[state=checked]:border-primary hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary'
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

            {/* Received / Change */}
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='receivedAmount'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('respos.checkout.amountReceived')}</FormLabel>
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
                <Label className='text-sm font-medium'>{t('respos.checkout.change')}</Label>
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

            {change > 0 && (
              <div className='space-y-4 rounded-lg border bg-slate-50 p-4 dark:bg-slate-900'>
                <FormField
                  control={form.control}
                  name='keepTip'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border bg-white p-3 shadow-sm dark:bg-slate-950'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-base font-semibold'>
                          {t('respos.checkout.keepTip')}
                        </FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch('keepTip') && (
                  <FormField
                    control={form.control}
                    name='tipAmount'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('respos.checkout.tipAmount')}</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min={0.01}
                            max={change}
                            step={0.01}
                            {...field}
                            value={field.value === 0 ? '' : field.value}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isProcessing}
              >
                {t('respos.checkout.cancel')}
              </Button>
              <Button
                type='submit'
                disabled={isProcessing}
                className='bg-orange-600 hover:bg-orange-700'
              >
                {isProcessing && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                {t('respos.checkout.processPayment')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
