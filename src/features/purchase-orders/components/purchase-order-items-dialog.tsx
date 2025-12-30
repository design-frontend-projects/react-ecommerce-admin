import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { Product } from '@/features/products/data/schema'
import { useProducts } from '@/features/products/hooks/use-products'
import { usePOContext } from './purchase-orders-provider'

interface POItem {
  po_item_id: number
  po_id: number
  product_id: number
  quantity_ordered: number
  unit_cost: number
  subtotal: number
  products?: {
    name: string
  }
}

// 1. Define Zod Schema based on DB columns
const itemFormSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  quantity_ordered: z
    .any()
    .transform((v) => Number(v))
    .pipe(z.number().int().min(1, 'Quantity must be at least 1')),
  unit_cost: z
    .any()
    .transform((v) => Number(v))
    .pipe(z.number().min(0, 'Cost must be positive')),
})

type ItemFormValues = z.infer<typeof itemFormSchema>

export function POItemsDialog() {
  const { open, setOpen, currentRow } = usePOContext()
  const { data: products } = useProducts()
  const queryClient = useQueryClient()

  // Form setup
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      product_id: '',
      quantity_ordered: 1,
      unit_cost: 0,
    },
  })

  // Fetch Items
  const { data: items, isLoading } = useQuery({
    queryKey: ['purchase-order-items', currentRow?.po_id, currentRow],
    queryFn: async () => {
      if (!currentRow) return []
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*, products(name)')
        .eq('po_id', currentRow.po_id)
      if (error) throw error
      return data as POItem[]
    },
    enabled: !!currentRow && open === 'items',
  })

  // Add Item Mutation
  const addItemMutation = useMutation({
    mutationFn: async (values: ItemFormValues) => {
      if (!currentRow) return
      const quantity = values.quantity_ordered
      const cost = values.unit_cost
      const subtotal = quantity * cost

      const { error } = await supabase.from('purchase_order_items').insert({
        po_id: currentRow.po_id,
        product_id: parseInt(values.product_id),
        quantity_ordered: quantity,
        unit_cost: cost,
        subtotal,
      })
      if (error) throw error

      // Update PO total amount
      const newTotal = (currentRow.total_amount || 0) + subtotal
      await supabase
        .from('purchase_orders')
        .update({ total_amount: newTotal })
        .eq('po_id', currentRow.po_id)

      toast.success('Product added to order')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['purchase-order-items', currentRow?.po_id],
      })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      form.reset({
        product_id: '',
        quantity_ordered: 1,
        unit_cost: 0,
      })
    },
    onError: (error: Error) => {
      toast.error('Error', {
        description: error.message || 'Failed to add product to order',
      })
    },
  })

  // Delete Item Mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (item: POItem) => {
      if (!currentRow) return
      const { error } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('po_item_id', item.po_item_id)
      if (error) throw error

      // Update PO total amount
      const newTotal = Math.max(
        0,
        (currentRow.total_amount || 0) - item.subtotal
      )
      await supabase
        .from('purchase_orders')
        .update({ total_amount: newTotal })
        .eq('po_id', currentRow.po_id)

      toast.success('Product removed from order')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['purchase-order-items', currentRow?.po_id],
      })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
    onError: (error: Error) => {
      toast.error('Error', {
        description: error.message || 'Failed to remove product from order',
      })
    },
  })

  const onSubmit = (values: ItemFormValues) => {
    addItemMutation.mutate(values)
  }

  // When product is selected, we could optionaly autofill cost price if available in product data
  // But for now, we leave it manual or default 0

  return (
    <Dialog
      open={open === 'items'}
      onOpenChange={(v) => {
        if (!v) {
          setOpen(null)
          form.reset()
        }
      }}
    >
      <DialogContent className='sm:max-w-[800px]'>
        <DialogHeader>
          <DialogTitle>Order Items - PO-{currentRow?.po_id}</DialogTitle>
          <DialogDescription>
            Manage the products included in this purchase order.
          </DialogDescription>
        </DialogHeader>

        {/* Add Item Form */}
        <div className='mb-4 rounded-md border bg-muted/20 p-4'>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className='flex items-end gap-2'
            >
              <div className='flex-1'>
                <FormField
                  name='product_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs'>Product</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className='h-9'>
                            <SelectValue placeholder='Select product' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products?.map((p: Product) =>
                            p.product_id ? (
                              <SelectItem
                                key={p.product_id}
                                value={p.product_id.toString()}
                              >
                                {p.name}
                              </SelectItem>
                            ) : null
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className='w-24'>
                <FormField
                  name='quantity_ordered'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs'>Qty</FormLabel>
                      <FormControl>
                        <Input type='number' className='h-9' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className='w-32'>
                <FormField
                  name='unit_cost'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs'>Unit Cost</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          step='0.01'
                          className='h-9'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className='pb-[2px]'>
                <Button
                  type='submit'
                  size='sm'
                  disabled={addItemMutation.isPending}
                >
                  <Plus className='mr-1 h-4 w-4' /> Add
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className='w-24 text-right'>Qty</TableHead>
                <TableHead className='w-32 text-right'>Unit Cost</TableHead>
                <TableHead className='w-32 text-right'>Subtotal</TableHead>
                <TableHead className='w-12'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className='py-8 text-center text-muted-foreground'
                  >
                    Loading items...
                  </TableCell>
                </TableRow>
              ) : items?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className='py-8 text-center text-muted-foreground'
                  >
                    No items added yet.
                  </TableCell>
                </TableRow>
              ) : (
                items?.map((item) => (
                  <TableRow key={item.po_item_id}>
                    <TableCell>{item.products?.name}</TableCell>
                    <TableCell className='text-right'>
                      {item.quantity_ordered}
                    </TableCell>
                    <TableCell className='text-right'>
                      ${Number(item.unit_cost).toFixed(2)}
                    </TableCell>
                    <TableCell className='text-right'>
                      ${Number(item.subtotal).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => deleteItemMutation.mutate(item)}
                        disabled={deleteItemMutation.isPending}
                      >
                        <Trash className='h-4 w-4 text-red-500' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
