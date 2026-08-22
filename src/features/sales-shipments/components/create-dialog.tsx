import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useWarehouseOptions,
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
import { createShipmentInputSchema } from '../data/schema'
import { useCreateSalesShipment } from '../hooks/use-sales-shipments'

interface LineItem {
  productVariantId: string
  shippedQty: string
  unitCost: string
}

const emptyItem: LineItem = {
  productVariantId: '',
  shippedQty: '',
  unitCost: '',
}

export function SalesShipmentCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [warehouseId, setWarehouseId] = useState('')
  const [salesOrderId, setSalesOrderId] = useState('')
  const [items, setItems] = useState<LineItem[]>([{ ...emptyItem }])
  const [search, setSearch] = useState('')

  const { data: warehouses = [] } = useWarehouseOptions()
  const { data: variants = [] } = useVariantOptions(search)
  const createShipment = useCreateSalesShipment()

  const reset = () => {
    setWarehouseId('')
    setSalesOrderId('')
    setItems([{ ...emptyItem }])
    setSearch('')
  }

  const updateItem = (index: number, patch: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  const handleSubmit = async () => {
    const parsed = createShipmentInputSchema.safeParse({
      warehouseId,
      salesOrderId: salesOrderId || undefined,
      items: items
        .filter((item) => item.productVariantId && item.shippedQty !== '')
        .map((item) => ({
          productVariantId: item.productVariantId,
          shippedQty: Number(item.shippedQty),
          unitCost: item.unitCost ? Number(item.unitCost) : undefined,
        })),
    })

    if (!parsed.success) {
      toast.error('Please fix the shipment details', {
        description: parsed.error.issues[0]?.message ?? 'Invalid input.',
      })
      return
    }

    try {
      await createShipment.mutateAsync(parsed.data)
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
          <DialogTitle>New Sales Shipment</DialogTitle>
          <DialogDescription>
            Prepare a shipment fulfillment from a warehouse for delivery to customers.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className='max-h-[60vh] pe-4'>
          <div className='grid gap-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label>Fulfilling Warehouse</Label>
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
                <Label>Sales Order ID (optional)</Label>
                <Input
                  value={salesOrderId}
                  onChange={(event) => setSalesOrderId(event.target.value)}
                  placeholder='e.g. UUID of Sales Order'
                />
              </div>
            </div>

            <div className='grid gap-2'>
              <div className='flex items-center justify-between'>
                <Label>Items to Ship</Label>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder='Search SKU / Product...'
                  className='h-8 w-44'
                />
              </div>
              <div className='space-y-3'>
                {items.map((item, index) => (
                  <div key={index} className='flex items-end gap-2'>
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
                      value={item.shippedQty}
                      onChange={(event) =>
                        updateItem(index, { shippedQty: event.target.value })
                      }
                      placeholder='Ship Qty'
                      className='w-28'
                    />
                    <Input
                      type='number'
                      step='any'
                      min={0}
                      value={item.unitCost}
                      onChange={(event) =>
                        updateItem(index, { unitCost: event.target.value })
                      }
                      placeholder='Unit cost'
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
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createShipment.isPending}>
            {createShipment.isPending ? 'Saving...' : 'Create Shipment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
