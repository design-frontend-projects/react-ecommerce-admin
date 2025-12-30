import { useState } from 'react'
import { z } from 'zod'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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

// Schema for a single item entry
const itemSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  quantity_ordered: z.coerce.number().min(1, 'Min 1'),
  unit_cost: z.coerce.number().min(0, 'Min 0'),
})

// Schema for the bulk add form
const bulkAddSchema = z.object({
  items: z.array(itemSchema),
})

type BulkAddFormValues = z.infer<typeof bulkAddSchema>

export function POItemsDialog() {
  const { open, setOpen, currentRow } = usePOContext()
  const { data: products } = useProducts()
  const queryClient = useQueryClient()
  const [selectedRows, setSelectedRows] = useState<number[]>([])

  // Form setup for Bulk Add
  const form = useForm<BulkAddFormValues>({
    resolver: zodResolver(bulkAddSchema),
    defaultValues: {
      items: [{ product_id: '', quantity_ordered: 1, unit_cost: 0 }],
    },
  })

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'items',
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

  // Bulk Add Mutation
  const bulkAddMutation = useMutation({
    mutationFn: async (values: BulkAddFormValues) => {
      if (!currentRow) return

      const newItems = values.items.map((item) => ({
        po_id: currentRow.po_id,
        product_id: parseInt(item.product_id),
        quantity_ordered: item.quantity_ordered,
        unit_cost: item.unit_cost,
        subtotal: item.quantity_ordered * item.unit_cost,
      }))

      const { error } = await supabase
        .from('purchase_order_items')
        .insert(newItems)
      if (error) throw error

      // Recalculate Total
      const addedSubtotal = newItems.reduce(
        (acc, item) => acc + item.subtotal,
        0
      )
      const newTotal = (currentRow.total_amount || 0) + addedSubtotal

      await supabase
        .from('purchase_orders')
        .update({ total_amount: newTotal })
        .eq('po_id', currentRow.po_id)

      toast.success(`${newItems.length} items added successfully`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['purchase-order-items', currentRow?.po_id],
      })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      replace([{ product_id: '', quantity_ordered: 1, unit_cost: 0 }])
    },
    onError: (error: Error) => {
      toast.error('Error adding items: ' + error.message)
    },
  })

  // Bulk Delete Mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      if (!currentRow) return

      // Calculate total to deduct
      const itemsToDelete =
        items?.filter((item) => ids.includes(item.po_item_id)) || []
      const deduction = itemsToDelete.reduce(
        (acc, item) => acc + (item.subtotal || 0),
        0
      )

      const { error } = await supabase
        .from('purchase_order_items')
        .delete()
        .in('po_item_id', ids)

      if (error) throw error

      const newTotal = Math.max(0, (currentRow.total_amount || 0) - deduction)
      await supabase
        .from('purchase_orders')
        .update({ total_amount: newTotal })
        .eq('po_id', currentRow.po_id)

      toast.success(`${ids.length} items deleted`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['purchase-order-items', currentRow?.po_id],
      })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      setSelectedRows([])
    },
    onError: (error: Error) => {
      toast.error('Error deleting items: ' + error.message)
    },
  })

  const onSubmit = (values: BulkAddFormValues) => {
    bulkAddMutation.mutate(values)
  }

  const toggleSelectAll = () => {
    if (selectedRows.length === items?.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(items?.map((i) => i.po_item_id) || [])
    }
  }

  const toggleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id))
    } else {
      setSelectedRows([...selectedRows, id])
    }
  }

  return (
    <Dialog
      open={open === 'items'}
      onOpenChange={(v) => {
        if (!v) {
          setOpen(null)
          form.reset()
          setSelectedRows([])
        }
      }}
    >
      <DialogContent className='flex h-[90vh] flex-col sm:max-w-[900px]'>
        <DialogHeader>
          <DialogTitle>Order Items - PO-{currentRow?.po_id}</DialogTitle>
          <DialogDescription>
            Manage items for this purchase order. Add multiple items below.
          </DialogDescription>
        </DialogHeader>

        {/* Bulk Add Form Layer */}
        <div className='mb-4 max-h-[30vh] flex-none overflow-y-auto rounded-md border bg-muted/20 p-4'>
          <Form {...(form as any)}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-2'>
              <div className='mb-2 flex items-center justify-between'>
                <h4 className='text-sm font-medium'>Add Items</h4>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    append({
                      product_id: '',
                      quantity_ordered: 1,
                      unit_cost: 0,
                    })
                  }
                >
                  <Plus className='mr-1 h-4 w-4' /> Add Row
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className='flex items-end gap-2'>
                  <div className='flex-1'>
                    <FormField
                      control={form.control as any}
                      name={`items.${index}.product_id`}
                      render={({ field }) => (
                        <FormItem>
                          {index === 0 && (
                            <FormLabel className='text-xs'>Product</FormLabel>
                          )}
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className='h-8'>
                                <SelectValue placeholder='Select product' />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {products?.map((p: Product) => (
                                <SelectItem
                                  key={p.product_id}
                                  value={
                                    p.product_id ? p.product_id.toString() : ''
                                  }
                                >
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className='w-24'>
                    <FormField
                      control={form.control as any}
                      name={`items.${index}.quantity_ordered`}
                      render={({ field }) => (
                        <FormItem>
                          {index === 0 && (
                            <FormLabel className='text-xs'>Qty</FormLabel>
                          )}
                          <FormControl>
                            <Input type='number' className='h-8' {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className='w-32'>
                    <FormField
                      control={form.control as any}
                      name={`items.${index}.unit_cost`}
                      render={({ field }) => (
                        <FormItem>
                          {index === 0 && (
                            <FormLabel className='text-xs'>Cost</FormLabel>
                          )}
                          <FormControl>
                            <Input
                              type='number'
                              step='0.01'
                              className='h-8'
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className='pb-[2px]'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 text-muted-foreground hover:text-destructive'
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <X className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              ))}

              <div className='pt-2'>
                <Button
                  type='submit'
                  size='sm'
                  disabled={bulkAddMutation.isPending}
                >
                  {bulkAddMutation.isPending ? (
                    'Saving...'
                  ) : (
                    <>
                      <Save className='mr-1 h-4 w-4' /> Save Items
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Items Table */}
        <div className='relative flex-1 overflow-auto rounded-md border'>
          {selectedRows.length > 0 && (
            <div className='absolute top-0 right-0 left-0 z-10 flex items-center justify-between border-b bg-secondary px-4 py-2'>
              <span className='text-sm font-medium'>
                {selectedRows.length} selected
              </span>
              <Button
                variant='destructive'
                size='sm'
                onClick={() => bulkDeleteMutation.mutate(selectedRows)}
                disabled={bulkDeleteMutation.isPending}
              >
                <Trash className='mr-2 h-4 w-4' />
                Delete Selected
              </Button>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-[40px]'>
                  <Checkbox
                    checked={
                      items &&
                      items.length > 0 &&
                      selectedRows.length === items.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead className='text-right'>Qty</TableHead>
                <TableHead className='text-right'>Unit Cost</TableHead>
                <TableHead className='text-right'>Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className='py-8 text-center'>
                    Loading...
                  </TableCell>
                </TableRow>
              ) : items?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className='py-8 text-center'>
                    No items found.
                  </TableCell>
                </TableRow>
              ) : (
                items?.map((item) => (
                  <TableRow
                    key={item.po_item_id}
                    data-state={
                      selectedRows.includes(item.po_item_id)
                        ? 'selected'
                        : undefined
                    }
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.includes(item.po_item_id)}
                        onCheckedChange={() => toggleSelectRow(item.po_item_id)}
                      />
                    </TableCell>
                    <TableCell>{item.products?.name}</TableCell>
                    <TableCell className='text-right'>
                      {item.quantity_ordered}
                    </TableCell>
                    <TableCell className='text-right'>
                      {item.unit_cost.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </TableCell>
                    <TableCell className='text-right'>
                      {item.subtotal.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })}
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
