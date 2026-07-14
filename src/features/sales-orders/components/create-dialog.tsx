import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import {
  useStoreOptions,
  useVariantOptions,
} from '@/hooks/use-inventory-lookups'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createOrderInputSchema } from '../data/schema'
import { useCreateOrder } from '../hooks/use-sales-orders'

interface CustomerOption {
  customer_id: number
  first_name: string | null
  last_name: string | null
}

/** Customers for the optional customer select. */
function useCustomerOptions() {
  return useQuery<CustomerOption[]>({
    queryKey: ['customers', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('customer_id, first_name, last_name')
        .order('first_name')
      if (error) throw error
      return (data ?? []) as CustomerOption[]
    },
  })
}

interface LineItem {
  productVariantId: string
  qty: string
  unitPrice: string
}

const emptyItem: LineItem = { productVariantId: '', qty: '', unitPrice: '' }

const WALK_IN = 'walk-in'

export function OrderCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [storeId, setStoreId] = useState('')
  const [customerId, setCustomerId] = useState(WALK_IN)
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([{ ...emptyItem }])
  const [search, setSearch] = useState('')

  const { data: stores = [] } = useStoreOptions()
  const { data: customers = [] } = useCustomerOptions()
  const { data: variants = [] } = useVariantOptions(search)
  const createOrder = useCreateOrder()

  const reset = () => {
    setStoreId('')
    setCustomerId(WALK_IN)
    setExpectedDate('')
    setNotes('')
    setItems([{ ...emptyItem }])
    setSearch('')
  }

  const updateItem = (index: number, patch: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  const pickVariant = (index: number, variantId: string) => {
    const variant = variants.find((option) => option.id === variantId)
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              productVariantId: variantId,
              unitPrice:
                item.unitPrice === '' && variant
                  ? String(variant.price ?? '')
                  : item.unitPrice,
            }
          : item
      )
    )
  }

  const total = items.reduce((sum, item) => {
    if (!item.productVariantId || item.qty === '' || item.unitPrice === '') {
      return sum
    }
    return sum + Number(item.qty) * Number(item.unitPrice)
  }, 0)

  const handleSubmit = async () => {
    const parsed = createOrderInputSchema.safeParse({
      storeId,
      customerId: customerId === WALK_IN ? undefined : Number(customerId),
      expectedDate: expectedDate || undefined,
      notes: notes || undefined,
      items: items
        .filter(
          (item) =>
            item.productVariantId && item.qty !== '' && item.unitPrice !== ''
        )
        .map((item) => ({
          productVariantId: item.productVariantId,
          qtyOrdered: Number(item.qty),
          unitPrice: Number(item.unitPrice),
        })),
    })

    if (!parsed.success) {
      toast.error('Please fix the sales order', {
        description: parsed.error.issues[0]?.message ?? 'Invalid input.',
      })
      return
    }

    try {
      await createOrder.mutateAsync(parsed.data)
      reset()
      onOpenChange(false)
    } catch {
      /* handled by mutation onError toast */
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) reset()
        onOpenChange(value)
      }}
    >
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>New Sales Order</DialogTitle>
          <DialogDescription>
            Create a draft order. Confirming it later reserves stock for
            fulfilment.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className='max-h-[60vh] pe-4'>
          <div className='grid gap-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label>Store</Label>
                <Select value={storeId} onValueChange={setStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select store' />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.store_id} value={store.store_id}>
                        {store.name ?? store.store_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label>Customer (optional)</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={WALK_IN}>Walk-in</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem
                        key={customer.customer_id}
                        value={String(customer.customer_id)}
                      >
                        {[customer.first_name, customer.last_name]
                          .filter(Boolean)
                          .join(' ') || `#${customer.customer_id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='grid gap-2'>
              <Label>Expected date (optional)</Label>
              <Input
                type='date'
                value={expectedDate}
                onChange={(event) => setExpectedDate(event.target.value)}
                className='w-48'
              />
            </div>

            <div className='grid gap-2'>
              <div className='flex items-center justify-between'>
                <Label>Items</Label>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder='Search SKU...'
                  className='h-8 w-40'
                />
              </div>
              <div className='space-y-2'>
                {items.map((item, index) => (
                  <div key={index} className='flex items-end gap-2'>
                    <div className='flex-1'>
                      <Select
                        value={item.productVariantId}
                        onValueChange={(value) => pickVariant(index, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Select variant' />
                        </SelectTrigger>
                        <SelectContent>
                          {variants.map((variant) => (
                            <SelectItem key={variant.id} value={variant.id}>
                              {variant.sku}
                              {variant.products?.name
                                ? ` — ${variant.products.name}`
                                : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type='number'
                      step='any'
                      min='0'
                      value={item.qty}
                      onChange={(event) =>
                        updateItem(index, { qty: event.target.value })
                      }
                      placeholder='Qty'
                      className='w-24'
                    />
                    <Input
                      type='number'
                      step='any'
                      min='0'
                      value={item.unitPrice}
                      onChange={(event) =>
                        updateItem(index, { unitPrice: event.target.value })
                      }
                      placeholder='Unit price'
                      className='w-28'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() =>
                        setItems((prev) =>
                          prev.length === 1
                            ? [{ ...emptyItem }]
                            : prev.filter((_, i) => i !== index)
                        )
                      }
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                ))}
              </div>
              <div className='flex items-center justify-between'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='w-fit'
                  onClick={() =>
                    setItems((prev) => [...prev, { ...emptyItem }])
                  }
                >
                  <Plus className='me-1 h-4 w-4' />
                  Add item
                </Button>
                <span className='text-sm text-muted-foreground'>
                  Total:{' '}
                  <span className='font-medium text-foreground tabular-nums'>
                    {total.toFixed(2)}
                  </span>
                </span>
              </div>
            </div>

            <div className='grid gap-2'>
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createOrder.isPending}>
            {createOrder.isPending ? 'Saving...' : 'Create draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
