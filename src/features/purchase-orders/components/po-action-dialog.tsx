import { useCallback, useMemo, useState } from 'react'
import { z } from 'zod'
import { format } from 'date-fns'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Plus,
  Trash2,
  Check,
  ChevronsUpDown,
  FileText,
  Warehouse,
  Building2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { useProducts } from '@/features/products/hooks/use-products'
import { useUomOptions } from '@/features/products/hooks/use-product-options'
import { useSuppliers } from '@/features/suppliers/hooks/use-suppliers'
import { useWarehouses } from '@/features/warehouses/hooks/use-warehouses'
import {
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  usePurchaseOrder,
  type PurchaseOrderItemInput,
} from '../hooks/use-purchase-orders'
import { usePOContext } from './po-provider'
import {
  POProductSelect,
  POVariantSelect,
  type VariantOption,
} from './po-product-variant-picker'
import {
  POSummaryDialog,
  type POSummaryDraftData,
} from './po-summary-dialog'
import {
  POCurrencySelect,
  type SelectedCurrencyInfo,
} from './po-currency-select'
import { useCurrencies } from '@/features/currencies/hooks/use-currencies'

// ─── Schema ───────────────────────────────────────────────
const poFormSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier is required'),
  warehouse_id: z.string().optional(),
  currency_id: z.string().optional(),
  currency: z.string().default('USD'),
  order_date: z.string().min(1, 'Order date is required'),
  expected_delivery_date: z.string().optional(),
  tax_amount: z.coerce.number().min(0).default(0),
  shipping_amount: z.coerce.number().min(0).default(0),
  discount_amount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
})

type POFormValues = z.infer<typeof poFormSchema>

// ─── Line item type ───────────────────────────────────────
interface LineItem {
  product_id: string
  product_variant_id: string | null
  uom_id: string | null
  quantity_ordered: number
  unit_cost: number
  subtotal: number
}

export function POActionDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = usePOContext()
  const isCreate = open === 'create'
  const isEdit = open === 'edit'
  const isOpen = isCreate || isEdit

  const { data: suppliers } = useSuppliers()
  const { data: warehouses = [] } = useWarehouses()
  const { data: products } = useProducts()
  const { data: uoms = [] } = useUomOptions()
  const createMutation = useCreatePurchaseOrder()
  const updateMutation = useUpdatePurchaseOrder()
  const [showLineValidation, setShowLineValidation] = useState(false)
  const [supplierOpen, setSupplierOpen] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)

  // Fetch full PO with items for edit mode
  const currentPoId = currentRow?.id || currentRow?.po_id || ''
  const { data: fullPO } = usePurchaseOrder(
    isEdit && currentPoId ? currentPoId : ''
  )

  // Compute form defaults reactively from props/data
  const formDefaults = useMemo<POFormValues>(() => {
    if (isEdit && currentRow) {
      const activePO = fullPO || currentRow
      return {
        supplier_id: String(activePO.supplier_id ?? ''),
        warehouse_id: activePO.warehouse_id || '',
        currency_id: activePO.currency_id || activePO.currencies?.id || '',
        currency: activePO.currency || activePO.currencies?.code || 'USD',
        order_date: activePO.order_date
          ? format(new Date(activePO.order_date), 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd'),
        expected_delivery_date: activePO.expected_delivery_date
          ? format(new Date(activePO.expected_delivery_date), 'yyyy-MM-dd')
          : '',
        tax_amount: Number(activePO.tax_amount ?? activePO.tax_total ?? 0),
        shipping_amount: Number(activePO.shipping_amount ?? 0),
        discount_amount: Number(
          activePO.discount_amount ?? activePO.discount_total ?? 0
        ),
        notes: activePO.notes || '',
      }
    }
    return {
      supplier_id: '',
      warehouse_id: '',
      currency_id: '',
      currency: 'USD',
      order_date: format(new Date(), 'yyyy-MM-dd'),
      expected_delivery_date: '',
      tax_amount: 0,
      shipping_amount: 0,
      discount_amount: 0,
      notes: '',
    }
  }, [isEdit, currentRow, fullPO])

  const form = useForm<POFormValues>({
    resolver: zodResolver(poFormSchema) as never,
    defaultValues: formDefaults,
    values: formDefaults,
  })

  // Watch financials & currency from form
  const { data: currencies = [] } = useCurrencies({ onlyActive: true })
  const watchedTax = form.watch('tax_amount') || 0
  const watchedShipping = form.watch('shipping_amount') || 0
  const watchedDiscount = form.watch('discount_amount') || 0
  const watchedCurrency = form.watch('currency') || 'USD'
  const watchedCurrencyId = form.watch('currency_id') || ''

  const currencySymbol = useMemo(() => {
    if (watchedCurrencyId) {
      const match = currencies.find((c) => c.id === watchedCurrencyId)
      if (match?.symbol) return match.symbol
    }
    const matchByCode = currencies.find(
      (c) => c.code.toLowerCase() === watchedCurrency.toLowerCase()
    )
    return matchByCode?.symbol || '$'
  }, [currencies, watchedCurrencyId, watchedCurrency])

  // Map variants by product id string (UUID)
  const variantsByProductId = useMemo(() => {
    const map = new Map<string, VariantOption[]>()

    for (const product of products ?? []) {
      const pId = String(product.id || product.product_id || '')
      if (!pId) continue

      const variants: VariantOption[] = (product.product_variants ?? [])
        .filter((variant) => !!variant.id)
        .map((variant) => {
          let attrLabel = variant.attributes_label
          if (!attrLabel && variant.dimensions) {
            try {
              const parsed =
                typeof variant.dimensions === 'string'
                  ? JSON.parse(variant.dimensions)
                  : variant.dimensions
              attrLabel = parsed?.label || undefined
            } catch {
              attrLabel =
                typeof variant.dimensions === 'string'
                  ? variant.dimensions
                  : undefined
            }
          }

          const pli = (
            variant as {
              price_list_items?: Array<{
                price: number | string
                cost_price?: number | string | null
              }>
            }
          ).price_list_items
          const resolvedCost =
            pli && pli.length > 0 && pli[0].cost_price != null
              ? Number(pli[0].cost_price)
              : (variant as { cost_price?: number | null }).cost_price != null
                ? Number((variant as { cost_price?: number | null }).cost_price)
                : null
          const resolvedPrice =
            pli && pli.length > 0
              ? Number(pli[0].price)
              : Number((variant as { price?: number }).price ?? 0)

          const balances = (
            variant as {
              stock_balances?: Array<{
                qty_available?: number | string
                qty_on_hand?: number | string
                qty_reserved?: number | string
              }>
            }
          ).stock_balances
          const resolvedStock =
            balances && balances.length > 0
              ? balances.reduce(
                  (sum, b) =>
                    sum +
                    Number(
                      b.qty_available ??
                        Number(b.qty_on_hand || 0) - Number(b.qty_reserved || 0)
                    ),
                  0
                )
              : (variant as { stock_quantity?: number }).stock_quantity !==
                  undefined
                ? Number((variant as { stock_quantity?: number }).stock_quantity)
                : undefined

          return {
            id: String(variant.id),
            sku: variant.sku,
            name: variant.name ?? null,
            attributes_label: attrLabel,
            price: resolvedPrice,
            cost_price: resolvedCost,
            stock_quantity: resolvedStock,
          }
        })

      map.set(pId, variants)
    }

    return map
  }, [products])

  const getVariantsForProduct = useCallback(
    (productId: string): VariantOption[] =>
      variantsByProductId.get(productId) ?? [],
    [variantsByProductId]
  )

  const getProductName = (productId: string): string =>
    products?.find(
      (product) => String(product.id || product.product_id) === productId
    )?.name ?? `Product`

  // Compute initial line items from PO data
  const initialLineItems = useMemo<LineItem[]>(() => {
    if (isEdit && fullPO) {
      return (fullPO.purchase_order_items || []).map((item) => {
        const prodId = String(item.product_id || '')
        const variants = variantsByProductId.get(prodId) ?? []
        return {
          product_id: prodId,
          product_variant_id:
            item.product_variant_id ??
            (variants.length === 1 ? variants[0].id : null),
          uom_id: item.uom_id ?? null,
          quantity_ordered: item.quantity_ordered,
          unit_cost: item.unit_cost,
          subtotal: item.subtotal,
        }
      })
    }
    return []
  }, [isEdit, fullPO, variantsByProductId])

  // User edits tracked separately; null = no user edits yet
  const [lineItemOverrides, setLineItemOverrides] = useState<LineItem[] | null>(
    null
  )

  // Active line items: user-edited values or computed initial values
  const lineItems = lineItemOverrides ?? initialLineItems

  const closeDialog = () => {
    setLineItemOverrides(null)
    setShowLineValidation(false)
    setShowSummaryModal(false)
    setOpen(null)
  }

  // ─── Line item handlers ─────────────────────────────────
  const addLineItem = () => {
    const current = lineItemOverrides ?? initialLineItems
    setLineItemOverrides([
      ...current,
      {
        product_id: '',
        product_variant_id: null,
        uom_id: null,
        quantity_ordered: 1,
        unit_cost: 0,
        subtotal: 0,
      },
    ])
  }

  const removeLineItem = (index: number) => {
    const current = lineItemOverrides ?? initialLineItems
    setLineItemOverrides(current.filter((_, i) => i !== index))
  }

  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: number | string | null
  ) => {
    const current = lineItemOverrides ?? initialLineItems
    const updated = [...current]
    setShowLineValidation(false)

    const item = { ...updated[index] }

    if (field === 'product_id') {
      const nextProductId = String(value || '')
      const variants = getVariantsForProduct(nextProductId)
      const selectedProduct = products?.find(
        (p) => String(p.id || p.product_id) === nextProductId
      )

      item.product_id = nextProductId
      item.product_variant_id = null
      item.uom_id =
        selectedProduct?.base_uom_id ||
        (selectedProduct as { base_uom?: { id?: string } })?.base_uom?.id ||
        null

      if (variants.length === 1) {
        item.product_variant_id = variants[0].id
        item.unit_cost = Number(variants[0].cost_price ?? variants[0].price ?? 0)
      } else {
        item.unit_cost = 0
      }

      item.subtotal = Number(item.quantity_ordered) * Number(item.unit_cost)
      updated[index] = item
      setLineItemOverrides(updated)
      return
    }

    if (field === 'uom_id') {
      item.uom_id = value ? String(value) : null
      updated[index] = item
      setLineItemOverrides(updated)
      return
    }

    if (field === 'product_variant_id') {
      const vId = value ? String(value) : null
      item.product_variant_id = vId
      const variants = getVariantsForProduct(item.product_id)
      const variant = variants.find((v) => v.id === vId)

      if (variant) {
        item.unit_cost = Number(variant.cost_price ?? variant.price ?? 0)
      } else {
        item.unit_cost = 0
      }

      item.subtotal = Number(item.quantity_ordered) * Number(item.unit_cost)
      updated[index] = item
      setLineItemOverrides(updated)
      return
    }

    if (field === 'quantity_ordered') {
      item.quantity_ordered = Math.max(1, Number(value) || 1)
    } else if (field === 'unit_cost') {
      item.unit_cost = Math.max(0, Number(value) || 0)
    }

    item.subtotal = Number(item.quantity_ordered) * Number(item.unit_cost)
    updated[index] = item
    setLineItemOverrides(updated)
  }

  // Financial calculations
  const itemsSubtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0)
  const grandTotal = Math.max(
    0,
    itemsSubtotal +
      Number(watchedTax || 0) +
      Number(watchedShipping || 0) -
      Number(watchedDiscount || 0)
  )

  // ─── Submit ─────────────────────────────────────────────
  const onSubmit: SubmitHandler<POFormValues> = async (values) => {
    const validItems = lineItems.filter((item) => Boolean(item.product_id))
    if (validItems.length === 0) {
      setShowLineValidation(true)
      toast.error(
        t('purchaseOrders.validation.atLeastOneItem', 'Add at least one line item')
      )
      return
    }

    for (const item of validItems) {
      const variants = getVariantsForProduct(item.product_id)

      if (variants.length === 0) {
        setShowLineValidation(true)
        toast.error(
          `${getProductName(item.product_id)} ${t('purchaseOrders.validation.noVariants', 'has no variants. Select a product that has variants.')}`
        )
        return
      }

      if (!item.product_variant_id) {
        setShowLineValidation(true)
        toast.error(
          `${t('purchaseOrders.validation.variantRequired', 'Variant is required for')} ${getProductName(item.product_id)}.`
        )
        return
      }
    }

    const items: PurchaseOrderItemInput[] = validItems.map((item) => ({
      product_id: item.product_id,
      product_variant_id: item.product_variant_id!,
      uom_id: item.uom_id || null,
      quantity_ordered: item.quantity_ordered,
      unit_cost: item.unit_cost,
      subtotal: item.subtotal,
    }))

    try {
      if (isCreate) {
        await createMutation.mutateAsync({
          order: {
            supplier_id: values.supplier_id,
            warehouse_id: values.warehouse_id || null,
            currency_id: values.currency_id || null,
            order_date: values.order_date,
            expected_delivery_date: values.expected_delivery_date || null,
            currency: values.currency || 'USD',
            tax_amount: Number(values.tax_amount || 0),
            shipping_amount: Number(values.shipping_amount || 0),
            discount_amount: Number(values.discount_amount || 0),
            notes: values.notes || undefined,
          },
          items,
        })
        toast.success(
          t('purchaseOrders.messages.created', 'Purchase order created')
        )
      } else if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.id || currentRow.po_id,
          order: {
            supplier_id: values.supplier_id,
            warehouse_id: values.warehouse_id || null,
            currency_id: values.currency_id || null,
            order_date: values.order_date,
            expected_delivery_date: values.expected_delivery_date || null,
            currency: values.currency || 'USD',
            tax_amount: Number(values.tax_amount || 0),
            shipping_amount: Number(values.shipping_amount || 0),
            discount_amount: Number(values.discount_amount || 0),
            notes: values.notes || undefined,
          },
          items,
        })
        toast.success(
          t('purchaseOrders.messages.updated', 'Purchase order updated')
        )
      }
      closeDialog()
    } catch (error: unknown) {
      toast.error(t('common.error', 'Error'), {
        description:
          (error as Error)?.message ||
          t(
            'purchaseOrders.messages.saveFailed',
            'Failed to save purchase order.'
          ),
      })
    }
  }

  const handleOpenReviewSummary = () => {
    const values = form.getValues()
    if (
      !values.supplier_id ||
      values.supplier_id === '0' ||
      values.supplier_id === ''
    ) {
      toast.error(
        t(
          'purchaseOrders.validation.selectSupplierFirst',
          'Please select a supplier first'
        )
      )
      return
    }

    const validItems = lineItems.filter((item) => Boolean(item.product_id))
    if (validItems.length === 0) {
      setShowLineValidation(true)
      toast.error(
        t('purchaseOrders.validation.atLeastOneItem', 'Add at least one line item')
      )
      return
    }

    for (const item of validItems) {
      const variants = getVariantsForProduct(item.product_id)

      if (variants.length === 0) {
        setShowLineValidation(true)
        toast.error(
          `${getProductName(item.product_id)} ${t('purchaseOrders.validation.noVariants', 'has no variants. Select a product that has variants.')}`
        )
        return
      }

      if (!item.product_variant_id) {
        setShowLineValidation(true)
        toast.error(
          `${t('purchaseOrders.validation.variantRequired', 'Variant is required for')} ${getProductName(item.product_id)}.`
        )
        return
      }
    }

    setShowSummaryModal(true)
  }

  const draftSummary = useMemo<POSummaryDraftData | null>(() => {
    const values = form.getValues()
    const selectedSupplier = suppliers?.find(
      (s) => String(s.id || s.supplier_id) === values.supplier_id
    )
    const selectedWarehouse = warehouses?.find(
      (w) => w.id === values.warehouse_id
    )

    const validItems = lineItems.filter((item) => Boolean(item.product_id))

    return {
      supplierId: values.supplier_id,
      supplierName: selectedSupplier?.name || 'Selected Supplier',
      warehouseId: values.warehouse_id,
      warehouseName: selectedWarehouse?.name,
      orderDate: values.order_date,
      expectedDeliveryDate: values.expected_delivery_date || undefined,
      currencyId: values.currency_id,
      currency: values.currency || 'USD',
      currencySymbol: currencySymbol,
      taxAmount: Number(values.tax_amount || 0),
      shippingAmount: Number(values.shipping_amount || 0),
      discountAmount: Number(values.discount_amount || 0),
      subtotal: itemsSubtotal,
      notes: values.notes || undefined,
      items: validItems.map((item) => {
        const prod = products?.find(
          (p) => String(p.id || p.product_id) === item.product_id
        )
        const variants = getVariantsForProduct(item.product_id)
        const variant = variants.find((v) => v.id === item.product_variant_id)
        const selectedUom = uoms.find((u) => u.id === item.uom_id)

        return {
          productId: item.product_id,
          productName: prod?.name || `Product`,
          productSku: prod?.sku,
          variantId: item.product_variant_id,
          variantSku: variant?.sku || 'Standard',
          variantLabel: variant?.attributes_label || variant?.name || undefined,
          uomId: item.uom_id,
          uomName: selectedUom?.name,
          uomCode: selectedUom?.code,
          quantity: item.quantity_ordered,
          unitCost: item.unit_cost,
          subtotal: item.subtotal,
        }
      }),
      totalAmount: grandTotal,
    }
  }, [
    form,
    suppliers,
    warehouses,
    lineItems,
    products,
    getVariantsForProduct,
    uoms,
    itemsSubtotal,
    grandTotal,
    currencySymbol,
  ])

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className='max-h-[92vh] overflow-y-auto sm:max-w-5xl md:max-w-6xl w-full p-4 sm:p-6'>
          <DialogHeader>
            <DialogTitle className='text-lg sm:text-xl font-bold'>
              {isCreate
                ? t('purchaseOrders.dialog.createTitle', 'Create Purchase Order')
                : t('purchaseOrders.dialog.editTitle', 'Edit Purchase Order')}
            </DialogTitle>
            <DialogDescription className='text-xs sm:text-sm'>
              {isCreate
                ? t(
                    'purchaseOrders.dialog.createDesc',
                    'Fill in the order details, destination warehouse, and line items.'
                  )
                : t(
                    'purchaseOrders.dialog.editDesc',
                    'Update the order details, warehouse destination, and line items.'
                  )}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              {/* Header Fields Section */}
              <div className='grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 bg-muted/20 p-3.5 sm:p-4 rounded-xl border'>
                {/* 1. Supplier */}
                <FormField
                  control={form.control}
                  name='supplier_id'
                  render={({ field }) => (
                    <FormItem className='flex flex-col'>
                      <FormLabel className='text-xs font-semibold'>
                        {t('purchaseOrders.fields.supplier', 'Supplier')} *
                      </FormLabel>
                      <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant='outline'
                              role='combobox'
                              className={cn(
                                'w-full justify-between h-9 text-xs sm:text-sm font-normal bg-background',
                                (!field.value || field.value === '0') &&
                                  'text-muted-foreground'
                              )}
                            >
                              <div className='flex items-center gap-1.5 truncate'>
                                <Building2 className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                                <span className='truncate'>
                                  {field.value && field.value !== '0'
                                    ? suppliers?.find(
                                        (s) =>
                                          String(s.id || s.supplier_id) ===
                                          field.value
                                      )?.name
                                    : t(
                                        'purchaseOrders.placeholders.selectSupplier',
                                        'Select supplier'
                                      )}
                                </span>
                              </div>
                              <ChevronsUpDown className='ml-1 h-3.5 w-3.5 shrink-0 opacity-50' />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className='w-[--radix-popover-trigger-width] p-0' align='start'>
                          <Command>
                            <CommandInput
                              placeholder={t(
                                'purchaseOrders.placeholders.searchSupplier',
                                'Search supplier...'
                              )}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {t(
                                  'purchaseOrders.emptySupplier',
                                  'No supplier found.'
                                )}
                              </CommandEmpty>
                              <CommandGroup>
                                {suppliers?.map((s) => {
                                  const sId = String(s.id || s.supplier_id)
                                  return (
                                    <CommandItem
                                      value={`${s.name} ${sId}`}
                                      key={sId}
                                      onSelect={() => {
                                        form.setValue('supplier_id', sId, {
                                          shouldValidate: true,
                                        })
                                        setSupplierOpen(false)
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          sId === field.value
                                            ? 'opacity-100'
                                            : 'opacity-0'
                                        )}
                                      />
                                      {s.name}
                                    </CommandItem>
                                  )
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 2. Destination Warehouse */}
                <FormField
                  control={form.control}
                  name='warehouse_id'
                  render={({ field }) => (
                    <FormItem className='flex flex-col'>
                      <FormLabel className='text-xs font-semibold'>
                        {t('purchaseOrders.fields.destinationWarehouse', 'Destination Warehouse')}
                      </FormLabel>
                      <Select
                        value={field.value || 'none'}
                        onValueChange={(val) =>
                          field.onChange(val === 'none' ? '' : val)
                        }
                      >
                        <FormControl>
                          <SelectTrigger className='h-9 text-xs sm:text-sm bg-background'>
                            <div className='flex items-center gap-1.5 truncate'>
                              <Warehouse className='h-3.5 w-3.5 text-primary/70 shrink-0' />
                              <SelectValue
                                placeholder={t(
                                  'purchaseOrders.placeholders.selectWarehouse',
                                  'Select warehouse (optional)'
                                )}
                              />
                            </div>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='none'>
                            <span className='text-muted-foreground italic'>
                              {t('common.none', 'None / Unassigned')}
                            </span>
                          </SelectItem>
                          {warehouses.map((wh) => (
                            <SelectItem key={wh.id} value={wh.id}>
                              {wh.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 3. Order Currency */}
                <FormField
                  control={form.control}
                  name='currency'
                  render={({ field }) => (
                    <FormItem className='flex flex-col'>
                      <FormLabel className='text-xs font-semibold'>
                        {t('purchaseOrders.fields.currency', 'Currency')} *
                      </FormLabel>
                      <FormControl>
                        <POCurrencySelect
                          value={field.value}
                          currencyId={watchedCurrencyId}
                          onSelectCurrency={(selected: SelectedCurrencyInfo) => {
                            field.onChange(selected.code)
                            form.setValue('currency_id', selected.id, {
                              shouldValidate: true,
                            })
                          }}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 3. Order Date */}
                <FormField
                  control={form.control}
                  name='order_date'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        {t('purchaseOrders.fields.orderDate', 'Order Date')} *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='date'
                          className='h-9 text-xs sm:text-sm bg-background'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 4. Expected Delivery Date */}
                <FormField
                  control={form.control}
                  name='expected_delivery_date'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        {t(
                          'purchaseOrders.fields.expectedDelivery',
                          'Expected Delivery'
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='date'
                          className='h-9 text-xs sm:text-sm bg-background'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 5. Notes */}
                <FormField
                  control={form.control}
                  name='notes'
                  render={({ field }) => (
                    <FormItem className='col-span-full'>
                      <FormLabel className='text-xs font-semibold'>
                        {t('purchaseOrders.fields.notes', 'Notes / Instructions')}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t(
                            'purchaseOrders.placeholders.notes',
                            'Delivery instructions, vendor terms, or internal notes...'
                          )}
                          className='resize-none text-xs sm:text-sm bg-background'
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Line Items Section */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <h4 className='text-sm font-bold text-foreground'>
                      {t('purchaseOrders.lineItems.title', 'Line Items')}
                    </h4>
                    <span className='text-xs font-medium rounded-full bg-muted px-2 py-0.5 text-muted-foreground'>
                      {lineItems.length}
                    </span>
                  </div>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={addLineItem}
                    className='h-8 text-xs'
                  >
                    <Plus className='mr-1 h-3.5 w-3.5' />
                    {t('purchaseOrders.lineItems.addItem', 'Add Item')}
                  </Button>
                </div>

                {lineItems.length > 0 ? (
                  <>
                    {/* Desktop Table View (>= 768px) */}
                    <div className='hidden md:block rounded-xl border bg-card overflow-hidden'>
                      <Table className='w-full'>
                        <TableHeader className='bg-muted/40'>
                          <TableRow>
                            <TableHead className='min-w-[200px] text-xs font-semibold'>
                              {t('purchaseOrders.lineItems.product', 'Product')}
                            </TableHead>
                            <TableHead className='min-w-[180px] text-xs font-semibold'>
                              {t('purchaseOrders.lineItems.variant', 'Variant')}
                            </TableHead>
                            <TableHead className='min-w-[140px] text-xs font-semibold'>
                              {t('purchaseOrders.lineItems.receivingUom', 'UOM')}
                            </TableHead>
                            <TableHead className='w-[100px] text-center text-xs font-semibold'>
                              {t('purchaseOrders.lineItems.qty', 'Qty')}
                            </TableHead>
                            <TableHead className='w-[120px] text-right text-xs font-semibold'>
                              {t('purchaseOrders.lineItems.unitCost', 'Unit Cost')}
                            </TableHead>
                            <TableHead className='w-[110px] text-right text-xs font-semibold pr-3'>
                              {t('purchaseOrders.lineItems.subtotal', 'Subtotal')}
                            </TableHead>
                            <TableHead className='w-[44px]' />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lineItems.map((item, index) => {
                            const itemVariants = getVariantsForProduct(
                              item.product_id
                            )
                            return (
                              <TableRow key={index} className='align-top'>
                                <TableCell className='min-w-[200px]'>
                                  <POProductSelect
                                    productId={item.product_id}
                                    products={products}
                                    variantsByProductId={variantsByProductId}
                                    onSelectProduct={(pId) =>
                                      updateLineItem(index, 'product_id', pId)
                                    }
                                    disabled={isPending}
                                    showValidation={showLineValidation}
                                  />
                                </TableCell>
                                <TableCell className='min-w-[180px]'>
                                  <POVariantSelect
                                    productId={item.product_id}
                                    variantId={item.product_variant_id}
                                    variants={itemVariants}
                                    onSelectVariant={(vId, cost) => {
                                      const current =
                                        lineItemOverrides ?? initialLineItems
                                      const updated = [...current]
                                      const rowItem = { ...updated[index] }
                                      rowItem.product_variant_id = vId
                                      rowItem.unit_cost = cost
                                      rowItem.subtotal =
                                        Number(rowItem.quantity_ordered) *
                                        Number(cost)
                                      updated[index] = rowItem
                                      setLineItemOverrides(updated)
                                      setShowLineValidation(false)
                                    }}
                                    disabled={isPending}
                                    showValidation={showLineValidation}
                                  />
                                </TableCell>
                                <TableCell className='min-w-[140px]'>
                                  <Select
                                    value={item.uom_id || 'none'}
                                    onValueChange={(val) =>
                                      updateLineItem(
                                        index,
                                        'uom_id',
                                        val === 'none' ? null : val
                                      )
                                    }
                                    disabled={isPending || !item.product_id}
                                  >
                                    <SelectTrigger className='h-9 w-full text-xs'>
                                      <SelectValue
                                        placeholder={t(
                                          'purchaseOrders.placeholders.selectUom',
                                          'Select UOM'
                                        )}
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value='none'>
                                        <span className='text-muted-foreground italic text-xs'>
                                          {t('purchaseOrders.uomNone', 'Default / None')}
                                        </span>
                                      </SelectItem>
                                      {uoms.map((uom) => (
                                        <SelectItem
                                          key={uom.id}
                                          value={uom.id}
                                          className='text-xs'
                                        >
                                          {uom.name}{' '}
                                          {uom.code ? `(${uom.code})` : ''}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className='w-[100px]'>
                                  <Input
                                    type='number'
                                    min={1}
                                    className='h-9 w-full text-center font-semibold text-xs'
                                    value={item.quantity_ordered}
                                    disabled={isPending}
                                    onChange={(e) =>
                                      updateLineItem(
                                        index,
                                        'quantity_ordered',
                                        Number(e.target.value)
                                      )
                                    }
                                  />
                                </TableCell>
                                <TableCell className='w-[120px]'>
                                  <Input
                                    type='number'
                                    min={0}
                                    step={0.01}
                                    className='h-9 w-full font-mono text-right text-xs'
                                    value={item.unit_cost}
                                    disabled={
                                      isPending ||
                                      !item.product_id ||
                                      (itemVariants.length > 0 &&
                                        !item.product_variant_id)
                                    }
                                    onChange={(e) =>
                                      updateLineItem(
                                        index,
                                        'unit_cost',
                                        Number(e.target.value)
                                      )
                                    }
                                  />
                                </TableCell>
                                <TableCell className='w-[110px] text-right font-mono font-semibold text-xs pt-3 pr-3'>
                                  {currencySymbol}{item.subtotal.toFixed(2)}
                                </TableCell>
                                <TableCell className='w-[44px] text-center'>
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    className='h-8 w-8 text-muted-foreground hover:text-destructive'
                                    disabled={isPending}
                                    onClick={() => removeLineItem(index)}
                                  >
                                    <Trash2 className='h-4 w-4' />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Stacked Cards View (< 768px) */}
                    <div className='block md:hidden space-y-3'>
                      {lineItems.map((item, index) => {
                        const itemVariants = getVariantsForProduct(item.product_id)
                        return (
                          <Card
                            key={index}
                            className='border bg-card shadow-2xs overflow-hidden'
                          >
                            <CardContent className='p-3.5 space-y-3'>
                              <div className='flex items-center justify-between border-b pb-2'>
                                <span className='text-xs font-bold text-muted-foreground font-mono'>
                                  #{index + 1}
                                </span>
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='icon'
                                  className='h-7 w-7 text-muted-foreground hover:text-destructive'
                                  disabled={isPending}
                                  onClick={() => removeLineItem(index)}
                                >
                                  <Trash2 className='h-3.5 w-3.5' />
                                </Button>
                              </div>

                              <div className='space-y-2.5'>
                                <div>
                                  <label className='text-[11px] font-medium text-muted-foreground block mb-1'>
                                    {t('purchaseOrders.lineItems.product', 'Product')}
                                  </label>
                                  <POProductSelect
                                    productId={item.product_id}
                                    products={products}
                                    variantsByProductId={variantsByProductId}
                                    onSelectProduct={(pId) =>
                                      updateLineItem(index, 'product_id', pId)
                                    }
                                    disabled={isPending}
                                    showValidation={showLineValidation}
                                  />
                                </div>

                                <div>
                                  <label className='text-[11px] font-medium text-muted-foreground block mb-1'>
                                    {t('purchaseOrders.lineItems.variant', 'Variant')}
                                  </label>
                                  <POVariantSelect
                                    productId={item.product_id}
                                    variantId={item.product_variant_id}
                                    variants={itemVariants}
                                    onSelectVariant={(vId, cost) => {
                                      const current =
                                        lineItemOverrides ?? initialLineItems
                                      const updated = [...current]
                                      const rowItem = { ...updated[index] }
                                      rowItem.product_variant_id = vId
                                      rowItem.unit_cost = cost
                                      rowItem.subtotal =
                                        Number(rowItem.quantity_ordered) *
                                        Number(cost)
                                      updated[index] = rowItem
                                      setLineItemOverrides(updated)
                                      setShowLineValidation(false)
                                    }}
                                    disabled={isPending}
                                    showValidation={showLineValidation}
                                  />
                                </div>

                                <div className='grid grid-cols-3 gap-2'>
                                  <div>
                                    <label className='text-[11px] font-medium text-muted-foreground block mb-1'>
                                      {t('purchaseOrders.lineItems.receivingUom', 'UOM')}
                                    </label>
                                    <Select
                                      value={item.uom_id || 'none'}
                                      onValueChange={(val) =>
                                        updateLineItem(
                                          index,
                                          'uom_id',
                                          val === 'none' ? null : val
                                        )
                                      }
                                      disabled={isPending || !item.product_id}
                                    >
                                      <SelectTrigger className='h-9 w-full text-xs'>
                                        <SelectValue placeholder='UOM' />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value='none'>
                                          <span className='italic text-xs text-muted-foreground'>
                                            —
                                          </span>
                                        </SelectItem>
                                        {uoms.map((uom) => (
                                          <SelectItem
                                            key={uom.id}
                                            value={uom.id}
                                            className='text-xs'
                                          >
                                            {uom.code || uom.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <label className='text-[11px] font-medium text-muted-foreground block mb-1'>
                                      {t('purchaseOrders.lineItems.qty', 'Qty')}
                                    </label>
                                    <Input
                                      type='number'
                                      min={1}
                                      className='h-9 w-full text-center font-semibold text-xs'
                                      value={item.quantity_ordered}
                                      disabled={isPending}
                                      onChange={(e) =>
                                        updateLineItem(
                                          index,
                                          'quantity_ordered',
                                          Number(e.target.value)
                                        )
                                      }
                                    />
                                  </div>

                                  <div>
                                    <label className='text-[11px] font-medium text-muted-foreground block mb-1'>
                                      {t('purchaseOrders.lineItems.unitCost', 'Unit Cost')}
                                    </label>
                                    <Input
                                      type='number'
                                      min={0}
                                      step={0.01}
                                      className='h-9 w-full font-mono text-right text-xs'
                                      value={item.unit_cost}
                                      disabled={
                                        isPending ||
                                        !item.product_id ||
                                        (itemVariants.length > 0 &&
                                          !item.product_variant_id)
                                      }
                                      onChange={(e) =>
                                        updateLineItem(
                                          index,
                                          'unit_cost',
                                          Number(e.target.value)
                                        )
                                      }
                                    />
                                  </div>
                                </div>

                                <div className='flex items-center justify-between pt-1 border-t'>
                                  <span className='text-xs text-muted-foreground'>
                                    {t('purchaseOrders.lineItems.subtotal', 'Subtotal')}:
                                  </span>
                                  <span className='font-mono font-bold text-xs text-foreground'>
                                    {currencySymbol}{item.subtotal.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                    </>
                  ) : (
                    <div className='rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground bg-muted/10'>
                      <p className='mb-2'>
                        {t(
                          'purchaseOrders.lineItems.noItems',
                          'No line items. Click "Add Item" to begin adding products.'
                        )}
                      </p>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={addLineItem}
                      >
                        <Plus className='mr-1 h-3.5 w-3.5' />
                        {t('purchaseOrders.lineItems.addItem', 'Add Item')}
                      </Button>
                    </div>
                  )}

                {/* Financial Summary & Breakdown Card */}
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-muted/30 p-4 rounded-xl border'>
                  <FormField
                    control={form.control}
                    name='tax_amount'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs text-muted-foreground font-medium'>
                          {t('purchaseOrders.financials.taxAmount', 'Tax Total')} ({currencySymbol})
                        </FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min={0}
                            step={0.01}
                            className='h-8 text-xs font-mono bg-background'
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='shipping_amount'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs text-muted-foreground font-medium'>
                          {t('purchaseOrders.financials.shippingAmount', 'Shipping')} ({currencySymbol})
                        </FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min={0}
                            step={0.01}
                            className='h-8 text-xs font-mono bg-background'
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='discount_amount'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs text-muted-foreground font-medium'>
                          {t('purchaseOrders.financials.discountAmount', 'Discount')} ({currencySymbol})
                        </FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min={0}
                            step={0.01}
                            className='h-8 text-xs font-mono bg-background'
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className='flex flex-col justify-end text-right sm:border-l sm:pl-4'>
                    <span className='text-xs text-muted-foreground'>
                      {t('purchaseOrders.financials.itemsSubtotal', 'Items Subtotal')}:{' '}
                      <span className='font-mono font-medium'>{currencySymbol}{itemsSubtotal.toFixed(2)}</span>
                    </span>
                    <div className='mt-1'>
                      <span className='text-xs text-muted-foreground font-semibold'>
                        {t('purchaseOrders.financials.grandTotal', 'Grand Total')}:
                      </span>
                      <p className='text-lg font-bold font-mono text-primary'>
                        {currencySymbol}{grandTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dialog Footer */}
              <DialogFooter className='flex-col-reverse sm:flex-row sm:justify-between items-center gap-2 pt-2 border-t'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={closeDialog}
                  disabled={isPending}
                  className='w-full sm:w-auto text-xs'
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <div className='flex items-center gap-2 w-full sm:w-auto justify-end'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleOpenReviewSummary}
                    disabled={isPending}
                    className='bg-muted/40 hover:bg-muted text-xs'
                  >
                    <FileText className='mr-1.5 h-3.5 w-3.5 text-primary' />
                    {t(
                      'purchaseOrders.dialog.reviewSummary',
                      'Review Order Summary'
                    )}
                  </Button>
                  <Button type='submit' disabled={isPending} className='text-xs font-semibold'>
                    {isPending
                      ? t('common.saving', 'Saving...')
                      : isCreate
                        ? t('purchaseOrders.actions.createOrder', 'Create Order')
                        : t('purchaseOrders.actions.updateOrder', 'Update Order')}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {showSummaryModal && draftSummary && (
        <POSummaryDialog
          open={showSummaryModal}
          onOpenChange={setShowSummaryModal}
          draftData={draftSummary}
          onConfirmDraftSubmit={async () => {
            await form.handleSubmit(onSubmit)()
            setShowSummaryModal(false)
          }}
          isSubmittingDraft={isPending}
        />
      )}
    </>
  )
}
