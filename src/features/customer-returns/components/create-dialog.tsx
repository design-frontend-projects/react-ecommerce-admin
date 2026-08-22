import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useWarehouseOptions,
  useCustomerOptions,
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
import { createCustomerReturnInputSchema } from '../data/schema'
import { useCreateCustomerReturn } from '../hooks/use-customer-returns'

interface LineItem {
  productVariantId: string
  quantity: string
  goodQty: string
  damagedQty: string
  unitCost: string
  reason: string
}

const emptyItem: LineItem = {
  productVariantId: '',
  quantity: '',
  goodQty: '',
  damagedQty: '0',
  unitCost: '',
  reason: '',
}

const NO_CUSTOMER = 'none'

export function CustomerReturnCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [warehouseId, setWarehouseId] = useState('')
  const [customerId, setCustomerId] = useState(NO_CUSTOMER)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([{ ...emptyItem }])
  const [search, setSearch] = useState('')

  const { data: warehouses = [] } = useWarehouseOptions()
  const { data: customers = [] } = useCustomerOptions()
  const { data: variants = [] } = useVariantOptions(search)
  const createReturn = useCreateCustomerReturn()

  const reset = () => {
    setWarehouseId('')
    setCustomerId(NO_CUSTOMER)
    setReason('')
    setNotes('')
    setItems([{ ...emptyItem }])
    setSearch('')
  }

  const updateItem = (index: number, patch: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  const handleSubmit = async () => {
    const parsed = createCustomerReturnInputSchema.safeParse({
      warehouseId,
      customerId: customerId === NO_CUSTOMER ? undefined : customerId,
      reason: reason || undefined,
      notes: notes || undefined,
      items: items
        .filter((item) => item.productVariantId && item.quantity !== '')
        .map((item) => {
          const qty = Number(item.quantity)
          const good = item.goodQty ? Number(item.goodQty) : qty
          const damaged = item.damagedQty ? Number(item.damagedQty) : 0
          return {
            productVariantId: item.productVariantId,
            quantity: qty,
            goodQty: good,
            damagedQty: damaged,
            unitCost: item.unitCost ? Number(item.unitCost) : undefined,
            reason: item.reason || undefined,
          }
        }),
    })

    if (!parsed.success) {
      toast.error('Please fix the return details', {
        description: parsed.error.issues[0]?.message ?? 'Invalid input.',
      })
      return
    }

    try {
      await createReturn.mutateAsync(parsed.data)
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
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>New Customer Return</DialogTitle>
          <DialogDescription>
            Record products returned by a customer into a warehouse with good vs damaged triage.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className='max-h-[60vh] pe-4'>
          <div className='grid gap-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label>Receiving Warehouse</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select warehouse' />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>
                        {wh.name} ({wh.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label>Customer (optional)</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select customer' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CUSTOMER}>No customer specified</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.phone || c.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='grid gap-2'>
              <div className='flex items-center justify-between'>
                <Label>Returned Items</Label>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder='Search SKU / Product...'
                  className='h-8 w-44'
                />
              </div>
              <div className='space-y-3'>
                {items.map((item, index) => (
                  <div key={index} className='rounded-md border p-3'>
                    <div className='flex items-end gap-2'>
                      <div className='flex-1'>
                        <Select
                          value={item.productVariantId}
                          onValueChange={(value) =>
                            updateItem(index, { productVariantId: value })
                          }
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
                        min={0}
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, { quantity: event.target.value })
                        }
                        placeholder='Total Qty'
                        className='w-24'
                      />
                      <Input
                        type='number'
                        step='any'
                        min={0}
                        value={item.goodQty}
                        onChange={(event) =>
                          updateItem(index, { goodQty: event.target.value })
                        }
                        placeholder='Good Qty'
                        className='w-24'
                      />
                      <Input
                        type='number'
                        step='any'
                        min={0}
                        value={item.damagedQty}
                        onChange={(event) =>
                          updateItem(index, { damagedQty: event.target.value })
                        }
                        placeholder='Damaged'
                        className='w-24'
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
                  </div>
                ))}
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='w-fit'
                onClick={() => setItems((prev) => [...prev, { ...emptyItem }])}
              >
                <Plus className='me-1 h-4 w-4' />
                Add item
              </Button>
            </div>

            <div className='grid gap-2'>
              <Label>Return Reason / Notes</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder='e.g. Defective packaging or customer requested replacement'
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createReturn.isPending}>
            {createReturn.isPending ? 'Saving...' : 'Create Return'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
