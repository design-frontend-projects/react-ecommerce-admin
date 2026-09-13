import { useCallback, useMemo } from 'react'
import { type Resolver, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useProducts } from '@/features/products/hooks/use-products'
import {
  useCurrencyOptions,
  useVariantOptions,
} from '@/hooks/use-inventory-lookups'
import {
  createFinancialTransactionFormSchema,
  type CreateFinancialTransactionFormValues,
} from '../data/schema'
import { useCreateFinancialTransaction } from '../hooks/use-financial-transactions'
import { useTransactionsContext } from './transactions-provider'

export function CreateTransactionDialog() {
  const { isCreateOpen, setIsCreateOpen } = useTransactionsContext()

  const { data: currencies = [] } = useCurrencyOptions()
  const { data: variants = [] } = useVariantOptions()
  const { data: products = [], isLoading: isLoadingProducts } = useProducts()
  const createMutation = useCreateFinancialTransaction()

  const form = useForm<CreateFinancialTransactionFormValues>({
    resolver: zodResolver(
      createFinancialTransactionFormSchema
    ) as Resolver<CreateFinancialTransactionFormValues>,
    defaultValues: {
      transaction_type: 'sale',
      currency: 'USD',
      status: 'completed',
      notes: '',
      items: [],
      subtotal: 0,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 0,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const watchedItems = form.watch('items')
  const watchedCurrency = form.watch('currency')
  const watchedDirectTotal = form.watch('total_amount')

  // Calculate live totals whenever items change
  const { calculatedSubtotal, calculatedTax, calculatedDiscount, grandTotal } =
    watchedItems.reduce(
      (acc, item) => {
        const qty = Number(item.quantity) || 0
        const price = Number(item.unit_price) || 0
        const disc = Number(item.discount_amount) || 0
        const tax = Number(item.tax_amount) || 0
        const sub = qty * price - disc + tax

        acc.calculatedSubtotal += qty * price
        acc.calculatedDiscount += disc
        acc.calculatedTax += tax
        acc.grandTotal += sub
        return acc
      },
      {
        calculatedSubtotal: 0,
        calculatedTax: 0,
        calculatedDiscount: 0,
        grandTotal: 0,
      }
    )

  const isItemized = watchedItems.length > 0

  const sortedProducts = useMemo(() => {
    return [...products]
      .filter((p): p is typeof p & { id: string } => Boolean(p.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [products])

  const getVariantsForProduct = useCallback(
    (productId?: string | null) => {
      if (!productId) return []

      const targetProduct = products.find((p) => p.id === productId)
      const list: Array<{
        id: string
        sku: string
        name: string
        price: number
        cost_price: number | null
      }> = []
      const seenIds = new Set<string>()

      // 1. From nested product_variants inside targetProduct
      if (
        targetProduct?.product_variants &&
        Array.isArray(targetProduct.product_variants)
      ) {
        for (const pv of targetProduct.product_variants) {
          if (pv.id && !seenIds.has(pv.id)) {
            seenIds.add(pv.id)
            const pli = pv.price_list_items?.[0]
            const price = Number(
              pli?.price ??
                (targetProduct as any)?.price_list_items?.[0]?.price ??
                0
            )
            const costPrice =
              pli?.cost_price != null ? Number(pli.cost_price) : null
            list.push({
              id: pv.id,
              sku: pv.sku || targetProduct.sku || '',
              name: pv.name || pv.attributes_label || pv.sku || 'Standard',
              price,
              cost_price: costPrice,
            })
          }
        }
      }

      // 2. From useVariantOptions lookup
      for (const v of variants) {
        const parentId = v.products?.id || (v.products as any)?.product_id
        if (parentId === productId && v.id && !seenIds.has(v.id)) {
          seenIds.add(v.id)
          list.push({
            id: v.id,
            sku: v.sku,
            name: v.sku || 'Standard',
            price: Number(v.price || 0),
            cost_price: v.cost_price != null ? Number(v.cost_price) : null,
          })
        }
      }

      return list
    },
    [products, variants]
  )

  const handleProductChange = (index: number, productId: string) => {
    const selectedProd = products.find((p) => p.id === productId)
    const prodVariants = getVariantsForProduct(productId)
    const isPurchase = form.getValues('transaction_type') === 'purchase'

    if (prodVariants.length === 1) {
      const singleVar = prodVariants[0]
      form.setValue(`items.${index}.variant_id`, singleVar.id)
      const price = isPurchase
        ? (singleVar.cost_price ?? singleVar.price)
        : singleVar.price
      form.setValue(`items.${index}.unit_price`, Number(price || 0))
    } else if (prodVariants.length > 1) {
      form.setValue(`items.${index}.variant_id`, '')
      form.setValue(`items.${index}.unit_price`, 0)
    } else {
      // Product has no separate variants (single base product)
      form.setValue(`items.${index}.variant_id`, productId)
      const basePrice = Number(
        (selectedProd as any)?.price_list_items?.[0]?.price || 0
      )
      form.setValue(`items.${index}.unit_price`, basePrice)
    }
  }

  const handleVariantChange = (
    index: number,
    variantId: string,
    prodVariants: Array<{ id: string; price: number; cost_price: number | null }>
  ) => {
    const selectedVar = prodVariants.find((v) => v.id === variantId)
    const isPurchase = form.getValues('transaction_type') === 'purchase'
    if (selectedVar) {
      const price = isPurchase
        ? (selectedVar.cost_price ?? selectedVar.price)
        : selectedVar.price
      form.setValue(`items.${index}.unit_price`, Number(price || 0))
    }
  }

  const onSubmit = (values: CreateFinancialTransactionFormValues) => {
    const payload: CreateFinancialTransactionFormValues = {
      ...values,
      subtotal: isItemized ? calculatedSubtotal : values.subtotal || 0,
      tax_amount: isItemized ? calculatedTax : values.tax_amount || 0,
      discount_amount: isItemized
        ? calculatedDiscount
        : values.discount_amount || 0,
      total_amount: isItemized ? grandTotal : values.total_amount || 0,
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        form.reset()
        setIsCreateOpen(false)
      },
    })
  }

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: watchedCurrency || 'USD',
        maximumFractionDigits: 2,
      }).format(amount)
    } catch {
      return `${watchedCurrency} ${amount.toFixed(2)}`
    }
  }

  return (
    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
      <DialogContent className='max-h-[92vh] overflow-y-auto sm:max-w-3xl p-6'>
        <DialogHeader className='border-b pb-3 space-y-1'>
          <DialogTitle className='text-lg font-bold'>
            New Financial Transaction
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground'>
            Record a financial sale, purchase, expense, income, or payment.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 py-2'>
            {/* Header parameters grid */}
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
              {/* Transaction Type */}
              <FormField
                control={form.control}
                name='transaction_type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs'>Transaction Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className='h-9 text-xs'>
                          <SelectValue placeholder='Select type' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='sale'>Sale (Revenue)</SelectItem>
                        <SelectItem value='purchase'>Purchase (Inventory)</SelectItem>
                        <SelectItem value='payment_in'>Payment In (Receipt)</SelectItem>
                        <SelectItem value='payment_out'>Payment Out (Payout)</SelectItem>
                        <SelectItem value='expense'>Operational Expense</SelectItem>
                        <SelectItem value='income'>Other Income</SelectItem>
                        <SelectItem value='opening_balance'>Opening Balance</SelectItem>
                        <SelectItem value='adjustment'>Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className='text-[11px]' />
                  </FormItem>
                )}
              />

              {/* Currency */}
              <FormField
                control={form.control}
                name='currency'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs'>Currency</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className='h-9 text-xs font-mono'>
                          <SelectValue placeholder='Select currency' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.id || c.code} value={c.code}>
                            {c.code} ({c.symbol}) - {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className='text-[11px]' />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name='status'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs'>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className='h-9 text-xs'>
                          <SelectValue placeholder='Select status' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='completed'>Completed (Settled)</SelectItem>
                        <SelectItem value='pending'>Pending (Draft)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className='text-[11px]' />
                  </FormItem>
                )}
              />
            </div>

            {/* Direct Total Amount (only shown when no line items are added) */}
            {!isItemized && (
              <div className='rounded-xl border bg-muted/20 p-3 space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-semibold text-foreground'>
                    Direct Total Amount
                  </span>
                  <span className='text-[11px] text-muted-foreground'>
                    For non-inventory transactions (e.g. utilities, rent)
                  </span>
                </div>
                <FormField
                  control={form.control}
                  name='total_amount'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type='number'
                          step='0.01'
                          placeholder='0.00'
                          className='h-9 text-xs font-medium'
                          value={field.value || ''}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage className='text-[11px]' />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Line Items Section */}
            <div className='space-y-2.5 pt-1'>
              <div className='flex items-center justify-between'>
                <div>
                  <h4 className='text-xs font-semibold text-foreground'>
                    Line Items ({fields.length})
                  </h4>
                  <p className='text-[11px] text-muted-foreground'>
                    Add products or services to automatically calculate ledger totals.
                  </p>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-8 text-xs'
                  onClick={() =>
                    append({
                      product_id: '',
                      variant_id: '',
                      quantity: 1,
                      unit_price: 0,
                      discount_amount: 0,
                      tax_amount: 0,
                    })
                  }
                >
                  <Plus className='mr-1 h-3.5 w-3.5' />
                  Add Line Item
                </Button>
              </div>

              {fields.length > 0 && (
                <div className='space-y-3 max-h-[42vh] overflow-y-auto pr-1'>
                  {fields.map((field, index) => {
                    const currentProductId = form.watch(`items.${index}.product_id`)
                    const availableVariants = getVariantsForProduct(currentProductId)
                    const selectedProd = products.find((p) => p.id === currentProductId)
                    const hasProduct = Boolean(currentProductId)
                    const isPurchase = form.watch('transaction_type') === 'purchase'

                    return (
                      <div
                        key={field.id}
                        className='rounded-xl border bg-card/70 p-3 space-y-2.5 transition-colors hover:border-primary/40 shadow-xs'
                      >
                        {/* Row 1: Separate Product & Variant Dropdowns */}
                        <div className='grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start'>
                          {/* Product Selector Dropdown */}
                          <div className='sm:col-span-6'>
                            <FormField
                              control={form.control}
                              name={`items.${index}.product_id`}
                              render={({ field: pField }) => (
                                <FormItem className='space-y-1'>
                                  <FormLabel className='text-[11px] font-medium flex items-center justify-between'>
                                    <span>Product *</span>
                                    {selectedProd?.sku && (
                                      <span className='text-[10px] text-muted-foreground font-mono'>
                                        SKU: {selectedProd.sku}
                                      </span>
                                    )}
                                  </FormLabel>
                                  <Select
                                    value={pField.value || ''}
                                    onValueChange={(val) => {
                                      pField.onChange(val)
                                      handleProductChange(index, val)
                                    }}
                                  >
                                    <FormControl>
                                      <SelectTrigger className='h-8 text-xs'>
                                        <SelectValue
                                          placeholder={
                                            isLoadingProducts
                                              ? 'Loading products...'
                                              : 'Select product...'
                                          }
                                        />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className='max-h-60'>
                                      {sortedProducts.map((p) => (
                                        <SelectItem
                                          key={p.id}
                                          value={p.id}
                                          className='text-xs'
                                        >
                                          <div className='flex items-center justify-between gap-2 w-full'>
                                            <span className='font-medium truncate'>
                                              {p.name}
                                            </span>
                                            {p.sku && (
                                              <span className='text-[10px] text-muted-foreground font-mono shrink-0'>
                                                {p.sku}
                                              </span>
                                            )}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage className='text-[10px]' />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Variant Selector Dropdown */}
                          <div className='sm:col-span-6'>
                            <FormField
                              control={form.control}
                              name={`items.${index}.variant_id`}
                              render={({ field: vField }) => (
                                <FormItem className='space-y-1'>
                                  <FormLabel className='text-[11px] font-medium flex items-center justify-between'>
                                    <span>Variant / SKU *</span>
                                    {availableVariants.length > 0 && (
                                      <span className='text-[10px] text-muted-foreground'>
                                        {availableVariants.length} option
                                        {availableVariants.length > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </FormLabel>
                                  <Select
                                    value={vField.value || ''}
                                    onValueChange={(val) => {
                                      vField.onChange(val)
                                      handleVariantChange(
                                        index,
                                        val,
                                        availableVariants
                                      )
                                    }}
                                    disabled={!hasProduct}
                                  >
                                    <FormControl>
                                      <SelectTrigger
                                        className={cn(
                                          'h-8 text-xs',
                                          !hasProduct &&
                                            'bg-muted/40 opacity-75 cursor-not-allowed'
                                        )}
                                      >
                                        <SelectValue
                                          placeholder={
                                            !hasProduct
                                              ? 'Select product first'
                                              : availableVariants.length === 0
                                                ? 'Standard (No variants)'
                                                : 'Select variant...'
                                          }
                                        />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className='max-h-60'>
                                      {availableVariants.length === 0 ? (
                                        <SelectItem
                                          value={currentProductId || 'standard'}
                                          className='text-xs'
                                        >
                                          Standard (Default)
                                        </SelectItem>
                                      ) : (
                                        availableVariants.map((v) => (
                                          <SelectItem
                                            key={v.id}
                                            value={v.id}
                                            className='text-xs'
                                          >
                                            <div className='flex items-center justify-between gap-3 w-full'>
                                              <span className='font-medium truncate'>
                                                {v.name || v.sku}
                                              </span>
                                              <span className='text-[10px] text-muted-foreground font-mono shrink-0'>
                                                {formatCurrency(
                                                  isPurchase
                                                    ? (v.cost_price ?? v.price)
                                                    : v.price
                                                )}
                                              </span>
                                            </div>
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage className='text-[10px]' />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Row 2: Quantities & Financial Amounts */}
                        <div className='grid grid-cols-12 gap-2 items-end pt-1 border-t border-border/40'>
                          {/* Qty */}
                          <div className='col-span-4 sm:col-span-2'>
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field: qField }) => (
                                <FormItem className='space-y-1'>
                                  <FormLabel className='text-[11px]'>Qty</FormLabel>
                                  <FormControl>
                                    <Input
                                      type='number'
                                      step='1'
                                      min='0.01'
                                      className='h-8 text-xs'
                                      value={qField.value}
                                      onChange={(e) =>
                                        qField.onChange(
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage className='text-[10px]' />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Unit Price */}
                          <div className='col-span-4 sm:col-span-3'>
                            <FormField
                              control={form.control}
                              name={`items.${index}.unit_price`}
                              render={({ field: prField }) => (
                                <FormItem className='space-y-1'>
                                  <FormLabel className='text-[11px]'>Price</FormLabel>
                                  <FormControl>
                                    <Input
                                      type='number'
                                      step='0.01'
                                      className='h-8 text-xs'
                                      value={prField.value}
                                      onChange={(e) =>
                                        prField.onChange(
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage className='text-[10px]' />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Tax */}
                          <div className='col-span-4 sm:col-span-2'>
                            <FormField
                              control={form.control}
                              name={`items.${index}.tax_amount`}
                              render={({ field: tField }) => (
                                <FormItem className='space-y-1'>
                                  <FormLabel className='text-[11px]'>Tax (+)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type='number'
                                      step='0.01'
                                      className='h-8 text-xs'
                                      value={tField.value || 0}
                                      onChange={(e) =>
                                        tField.onChange(
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage className='text-[10px]' />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Discount */}
                          <div className='col-span-4 sm:col-span-2'>
                            <FormField
                              control={form.control}
                              name={`items.${index}.discount_amount`}
                              render={({ field: dField }) => (
                                <FormItem className='space-y-1'>
                                  <FormLabel className='text-[11px]'>Disc (-)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type='number'
                                      step='0.01'
                                      className='h-8 text-xs'
                                      value={dField.value || 0}
                                      onChange={(e) =>
                                        dField.onChange(
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage className='text-[10px]' />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Line Subtotal Preview */}
                          <div className='col-span-6 sm:col-span-2 pb-1'>
                            <div className='text-[10px] text-muted-foreground'>Line Total</div>
                            <div className='text-xs font-semibold text-foreground truncate'>
                              {formatCurrency(
                                (Number(form.watch(`items.${index}.quantity`)) || 0) *
                                  (Number(form.watch(`items.${index}.unit_price`)) || 0) -
                                  (Number(form.watch(`items.${index}.discount_amount`)) || 0) +
                                  (Number(form.watch(`items.${index}.tax_amount`)) || 0)
                              )}
                            </div>
                          </div>

                          {/* Delete Action */}
                          <div className='col-span-2 sm:col-span-1 flex justify-end pb-0.5'>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                              onClick={() => remove(index)}
                            >
                              <Trash2 className='h-3.5 w-3.5' />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Live Financial Totals Banner */}
            <div className='rounded-xl border bg-card/80 p-3.5 space-y-2 shadow-xs'>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>Subtotal:</span>
                <span className='font-medium'>
                  {formatCurrency(isItemized ? calculatedSubtotal : form.watch('subtotal') || 0)}
                </span>
              </div>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>Tax:</span>
                <span className='font-medium'>
                  +{formatCurrency(isItemized ? calculatedTax : form.watch('tax_amount') || 0)}
                </span>
              </div>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>Discount:</span>
                <span className='font-medium text-rose-600 dark:text-rose-400'>
                  -{formatCurrency(isItemized ? calculatedDiscount : form.watch('discount_amount') || 0)}
                </span>
              </div>
              <div className='border-t pt-2 flex items-center justify-between font-bold text-sm'>
                <span className='text-foreground'>Total Amount:</span>
                <span className='text-primary text-base'>
                  {formatCurrency(isItemized ? grandTotal : watchedDirectTotal || 0)}
                </span>
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name='notes'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs'>Notes & Memo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Optional internal ledger remarks or payment reference...'
                      className='h-16 text-xs resize-none'
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage className='text-[11px]' />
                </FormItem>
              )}
            />

            <DialogFooter className='border-t pt-3 flex items-center justify-end space-x-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-8 text-xs'
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                size='sm'
                className='h-8 text-xs'
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                )}
                Save Transaction
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
