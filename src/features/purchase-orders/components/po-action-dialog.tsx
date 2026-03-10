import { useState, useMemo } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useSuppliers } from '@/features/suppliers/hooks/use-suppliers'
import { useProducts } from '@/features/products/hooks/use-products'
import {
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  usePurchaseOrder,
  type PurchaseOrderItemInput,
} from '../hooks/use-purchase-orders'
import { usePOContext } from './po-provider'

// ─── Schema ───────────────────────────────────────────────
const poFormSchema = z.object({
  supplier_id: z.number().min(1, 'Supplier is required'),
  order_date: z.string().min(1, 'Order date is required'),
  expected_delivery_date: z.string().optional(),
  notes: z.string().optional(),
})

type POFormValues = z.infer<typeof poFormSchema>

// ─── Line item type ───────────────────────────────────────
interface LineItem {
  product_id: number
  quantity: number
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
        supplier_id: currentRow.supplier_id ?? 0,
        order_date: currentRow.order_date
          ? format(new Date(currentRow.order_date), 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd'),
        expected_delivery_date: currentRow.expected_delivery_date
          ? format(
              new Date(currentRow.expected_delivery_date),
              'yyyy-MM-dd'
            )
          : '',
        notes: currentRow.notes || '',
      }
    }
    return {
      supplier_id: 0,
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
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        subtotal: item.subtotal,
      }))
    }
    return []
  }, [isEdit, fullPO])

  // User edits tracked separately; null = no user edits yet
  const [lineItemOverrides, setLineItemOverrides] = useState<
    LineItem[] | null
  >(null)

  // Active line items: user-edited values or computed initial values
  const lineItems = lineItemOverrides ?? initialLineItems

  // ─── Line item handlers ─────────────────────────────────
  const addLineItem = () => {
    const current = lineItemOverrides ?? initialLineItems
    setLineItemOverrides([
      ...current,
      { product_id: 0, quantity: 1, unit_cost: 0, subtotal: 0 },
    ])
  }

  const removeLineItem = (index: number) => {
    const current = lineItemOverrides ?? initialLineItems
    setLineItemOverrides(current.filter((_, i) => i !== index))
  }

  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: number
  ) => {
    const current = lineItemOverrides ?? initialLineItems
    const updated = [...current]
    updated[index] = { ...updated[index], [field]: value }

    // Auto-calc subtotal
    if (field === 'quantity' || field === 'unit_cost') {
      updated[index].subtotal =
        updated[index].quantity * updated[index].unit_cost
    }

    // When product changes, try to use cost_price
    if (field === 'product_id' && products) {
      const product = products.find((p) => p.product_id === value)
      if (product?.cost_price) {
        updated[index].unit_cost = product.cost_price
        updated[index].subtotal =
          updated[index].quantity * product.cost_price
      }
    }

    setLineItemOverrides(updated)
  }

  const totalAmount = lineItems.reduce(
    (sum, item) => sum + item.subtotal,
    0
  )

  // ─── Submit ─────────────────────────────────────────────
  const onSubmit: SubmitHandler<POFormValues> = async (values) => {
    const validItems = lineItems.filter((item) => item.product_id > 0)
    if (validItems.length === 0) {
      toast.error('Add at least one line item')
      return
    }

    const items: PurchaseOrderItemInput[] = validItems.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      subtotal: item.subtotal,
    }))

    try {
      if (isCreate) {
        await createMutation.mutateAsync({
          order: {
            supplier_id: values.supplier_id,
            order_date: values.order_date,
            expected_delivery_date:
              values.expected_delivery_date || null,
            notes: values.notes || undefined,
          },
          items,
        })
        toast.success('Purchase order created')
      } else if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.po_id,
          order: {
            supplier_id: values.supplier_id,
            order_date: values.order_date,
            expected_delivery_date:
              values.expected_delivery_date || null,
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
          (error as Error)?.message ||
          'Failed to save purchase order.',
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
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-6'
          >
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
                            <Select
                              value={String(item.product_id)}
                              onValueChange={(v) =>
                                updateLineItem(
                                  index,
                                  'product_id',
                                  Number(v)
                                )
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
                          </TableCell>
                          <TableCell>
                            <Input
                              type='number'
                              min={1}
                              className='h-9'
                              value={item.quantity}
                              onChange={(e) =>
                                updateLineItem(
                                  index,
                                  'quantity',
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
                  <span className='text-sm text-muted-foreground'>
                    Total:{' '}
                  </span>
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
