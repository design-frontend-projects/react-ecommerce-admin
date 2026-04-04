import { useState, useMemo } from 'react'
import { z } from 'zod'
import { format } from 'date-fns'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

  // Compute initial line items from PO data
  const initialLineItems = useMemo<LineItem[]>(() => {
    if (isEdit && fullPO) {
      return fullPO.purchase_order_items.map((item) => ({
        product_id: item.product_id,
        product_variant_id: item.product_variant_id,
        quantity_ordered: item.quantity_ordered,
        unit_cost: item.unit_cost,
        subtotal: item.subtotal,
      }))
    }
    return []
  }, [isEdit, fullPO])

  // User edits tracked separately; null = no user edits yet
  const [lineItemOverrides, setLineItemOverrides] = useState<LineItem[] | null>(
    null
  )

  // Active line items: user-edited values or computed initial values
  const lineItems = lineItemOverrides ?? initialLineItems

  // ─── Line item handlers ─────────────────────────────────
  const addLineItem = () => {
    const current = lineItemOverrides ?? initialLineItems
    setLineItemOverrides([
      ...current,
      { product_id: 0, product_variant_id: null, quantity_ordered: 1, unit_cost: 0, subtotal: 0 },
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
    
    const item = { ...updated[index] }

    if (field === 'product_id') item.product_id = value as number
    else if (field === 'product_variant_id') item.product_variant_id = value as string | null
    else if (field === 'quantity_ordered') item.quantity_ordered = value as number
    else if (field === 'unit_cost') item.unit_cost = value as number
    

    updated[index] = item

    // Auto-calc subtotal
    if (field === 'quantity_ordered' || field === 'unit_cost') {
      updated[index].subtotal =
        Number(updated[index].quantity_ordered) * Number(updated[index].unit_cost)
    }

    // When product changes, reset variant and apply default cost if single variant
    if (field === 'product_id' && products) {
      const product = products.find((p) => p.product_id === Number(value))
      if (product) {
        // If single variant, auto-select it
        if (product.product_variants && product.product_variants.length === 1) {
          const v = product.product_variants[0]
          updated[index].product_variant_id = v.id || null
          updated[index].unit_cost = v.cost_price || 0
          updated[index].subtotal = updated[index].quantity_ordered * updated[index].unit_cost
        } else {
          updated[index].product_variant_id = null
          updated[index].unit_cost = 0
          updated[index].subtotal = 0
        }
      }
    }

    // When variant changes, use its cost_price
    if (field === 'product_variant_id' && products) {
      const product = products.find(p => p.product_id === updated[index].product_id)
      const variant = product?.product_variants?.find(v => v.id === value)
      if (variant) {
        updated[index].unit_cost = variant.cost_price || 0
        updated[index].subtotal = updated[index].quantity_ordered * updated[index].unit_cost
      }
    }

    setLineItemOverrides(updated)
  }

  const totalAmount = lineItems.reduce((sum, item) => sum + item.subtotal, 0)

  // ─── Submit ─────────────────────────────────────────────
  const onSubmit: SubmitHandler<POFormValues> = async (values) => {
    const validItems = lineItems.filter((item) => item.product_id > 0)
    if (validItems.length === 0) {
      toast.error('Add at least one line item')
      return
    }

    const items: PurchaseOrderItemInput[] = validItems.map((item) => ({
      product_id: item.product_id,
      product_variant_id: item.product_variant_id,
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
      setLineItemOverrides(null)
      setOpen(null)
    } catch (error: unknown) {
      toast.error('Error', {
        description:
          (error as Error)?.message || 'Failed to save purchase order.',
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
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
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select supplier' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers?.map((s) => (
                          <SelectItem
                            key={s.supplier_id}
                            value={String(s.supplier_id)}
                          >
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        <TableHead>Product</TableHead>
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
                        <TableRow key={index}>
                          <TableCell>
                            <div className='flex flex-col gap-1'>
                              <Select
                                value={String(item.product_id)}
                                onValueChange={(v) =>
                                  updateLineItem(index, 'product_id', Number(v))
                                }
                              >
                                <SelectTrigger className='h-9'>
                                  <SelectValue placeholder='Select product' />
                                </SelectTrigger>
                                <SelectContent>
                                  {products?.map((p) => (
                                    <SelectItem
                                      key={p.product_id}
                                      value={String(p.product_id)}
                                    >
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Variant Selection if available */}
                              {item.product_id > 0 && (() => {
                                const p = products?.find(prod => prod.product_id === item.product_id)
                                if (p?.product_variants && p.product_variants.length > 1) {
                                  return (
                                    <Select
                                      value={item.product_variant_id || ''}
                                      onValueChange={(v) => updateLineItem(index, 'product_variant_id', v)}
                                    >
                                      <SelectTrigger className='h-8 text-xs'>
                                        <SelectValue placeholder='Select variant...' />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {p.product_variants.map(v => (
                                          <SelectItem key={v.id} value={v.id!} className='text-xs'>
                                            {v.sku}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )
                                }
                                return null
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type='number'
                              min={1}
                              className='h-9'
                              value={item.quantity_ordered}
                              onChange={(e) =>
                                updateLineItem(
                                  index,
                                  'quantity_ordered',
                                  Number(e.target.value)
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type='number'
                              min={0}
                              step={0.01}
                              className='h-9'
                              value={item.unit_cost}
                              onChange={(e) =>
                                updateLineItem(
                                  index,
                                  'unit_cost',
                                  Number(e.target.value)
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className='text-right font-medium'>
                            ${item.subtotal.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8'
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
                  <span className='text-lg font-semibold'>
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setOpen(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending
                  ? 'Saving...'
                  : isCreate
                    ? 'Create Order'
                    : 'Update Order'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
