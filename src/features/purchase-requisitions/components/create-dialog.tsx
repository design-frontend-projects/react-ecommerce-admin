import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useWarehouseOptions,
  useStoreOptions,
  useSupplierOptions,
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
import { createRequisitionInputSchema } from '../data/schema'
import { useCreateRequisition } from '../hooks/use-purchase-requisitions'

interface LineItem {
  productVariantId: string
  qtyRequested: string
  estUnitCost: string
  preferredSupplierId: string
}

const NO_LOCATION = 'none'
const NO_SUPPLIER = 'none'

const emptyItem: LineItem = {
  productVariantId: '',
  qtyRequested: '',
  estUnitCost: '',
  preferredSupplierId: NO_SUPPLIER,
}

export function RequisitionCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [warehouseId, setWarehouseId] = useState(NO_LOCATION)
  const [neededBy, setNeededBy] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([{ ...emptyItem }])
  const [search, setSearch] = useState('')

  const { data: warehouses = [] } = useWarehouseOptions()
  const { data: stores = [] } = useStoreOptions()
  const { data: suppliers = [] } = useSupplierOptions()
  const { data: variants = [] } = useVariantOptions(search)
  const createRequisition = useCreateRequisition()

  const locationOptions =
    warehouses.length > 0
      ? warehouses.map((w) => ({ id: w.id, name: `${w.name} (${w.code})` }))
      : stores.map((s) => ({ id: s.store_id, name: s.name ?? s.store_id }))

  const reset = () => {
    setWarehouseId(NO_LOCATION)
    setNeededBy('')
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
    const parsed = createRequisitionInputSchema.safeParse({
      storeId: warehouseId === NO_LOCATION ? undefined : warehouseId,
      neededBy: neededBy || undefined,
      notes: notes || undefined,
      items: items
        .filter((item) => item.productVariantId && item.qtyRequested !== '')
        .map((item) => ({
          productVariantId: item.productVariantId,
          qtyRequested: Number(item.qtyRequested),
          estUnitCost:
            item.estUnitCost === '' ? undefined : Number(item.estUnitCost),
          preferredSupplierId:
            item.preferredSupplierId === NO_SUPPLIER
              ? undefined
              : item.preferredSupplierId,
        })),
    })

    if (!parsed.success) {
      toast.error('Please fix the requisition', {
        description: parsed.error.issues[0]?.message ?? 'Invalid input.',
      })
      return
    }

    try {
      await createRequisition.mutateAsync(parsed.data)
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
          <DialogTitle>New Purchase Requisition</DialogTitle>
          <DialogDescription>
            Request stock to be purchased for a warehouse. Created as a draft; submit it for
            approval, then convert it to a purchase order.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className='max-h-[60vh] pe-4'>
          <div className='grid gap-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label>Warehouse / Store (optional)</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select location' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_LOCATION}>No warehouse specified</SelectItem>
                    {locationOptions.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label>Needed by (optional)</Label>
                <Input
                  type='date'
                  value={neededBy}
                  onChange={(event) => setNeededBy(event.target.value)}
                />
              </div>
            </div>

            <div className='grid gap-2'>
              <div className='flex items-center justify-between'>
                <Label>Items</Label>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder='Search SKU / Product...'
                  className='h-8 w-44'
                />
              </div>
              <div className='space-y-2'>
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
                      value={item.qtyRequested}
                      onChange={(event) =>
                        updateItem(index, { qtyRequested: event.target.value })
                      }
                      placeholder='Qty'
                      className='w-24'
                    />
                    <Input
                      type='number'
                      step='any'
                      min={0}
                      value={item.estUnitCost}
                      onChange={(event) =>
                        updateItem(index, { estUnitCost: event.target.value })
                      }
                      placeholder='Est. cost'
                      className='w-28'
                    />
                    <Select
                      value={item.preferredSupplierId}
                      onValueChange={(value) =>
                        updateItem(index, { preferredSupplierId: value })
                      }
                    >
                      <SelectTrigger className='w-40'>
                        <SelectValue placeholder='Supplier' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_SUPPLIER}>No supplier</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem
                            key={supplier.id}
                            value={supplier.id}
                          >
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
          <Button onClick={handleSubmit} disabled={createRequisition.isPending}>
            {createRequisition.isPending ? 'Saving...' : 'Create draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

