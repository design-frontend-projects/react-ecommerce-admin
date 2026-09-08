import { useCallback, useMemo, useState } from 'react'
import { z } from 'zod'
import { format } from 'date-fns'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Check, ChevronsUpDown, FileText } from 'lucide-react'
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
import { useProducts } from '@/features/products/hooks/use-products'
import { useSuppliers } from '@/features/suppliers/hooks/use-suppliers'
import {
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  usePurchaseOrder,
  type PurchaseOrderItemInput,
} from '../hooks/use-purchase-orders'
import { usePOContext } from './po-provider'
import {
  POProductVariantPicker,
  type VariantOption,
} from './po-product-variant-picker'
import {
  POSummaryDialog,
  type POSummaryDraftData,
} from './po-summary-dialog'


// ─── Schema ───────────────────────────────────────────────
const poFormSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier is required'),
  order_date: z.string().min(1, 'Order date is required'),
  expected_delivery_date: z.string().optional(),
  notes: z.string().optional(),
})

type POFormValues = z.infer<typeof poFormSchema>

// ─── Line item type ───────────────────────────────────────
interface LineItem {
  product_id: number
  product_variant_id: string | null
  quantity_ordered: number
  unit_cost: number
  subtotal: number
}

export function POActionDialog() {
  const { open, setOpen, currentRow } = usePOContext()
  const isCreate = open === 'create'
  const isEdit = open === 'edit'
  const isOpen = isCreate || isEdit

  const { data: suppliers } = useSuppliers()
  const { data: products } = useProducts()
  const createMutation = useCreatePurchaseOrder()
  const updateMutation = useUpdatePurchaseOrder()
  const [showLineValidation, setShowLineValidation] = useState(false)
  const [supplierOpen, setSupplierOpen] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)

  // Fetch full PO with items for edit mode
  const { data: fullPO } = usePurchaseOrder(
    isEdit && currentRow ? currentRow.po_id : 0
  )

  // Compute form defaults reactively from props/data
  const formDefaults = useMemo<POFormValues>(() => {
    if (isEdit && currentRow && fullPO) {
      return {
        supplier_id: String(currentRow.supplier_id ?? 0),
        order_date: currentRow.order_date
          ? format(new Date(currentRow.order_date), 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd'),
        expected_delivery_date: currentRow.expected_delivery_date
          ? format(new Date(currentRow.expected_delivery_date), 'yyyy-MM-dd')
          : '',
        notes: currentRow.notes || '',
      }
    }
    return {
      supplier_id: '0',
      order_date: format(new Date(), 'yyyy-MM-dd'),
      expected_delivery_date: '',
      notes: '',
    }
  }, [isEdit, currentRow, fullPO])

  const form = useForm<POFormValues>({
    resolver: zodResolver(poFormSchema) as never,
    defaultValues: formDefaults,
    values: formDefaults,
  })

  const variantsByProductId = useMemo(() => {
    const map = new Map<number, VariantOption[]>()

    for (const product of products ?? []) {
      const pId = Number(product.product_id ?? product.id)
      if (!pId) continue

      const variants: VariantOption[] = (product.product_variants ?? [])
        .filter((variant) => !!variant.id)
        .map((variant) => ({
          id: variant.id as string,
          sku: variant.sku,
          name: variant.name ?? null,
          attributes_label: variant.attributes_label,
          price: Number(variant.price ?? 0),
          cost_price:
            variant.cost_price !== null && variant.cost_price !== undefined
              ? Number(variant.cost_price)
              : null,
          stock_quantity:
            variant.stock_quantity !== undefined
              ? Number(variant.stock_quantity)
              : undefined,
        }))

      map.set(pId, variants)
    }

    return map
  }, [products])

  const getVariantsForProduct = useCallback(
    (productId: number): VariantOption[] =>
      variantsByProductId.get(productId) ?? [],
    [variantsByProductId]
  )

  const getProductName = (productId: number): string =>
    products?.find((product) => Number(product.product_id ?? product.id) === productId)?.name ??
    `Product #${productId}`

  // Compute initial line items from PO data
  const initialLineItems = useMemo<LineItem[]>(() => {
    if (isEdit && fullPO) {
      return fullPO.purchase_order_items.map((item) => ({
        // Keep existing variant ID, but auto-map to the only variant if exactly one exists.
        product_id: item.product_id,
        product_variant_id: (() => {
          const variants = variantsByProductId.get(item.product_id) ?? []
          return (
            item.product_variant_id ??
            (variants.length === 1 ? variants[0].id : null)
          )
        })(),
        quantity_ordered: item.quantity_ordered,
        unit_cost: item.unit_cost,
        subtotal: item.subtotal,
      }))
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
        product_id: 0,
        product_variant_id: null,
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
      const nextProductId = Number(value) || 0
      const variants = getVariantsForProduct(nextProductId)

      item.product_id = nextProductId
      item.product_variant_id = null

      if (variants.length === 1) {
        item.product_variant_id = variants[0].id
        item.unit_cost = Number(variants[0].cost_price ?? 0)
      } else {
        item.unit_cost = 0
      }

      item.subtotal = Number(item.quantity_ordered) * Number(item.unit_cost)
      updated[index] = item
      setLineItemOverrides(updated)
      return
    }

    if (field === 'product_variant_id') {
      item.product_variant_id = value ? String(value) : null
      const variants = getVariantsForProduct(item.product_id)
      const variant = variants.find((v) => v.id === item.product_variant_id)

      if (variant) {
        item.unit_cost = Number(variant.cost_price ?? 0)
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

  const totalAmount = lineItems.reduce((sum, item) => sum + item.subtotal, 0)

  // ─── Submit ─────────────────────────────────────────────
  const onSubmit: SubmitHandler<POFormValues> = async (values) => {
    const validItems = lineItems.filter((item) => item.product_id > 0)
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
          `${getProductName(item.product_id)} has no variants. Select a product that has variants.`
        )
        return
      }

      if (!item.product_variant_id) {
        setShowLineValidation(true)
        toast.error(
          `Variant is required for ${getProductName(item.product_id)}.`
        )
        return
      }
    }

    const items: PurchaseOrderItemInput[] = validItems.map((item) => ({
      product_id: item.product_id,
      product_variant_id: item.product_variant_id!,
      quantity_ordered: item.quantity_ordered,
      unit_cost: item.unit_cost,
      subtotal: item.subtotal,
    }))

    try {
      if (isCreate) {
        await createMutation.mutateAsync({
          order: {
            supplier_id: +values.supplier_id,
            order_date: values.order_date,
            expected_delivery_date: values.expected_delivery_date || null,
            notes: values.notes || undefined,
          },
          items,
        })
        toast.success('Purchase order created')
      } else if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.po_id,
          order: {
            supplier_id: +values.supplier_id,
            order_date: values.order_date,
            expected_delivery_date: values.expected_delivery_date || null,
            notes: values.notes || undefined,
          },
          items,
        })
        toast.success('Purchase order updated')
      }
      closeDialog()
    } catch (error: unknown) {
      toast.error('Error', {
        description:
          (error as Error)?.message || 'Failed to save purchase order.',
      })
    }
  }

  const handleOpenReviewSummary = () => {
    const values = form.getValues()
    if (!values.supplier_id || values.supplier_id === '0') {
      toast.error('Please select a supplier first')
      return
    }

    const validItems = lineItems.filter((item) => item.product_id > 0)
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
          `${getProductName(item.product_id)} has no variants. Select a product that has variants.`
        )
        return
      }

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

  const draftSummary = useMemo<POSummaryDraftData | null>(() => {
    const values = form.getValues()
    const selectedSupplier = suppliers?.find(
      (s) => String(s.supplier_id) === values.supplier_id
    )

    const validItems = lineItems.filter((item) => item.product_id > 0)

    return {
      supplierId: values.supplier_id,
      supplierName: selectedSupplier?.name || 'Selected Supplier',
      orderDate: values.order_date,
      expectedDeliveryDate: values.expected_delivery_date || undefined,
      notes: values.notes || undefined,
      items: validItems.map((item) => {
        const prod = products?.find(
          (p) => Number(p.product_id ?? p.id) === item.product_id
        )
        const variants = getVariantsForProduct(item.product_id)
        const variant = variants.find((v) => v.id === item.product_variant_id)

        return {
          productId: item.product_id,
          productName: prod?.name || `Product #${item.product_id}`,
          productSku: prod?.sku,
          variantId: item.product_variant_id,
          variantSku: variant?.sku || 'Standard',
          variantLabel: variant?.attributes_label || variant?.name || undefined,
          quantity: item.quantity_ordered,
          unitCost: item.unit_cost,
          subtotal: item.subtotal,
        }
      }),
      totalAmount,
    }
  }, [form, suppliers, lineItems, products, getVariantsForProduct, totalAmount])

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(v) => !v && closeDialog()}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>
            {isCreate ? 'Create Purchase Order' : 'Edit Purchase Order'}
          </DialogTitle>
          <DialogDescription>
            {isCreate
              ? 'Fill in the order details and add line items.'
              : 'Update the order details and line items.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            {/* Header fields */}
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='supplier_id'
                render={({ field }) => (
                  <FormItem className='flex flex-col pt-2'>
                    <FormLabel>Supplier</FormLabel>
                    <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant='outline'
                            role='combobox'
                            className={cn(
                              'w-full justify-between',
                              (!field.value || field.value === '0') &&
                                'text-muted-foreground'
                            )}
                          >
                            {field.value && field.value !== '0'
                              ? suppliers?.find(
                                  (s) => String(s.supplier_id) === field.value
                                )?.name
                              : 'Select supplier'}
                            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className='w-[--radix-popover-trigger-width] p-0'>
                        <Command>
                          <CommandInput placeholder='Search supplier...' />
                          <CommandList>
                            <CommandEmpty>No supplier found.</CommandEmpty>
                            <CommandGroup>
                              {suppliers?.map((s) => (
                                <CommandItem
                                  value={s.name}
                                  key={s.supplier_id}
                                  onSelect={() => {
                                    form.setValue(
                                      'supplier_id',
                                      String(s.supplier_id),
                                      { shouldValidate: true }
                                    )
                                    setSupplierOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      String(s.supplier_id) === field.value
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    )}
                                  />
                                  {s.name}
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
              <FormField
                control={form.control}
                name='order_date'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Date</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='expected_delivery_date'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Delivery</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='notes'
                render={({ field }) => (
                  <FormItem className='sm:col-span-2'>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Optional notes...'
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

            {/* Line Items */}
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <h4 className='text-sm font-medium'>Line Items</h4>
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
                <div className='rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product & Variant</TableHead>
                        <TableHead className='w-24'>Qty</TableHead>
                        <TableHead className='w-28'>Unit Cost</TableHead>
                        <TableHead className='w-28 text-right'>
                          Subtotal
                        </TableHead>
                        <TableHead className='w-12' />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item, index) => (
                        <TableRow key={index} className='align-top'>
                          <TableCell className='min-w-[280px]'>
                            <POProductVariantPicker
                              productId={item.product_id}
                              variantId={item.product_variant_id}
                              products={products}
                              variantsByProductId={variantsByProductId}
                              onSelectProduct={(pId) =>
                                updateLineItem(index, 'product_id', pId)
                              }
                              onSelectVariant={(vId, cost) => {
                                const current = lineItemOverrides ?? initialLineItems
                                const updated = [...current]
                                const rowItem = { ...updated[index] }
                                rowItem.product_variant_id = vId
                                rowItem.unit_cost = cost
                                rowItem.subtotal =
                                  Number(rowItem.quantity_ordered) * Number(cost)
                                updated[index] = rowItem
                                setLineItemOverrides(updated)
                                setShowLineValidation(false)
                              }}
                              showValidation={showLineValidation}
                              disabled={isPending}
                            />
                          </TableCell>
                          <TableCell className='pt-2'>
                            <Input
                              type='number'
                              min={1}
                              className='h-9'
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
                          <TableCell className='pt-2'>
                            <Input
                              type='number'
                              min={0}
                              step={0.01}
                              className='h-9 font-mono'
                              value={item.unit_cost}
                              disabled={
                                isPending ||
                                (item.product_id > 0 &&
                                  getVariantsForProduct(item.product_id).length >
                                    0 &&
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
                          <TableCell className='text-right font-mono font-medium pt-3.5'>
                            ${item.subtotal.toFixed(2)}
                          </TableCell>
                          <TableCell className='pt-2'>
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
                  No line items. Click &quot;Add Item&quot; to begin.
                </div>
              )}

              {/* Total */}
              <div className='flex justify-end'>
                <div className='text-right'>
                  <span className='text-sm text-muted-foreground'>Total: </span>
                  <span className='text-lg font-semibold font-mono'>
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className='flex-col-reverse sm:flex-row sm:justify-between items-center gap-2'>
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
                  Review Order Summary
                </Button>
                <Button type='submit' disabled={isPending}>
                  {isPending
                    ? 'Saving...'
                    : isCreate
                      ? 'Create Order'
                      : 'Update Order'}
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
