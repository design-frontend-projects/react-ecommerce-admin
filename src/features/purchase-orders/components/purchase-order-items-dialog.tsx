import { useState } from 'react'
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
import { Product } from '@/features/products/data/schema'
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

export function POItemsDialog() {
  const { open, setOpen, currentRow } = usePOContext()
  const { data: products } = useProducts()
  const queryClient = useQueryClient()

  const { data: items, isLoading } = useQuery({
    queryKey: ['purchase-order-items', currentRow?.po_id],
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

  const addItemMutation = useMutation({
    mutationFn: async (newItem: {
      product_id: number
      quantity: number
      cost: number
    }) => {
      if (!currentRow) return
      const subtotal = newItem.quantity * newItem.cost
      const { error } = await supabase.from('purchase_order_items').insert({
        po_id: currentRow.po_id,
        product_id: newItem.product_id,
        quantity_ordered: newItem.quantity,
        unit_cost: newItem.cost,
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
    },
    onError: (error: any) => {
      toast.error('Error', {
        description: error.message || 'Failed to add product to order',
      })
    },
  })

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
    onError: (error: any) => {
      toast.error('Error', {
        description: error.message || 'Failed to remove product from order',
      })
    },
  })

  const [newProduct, setNewProduct] = useState('')
  const [newQuantity, setNewQuantity] = useState('1')
  const [newCost, setNewCost] = useState('0')

  const handleAddItem = async () => {
    if (!newProduct || !newQuantity || !newCost) return
    await addItemMutation.mutateAsync({
      product_id: parseInt(newProduct),
      quantity: parseInt(newQuantity),
      cost: parseFloat(newCost),
    })
    setNewProduct('')
    setNewQuantity('1')
    setNewCost('0')
  }

  return (
    <Dialog open={open === 'items'} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='sm:max-w-[700px]'>
        <DialogHeader>
          <DialogTitle>Order Items - PO-{currentRow?.po_id}</DialogTitle>
          <DialogDescription>
            Manage the products included in this purchase order.
          </DialogDescription>
        </DialogHeader>

        <div className='mb-4 flex items-end gap-2'>
          <div className='flex-1'>
            <label className='text-xs font-medium'>Product</label>
            <Select value={newProduct} onValueChange={setNewProduct}>
              <SelectTrigger>
                <SelectValue placeholder='Select product' />
              </SelectTrigger>
              <SelectContent>
                {products?.map((p: Product) => (
                  <SelectItem
                    key={p.product_id}
                    value={p.product_id.toString()}
                  >
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='w-20'>
            <label className='text-xs font-medium'>Qty</label>
            <Input
              type='number'
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
            />
          </div>
          <div className='w-24'>
            <label className='text-xs font-medium'>Cost</label>
            <Input
              type='number'
              step='0.01'
              value={newCost}
              onChange={(e) => setNewCost(e.target.value)}
            />
          </div>
          <Button onClick={handleAddItem} disabled={addItemMutation.isPending}>
            <Plus className='mr-1 h-4 w-4' /> Add
          </Button>
        </div>

        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className='w-20 text-right'>Qty</TableHead>
                <TableHead className='w-24 text-right'>Cost</TableHead>
                <TableHead className='w-24 text-right'>Subtotal</TableHead>
                <TableHead className='w-10'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className='py-4 text-center text-muted-foreground'
                  >
                    Loading items...
                  </TableCell>
                </TableRow>
              ) : items?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className='py-4 text-center text-muted-foreground'
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
                      ${item.unit_cost}
                    </TableCell>
                    <TableCell className='text-right'>
                      ${item.subtotal}
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
