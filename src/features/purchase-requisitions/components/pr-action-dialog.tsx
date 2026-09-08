import { useCallback, useMemo, useState } from 'react'
import { z } from 'zod'
import { format } from 'date-fns'
import { useForm, useWatch, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Check, ChevronsUpDown, FileText, Store } from 'lucide-react'
import { toast } from 'sonner'
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
import { useProducts } from '@/features/products/hooks/use-products'
import { useUomOptions } from '@/features/products/hooks/use-product-options'
import { useSuppliers } from '@/features/suppliers/hooks/use-suppliers'
import {
  useStoreOptions,
  useWarehouseOptions,
  useCurrencyOptions,
} from '@/hooks/use-inventory-lookups'
import {
  POProductSelect,
  POVariantSelect,
  type VariantOption,
} from '@/features/purchase-orders/components/po-product-variant-picker'
import { useRequisitionsContext } from './provider'
import {
  useCreateRequisition,
  useUpdateRequisition,
  useRequisition,
} from '../hooks/use-purchase-requisitions'
import {
  PRSummaryDialog,
  type PRSummaryDraftData,
} from './pr-summary-dialog'
import type { RequisitionItemInput } from '../data/schema'

// ─── Schema ───────────────────────────────────────────────
const prFormSchema = z.object({
  store_id: z.string().optional().nullable(),
  currency: z.string().min(1).default('USD'),
  needed_by: z.string().optional(),
  notes: z.string().optional(),
})

type PRFormValues = z.infer<typeof prFormSchema>

interface VariantPricingAndStock {
  price?: number | string | null
  cost_price?: number | string | null
  stock_quantity?: number | string | null
  price_list_items?: Array<{
    price?: number | string | null
    cost_price?: number | string | null
  }>
  stock_balances?: Array<{
    qty_available?: number | string | null
    qty_on_hand?: number | string | null
    qty_reserved?: number | string | null
  }>
}

// ─── Line Item Interface ─────────────────────────────────
interface LineItem {
  product_id: string
  product_variant_id: string | null
  uom_id: string | null
  quantity_requested: number
  est_unit_cost: number
  subtotal: number
  preferred_supplier_id: string | null
  reason: string
}

export function PRActionDialog() {
  const { open, setOpen, currentRow } = useRequisitionsContext()
  const isCreate = open === 'create'
  const isEdit = open === 'edit'
  const isOpen = isCreate || isEdit

  const { data: stores = [] } = useStoreOptions()
  const { data: warehouses = [] } = useWarehouseOptions()
  const { data: products } = useProducts()
  const { data: uoms = [] } = useUomOptions()
  const { data: suppliers = [] } = useSuppliers()
  const { data: currencies = [], isLoading: isLoadingCurrencies } =
    useCurrencyOptions()

  const createMutation = useCreateRequisition()
  const updateMutation = useUpdateRequisition()

  const [showLineValidation, setShowLineValidation] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)

  // Fetch full requisition with items for edit mode
  const { data: fullReq } = useRequisition(
    isEdit && currentRow ? currentRow.id : undefined
  )

  // Combined location options (stores and warehouses)
  const locationOptions = useMemo(() => {
    const list: Array<{ id: string; name: string; type: 'store' | 'warehouse' }> = []
    for (const store of stores) {
      list.push({
        id: store.store_id,
        name: store.name || `Store ${store.store_id.slice(0, 6)}`,
        type: 'store',
      })
    }
    for (const wh of warehouses) {
      if (!list.some((it) => it.id === wh.id)) {
        list.push({
          id: wh.id,
          name: `${wh.name} (${wh.code})`,
          type: 'warehouse',
        })
      }
    }
    return list
  }, [stores, warehouses])

  // Form Defaults
  const formDefaults = useMemo<PRFormValues>(() => {
    if (isEdit && currentRow && fullReq) {
      return {
        store_id: currentRow.stores?.store_id || fullReq.store_id || '',
        currency: currentRow.currency || fullReq.currency || 'USD',
        needed_by: currentRow.needed_by
          ? format(new Date(currentRow.needed_by), 'yyyy-MM-dd')
          : '',
        notes: currentRow.notes || '',
      }
    }
    return {
      store_id: '',
      currency: 'USD',
      needed_by: '',
      notes: '',
    }
  }, [isEdit, currentRow, fullReq])

  const form = useForm<PRFormValues>({
    resolver: zodResolver(prFormSchema) as never,
    defaultValues: formDefaults,
    values: formDefaults,
  })

  // Map variants by product id
  const variantsByProductId = useMemo(() => {
    const map = new Map<string, VariantOption[]>()

    for (const product of products ?? []) {
      const pId = String(product.id ?? product.product_id ?? '')
      if (!pId) continue

      const variants: VariantOption[] = (product.product_variants ?? [])
        .filter((variant) => Boolean(variant.id))
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

          const vMeta = variant as unknown as VariantPricingAndStock
          const pli = vMeta.price_list_items
          const resolvedCost =
            pli && pli.length > 0 && pli[0].cost_price != null
              ? Number(pli[0].cost_price)
              : vMeta.cost_price != null
                ? Number(vMeta.cost_price)
                : null
          const resolvedPrice =
            pli && pli.length > 0
              ? Number(pli[0].price)
              : Number(vMeta.price ?? 0)

          const balances = vMeta.stock_balances
          const resolvedStock =
            balances && balances.length > 0
              ? balances.reduce(
                  (sum: number, b) =>
                    sum +
                    Number(
                      b.qty_available ??
                        (Number(b.qty_on_hand || 0) - Number(b.qty_reserved || 0))
                    ),
                  0
                )
              : vMeta.stock_quantity !== undefined
                ? Number(vMeta.stock_quantity)
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
    products?.find((p) => String(p.id ?? p.product_id ?? '') === productId)
      ?.name ?? 'Product'

  // Initial line items for edit mode
  const initialLineItems = useMemo<LineItem[]>(() => {
    if (isEdit && fullReq) {
      return (fullReq.purchase_requisition_items || []).map((item) => {
        const prodId = String(
          item.product_variants?.product_id ||
            products?.find((p) =>
              (p.product_variants || []).some((v) => v.id === item.product_variant_id)
            )?.id ||
            ''
        )
        const variants = variantsByProductId.get(prodId) ?? []
        const qty = Number(item.qty_requested || 1)
        const cost = Number(item.est_unit_cost || 0)

        return {
          product_id: prodId,
          product_variant_id:
            item.product_variant_id ??
            (variants.length === 1 ? variants[0].id : null),
          uom_id: item.uom_id ?? null,
          quantity_requested: qty,
          est_unit_cost: cost,
          subtotal: qty * cost,
          preferred_supplier_id:
            item.preferred_supplier_id ?? item.suppliers?.id ?? null,
          reason: item.reason || '',
        }
      })
    }
    return []
  }, [isEdit, fullReq, products, variantsByProductId])

  const [lineItemOverrides, setLineItemOverrides] = useState<LineItem[] | null>(
    null
  )

  const lineItems = lineItemOverrides ?? initialLineItems

  const closeDialog = () => {
    setLineItemOverrides(null)
    setShowLineValidation(false)
    setShowSummaryModal(false)
    setOpen(null)
  }

  // ─── Line Item Handlers ─────────────────────────────────
  const addLineItem = () => {
    const current = lineItemOverrides ?? initialLineItems
    setLineItemOverrides([
      ...current,
      {
        product_id: '',
        product_variant_id: null,
        uom_id: null,
        quantity_requested: 1,
        est_unit_cost: 0,
        subtotal: 0,
        preferred_supplier_id: null,
        reason: '',
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
        (p) => String(p.id ?? p.product_id ?? '') === nextProductId
      )

      item.product_id = nextProductId
      item.product_variant_id = null
      item.uom_id =
        selectedProduct?.base_uom_id ||
        selectedProduct?.base_uom?.id ||
        null

      if (variants.length === 1) {
        item.product_variant_id = variants[0].id
        item.est_unit_cost = Number(
          variants[0].cost_price ?? variants[0].price ?? 0
        )
      } else {
        item.est_unit_cost = 0
      }

      item.subtotal =
        Number(item.quantity_requested) * Number(item.est_unit_cost)
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
        item.est_unit_cost = Number(variant.cost_price ?? variant.price ?? 0)
      } else {
        item.est_unit_cost = 0
      }

      item.subtotal =
        Number(item.quantity_requested) * Number(item.est_unit_cost)
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

    if (field === 'preferred_supplier_id') {
      item.preferred_supplier_id = value ? String(value) : null
      updated[index] = item
      setLineItemOverrides(updated)
      return
    }

    if (field === 'reason') {
      item.reason = String(value || '')
      updated[index] = item
      setLineItemOverrides(updated)
      return
    }

    if (field === 'quantity_requested') {
      item.quantity_requested = Math.max(1, Number(value) || 1)
    } else if (field === 'est_unit_cost') {
      item.est_unit_cost = Math.max(0, Number(value) || 0)
    }

    item.subtotal =
      Number(item.quantity_requested) * Number(item.est_unit_cost)
    updated[index] = item
    setLineItemOverrides(updated)
  }

  const selectedCurrency =
    useWatch({ control: form.control, name: 'currency' }) || 'USD'
  const totalAmount = lineItems.reduce((sum, item) => sum + item.subtotal, 0)

  // ─── Submit Handler ─────────────────────────────────────
  const onSubmit: SubmitHandler<PRFormValues> = async (values) => {
    const validItems = lineItems.filter((item) => Boolean(item.product_id))
    if (validItems.length === 0) {
      setShowLineValidation(true)
      toast.error('Add at least one line item')
      return
    }

    for (const item of validItems) {
      const variants = getVariantsForProduct(item.product_id)
      if (variants.length === 0) {
        setShowLineValidation(true)
        toast.error(
          `${getProductName(item.product_id)} has no variants configured.`
        )
        return
      }

      if (!item.product_variant_id) {
        setShowLineValidation(true)
        toast.error(
          `Variant selection is required for ${getProductName(item.product_id)}.`
        )
        return
      }
    }

    const itemsPayload: RequisitionItemInput[] = validItems.map((item) => ({
      productVariantId: item.product_variant_id!,
      qtyRequested: item.quantity_requested,
      uomId: item.uom_id || null,
      preferredSupplierId: item.preferred_supplier_id || null,
      estUnitCost: item.est_unit_cost,
      reason: item.reason || null,
    }))

    try {
      if (isCreate) {
        await createMutation.mutateAsync({
          storeId: values.store_id || null,
          currency: values.currency || 'USD',
          neededBy: values.needed_by || null,
          notes: values.notes || null,
          items: itemsPayload,
        })
      } else if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.id,
          input: {
            storeId: values.store_id || null,
            currency: values.currency || 'USD',
            neededBy: values.needed_by || null,
            notes: values.notes || null,
            items: itemsPayload,
          },
        })
      }
      closeDialog()
    } catch {
      // Error handled by hook toast
    }
  }

  // ─── Review Summary Modal ───────────────────────────────
  const handleOpenReviewSummary = () => {
    const validItems = lineItems.filter((item) => Boolean(item.product_id))
    if (validItems.length === 0) {
      setShowLineValidation(true)
      toast.error('Add at least one line item before reviewing summary')
      return
    }

    for (const item of validItems) {
      if (!item.product_variant_id) {
        setShowLineValidation(true)
        toast.error(
          `Variant is required for ${getProductName(item.product_id)}.`
        )
        return
      }
    }

    setShowSummaryModal(true)
  }

  const draftSummary = useMemo<PRSummaryDraftData | null>(() => {
    const values = form.getValues()
    const selectedLoc = locationOptions.find((loc) => loc.id === values.store_id)
    const validItems = lineItems.filter((item) => Boolean(item.product_id))

    return {
      storeId: values.store_id || null,
      storeName: selectedLoc?.name || 'No store / location specified',
      currency: values.currency || 'USD',
      neededBy: values.needed_by || undefined,
      notes: values.notes || undefined,
      items: validItems.map((item) => {
        const prod = products?.find(
          (p) => String(p.id ?? p.product_id ?? '') === item.product_id
        )
        const variants = getVariantsForProduct(item.product_id)
        const variant = variants.find((v) => v.id === item.product_variant_id)
        const selectedUom = uoms.find((u) => u.id === item.uom_id)
        const selectedSup = suppliers.find(
          (s) => String(s.id) === item.preferred_supplier_id
        )

        return {
          productId: item.product_id,
          productName: prod?.name || 'Product',
          productSku: prod?.sku,
          variantId: item.product_variant_id,
          variantSku: variant?.sku || 'Standard',
          variantLabel: variant?.attributes_label || variant?.name || undefined,
          uomId: item.uom_id,
          uomName: selectedUom?.name,
          uomCode: selectedUom?.code,
          quantity: item.quantity_requested,
          unitCost: item.est_unit_cost,
          subtotal: item.subtotal,
          supplierId: item.preferred_supplier_id,
          supplierName: selectedSup?.name,
          reason: item.reason,
        }
      }),
      totalAmount,
    }
  }, [
    form,
    locationOptions,
    lineItems,
    products,
    getVariantsForProduct,
    uoms,
    suppliers,
    totalAmount,
  ])

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-5xl md:max-w-6xl w-full'>
          <DialogHeader>
            <DialogTitle>
              {isCreate
                ? 'Create Purchase Requisition'
                : 'Edit Purchase Requisition'}
            </DialogTitle>
            <DialogDescription>
              {isCreate
                ? 'Specify procurement details, currency, receiving destination, and line items with product & variant search.'
                : 'Update the draft purchase requisition and requested line items.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              {/* Header Fields */}
              <div className='grid gap-4 sm:grid-cols-3'>
                {/* Destination Location */}
                <FormField
                  control={form.control}
                  name='store_id'
                  render={({ field }) => (
                    <FormItem className='flex flex-col pt-2'>
                      <FormLabel>Destination Store / Warehouse</FormLabel>
                      <Popover
                        open={locationOpen}
                        onOpenChange={setLocationOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant='outline'
                              role='combobox'
                              className={cn(
                                'w-full justify-between h-9',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <div className='flex items-center gap-2 truncate'>
                                <Store className='h-4 w-4 shrink-0 text-muted-foreground' />
                                <span className='truncate'>
                                  {field.value
                                    ? locationOptions.find(
                                        (loc) => loc.id === field.value
                                      )?.name || 'Selected location'
                                    : 'Select store or warehouse...'}
                                </span>
                              </div>
                              <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className='w-[320px] p-0' align='start'>
                          <Command>
                            <CommandInput placeholder='Search store or warehouse...' />
                            <CommandList>
                              <CommandEmpty>No location found.</CommandEmpty>
                              <CommandGroup>
                                {locationOptions.map((loc) => (
                                  <CommandItem
                                    key={loc.id}
                                    value={`${loc.name} ${loc.id}`}
                                    onSelect={() => {
                                      form.setValue('store_id', loc.id, {
                                        shouldValidate: true,
                                      })
                                      setLocationOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        loc.id === field.value
                                          ? 'opacity-100'
                                          : 'opacity-0'
                                      )}
                                    />
                                    <span className='truncate'>{loc.name}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Currency */}
                <FormField
                  control={form.control}
                  name='currency'
                  render={({ field }) => (
                    <FormItem className='pt-2'>
                      <FormLabel>Currency</FormLabel>
                      <Select
                        value={field.value || 'USD'}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className='h-9 w-full font-medium'>
                            <SelectValue
                              placeholder={
                                isLoadingCurrencies
                                  ? 'Loading currencies...'
                                  : 'Select currency'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencies.map((c) => (
                            <SelectItem key={c.id || c.code} value={c.code}>
                              <span className='font-mono font-medium mr-1.5'>
                                {c.code}
                              </span>
                              <span className='text-muted-foreground text-xs'>
                                ({c.symbol ? `${c.symbol} · ` : ''}{c.name})
                              </span>
                            </SelectItem>
                          ))}
                          {field.value &&
                            !currencies.some((c) => c.code === field.value) && (
                              <SelectItem key={field.value} value={field.value}>
                                <span className='font-mono font-medium mr-1.5'>
                                  {field.value}
                                </span>
                              </SelectItem>
                            )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Needed By Date */}
                <FormField
                  control={form.control}
                  name='needed_by'
                  render={({ field }) => (
                    <FormItem className='pt-2'>
                      <FormLabel>Needed By Date</FormLabel>
                      <FormControl>
                        <Input type='date' className='h-9' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name='notes'
                  render={({ field }) => (
                    <FormItem className='sm:col-span-3'>
                      <FormLabel>Notes / Justification</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='Reason for requisition, target department, or project notes...'
                          className='resize-none'
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Line Items Table */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h4 className='text-sm font-semibold tracking-tight'>
                      Requested Line Items
                    </h4>
                    <p className='text-xs text-muted-foreground'>
                      Select product, variant, requested UOM, and enter expected
                      costs.
                    </p>
                  </div>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={addLineItem}
                  >
                    <Plus className='mr-1 h-4 w-4' />
                    Add Item
                  </Button>
                </div>

                {lineItems.length > 0 ? (
                  <div className='rounded-md border overflow-x-auto'>
                    <Table className='w-full min-w-[940px]'>
                      <TableHeader>
                        <TableRow className='bg-muted/40'>
                          <TableHead className='min-w-[190px]'>Product</TableHead>
                          <TableHead className='min-w-[170px]'>Variant</TableHead>
                          <TableHead className='min-w-[130px]'>UOM</TableHead>
                          <TableHead className='w-[90px] text-center'>Qty</TableHead>
                          <TableHead className='w-[110px] text-right'>Est. Cost</TableHead>
                          <TableHead className='w-[110px] text-right pr-2'>Subtotal</TableHead>
                          <TableHead className='min-w-[150px]'>Preferred Supplier</TableHead>
                          <TableHead className='min-w-[130px]'>Reason / Remark</TableHead>
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
                              {/* Separate Dropdown 1: Product */}
                              <TableCell className='min-w-[190px]'>
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

                              {/* Separate Dropdown 2: Variant */}
                              <TableCell className='min-w-[170px]'>
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
                                    rowItem.est_unit_cost = cost
                                    rowItem.subtotal =
                                      Number(rowItem.quantity_requested) *
                                      Number(cost)
                                    updated[index] = rowItem
                                    setLineItemOverrides(updated)
                                    setShowLineValidation(false)
                                  }}
                                  disabled={isPending}
                                  showValidation={showLineValidation}
                                />
                              </TableCell>

                              {/* UOM Selector */}
                              <TableCell className='min-w-[130px] pt-2'>
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
                                    <SelectValue placeholder='Select UOM' />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value='none'>
                                      <span className='text-muted-foreground italic text-xs'>
                                        Default / None
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

                              {/* Requested Quantity */}
                              <TableCell className='w-[90px] pt-2'>
                                <Input
                                  type='number'
                                  min={1}
                                  className='h-9 w-full min-w-[70px] text-center font-semibold px-1.5'
                                  value={item.quantity_requested}
                                  disabled={isPending}
                                  onChange={(e) =>
                                    updateLineItem(
                                      index,
                                      'quantity_requested',
                                      Number(e.target.value)
                                    )
                                  }
                                />
                              </TableCell>

                              {/* Estimated Unit Cost */}
                              <TableCell className='w-[110px] pt-2'>
                                <Input
                                  type='number'
                                  min={0}
                                  step={0.01}
                                  className='h-9 w-full min-w-[85px] font-mono text-right px-2'
                                  value={item.est_unit_cost}
                                  disabled={
                                    isPending ||
                                    !item.product_id ||
                                    (itemVariants.length > 0 &&
                                      !item.product_variant_id)
                                  }
                                  onChange={(e) =>
                                    updateLineItem(
                                      index,
                                      'est_unit_cost',
                                      Number(e.target.value)
                                    )
                                  }
                                />
                              </TableCell>

                              {/* Subtotal */}
                              <TableCell className='w-[110px] text-right font-mono font-medium text-xs pt-3.5 pr-2'>
                                {selectedCurrency} {item.subtotal.toFixed(2)}
                              </TableCell>

                              {/* Preferred Supplier */}
                              <TableCell className='min-w-[150px] pt-2'>
                                <Select
                                  value={item.preferred_supplier_id || 'none'}
                                  onValueChange={(val) =>
                                    updateLineItem(
                                      index,
                                      'preferred_supplier_id',
                                      val === 'none' ? null : val
                                    )
                                  }
                                  disabled={isPending}
                                >
                                  <SelectTrigger className='h-9 w-full text-xs'>
                                    <SelectValue placeholder='Supplier' />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value='none'>
                                      <span className='text-muted-foreground italic text-xs'>
                                        No preferred supplier
                                      </span>
                                    </SelectItem>
                                    {suppliers.map((sup) => (
                                      <SelectItem
                                        key={sup.id}
                                        value={sup.id}
                                        className='text-xs'
                                      >
                                        {sup.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>

                              {/* Reason */}
                              <TableCell className='min-w-[130px] pt-2'>
                                <Input
                                  type='text'
                                  placeholder='Reason/remark'
                                  className='h-9 text-xs px-2'
                                  value={item.reason}
                                  disabled={isPending}
                                  onChange={(e) =>
                                    updateLineItem(
                                      index,
                                      'reason',
                                      e.target.value
                                    )
                                  }
                                />
                              </TableCell>

                              {/* Delete Row */}
                              <TableCell className='w-[44px] pt-2 text-center'>
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='icon'
                                  className='h-8 w-8'
                                  disabled={isPending}
                                  onClick={() => removeLineItem(index)}
                                >
                                  <Trash2 className='h-4 w-4 text-destructive' />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
                    No line items added. Click &quot;Add Item&quot; to begin.
                  </div>
                )}

                {/* Total */}
                <div className='flex justify-end pt-1'>
                  <div className='flex items-baseline gap-2 bg-muted/40 px-4 py-2 rounded-lg border'>
                    <span className='text-xs font-medium text-muted-foreground'>
                      Estimated Total:
                    </span>
                    <span className='text-lg font-bold font-mono'>
                      {selectedCurrency} {totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter className='flex-col-reverse sm:flex-row sm:justify-between items-center gap-2 border-t pt-4'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={closeDialog}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <div className='flex items-center gap-2 w-full sm:w-auto justify-end'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleOpenReviewSummary}
                    disabled={isPending}
                    className='bg-muted/40 hover:bg-muted'
                  >
                    <FileText className='mr-1.5 h-4 w-4 text-primary' />
                    Review Summary
                  </Button>
                  <Button type='submit' disabled={isPending}>
                    {isPending
                      ? 'Saving...'
                      : isCreate
                        ? 'Create Requisition'
                        : 'Update Requisition'}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {showSummaryModal && draftSummary && (
        <PRSummaryDialog
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
