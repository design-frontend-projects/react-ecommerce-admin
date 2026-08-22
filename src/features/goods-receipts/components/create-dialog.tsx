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
import { createReceiptInputSchema } from '../data/schema'
import { useCreateReceipt } from '../hooks/use-goods-receipts'

interface LineItem {
  productVariantId: string
  qtyReceived: string
  acceptedQty: string
  rejectedQty: string
  unitCost: string
  batchNumber: string
  expiryDate: string
  serials: string
}

const emptyItem: LineItem = {
  productVariantId: '',
  qtyReceived: '',
  acceptedQty: '',
  rejectedQty: '',
  unitCost: '',
  batchNumber: '',
  expiryDate: '',
  serials: '',
}

const NO_SUPPLIER = 'none'

export function ReceiptCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [warehouseId, setWarehouseId] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [supplierId, setSupplierId] = useState(NO_SUPPLIER)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([{ ...emptyItem }])
  const [search, setSearch] = useState('')

  const { data: warehouses = [] } = useWarehouseOptions()
  const { data: stores = [] } = useStoreOptions()
  const { data: suppliers = [] } = useSupplierOptions()
  const { data: variants = [] } = useVariantOptions(search)
  const createReceipt = useCreateReceipt()

  const locationOptions =
    warehouses.length > 0
      ? warehouses.map((w) => ({ id: w.id, name: `${w.name} (${w.code})` }))
      : stores.map((s) => ({ id: s.store_id, name: s.name ?? s.store_id }))

  const reset = () => {
    setWarehouseId('')
    setPoNumber('')
    setSupplierId(NO_SUPPLIER)
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
    const parsed = createReceiptInputSchema.safeParse({
      warehouseId: warehouseId || undefined,
      storeId: warehouseId || undefined,
      purchaseOrderId: poNumber || undefined,
      supplierId: supplierId === NO_SUPPLIER ? undefined : supplierId,
      notes: notes || undefined,
      items: items
        .filter((item) => item.productVariantId && item.qtyReceived !== '')
        .map((item) => {
          const serialNumbers = item.serials
            .split('\n')
            .map((serial) => serial.trim())
            .filter(Boolean)
          const qty = Number(item.qtyReceived)
          const accepted = item.acceptedQty ? Number(item.acceptedQty) : qty
          const rejected = item.rejectedQty ? Number(item.rejectedQty) : 0
          return {
            productVariantId: item.productVariantId,
            qtyReceived: qty,
            acceptedQty: accepted,
            rejectedQty: rejected,
            unitCost: item.unitCost === '' ? undefined : Number(item.unitCost),
            batchNumber: item.batchNumber || undefined,
            expiryDate: item.expiryDate || undefined,
            serialNumbers: serialNumbers.length > 0 ? serialNumbers : undefined,
          }
        }),
    })

    if (!parsed.success) {
      toast.error('Please fix the receipt', {
        description: parsed.error.issues[0]?.message ?? 'Invalid input.',
      })
      return
    }

    try {
      await createReceipt.mutateAsync(parsed.data)
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
          <DialogTitle>New Goods Receipt</DialogTitle>
          <DialogDescription>
            Receive items into warehouse. Enter inspection metrics (accepted vs rejected)
            and batch/serial metadata.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className='max-h-[60vh] pe-4'>
          <div className='grid gap-4'>
            <div className='grid grid-cols-3 gap-4'>
              <div className='grid gap-2'>
                <Label>Warehouse</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select warehouse' />
                  </SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label>PO # / ID (optional)</Label>
                <Input
                  value={poNumber}
                  onChange={(event) => setPoNumber(event.target.value)}
                  placeholder='e.g. PO-2026-001'
                />
              </div>
              <div className='grid gap-2'>
                <Label>Supplier (optional)</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder='No supplier' />
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
                        value={item.qtyReceived}
                        onChange={(event) =>
                          updateItem(index, {
                            qtyReceived: event.target.value,
                          })
                        }
                        placeholder='Received'
                        className='w-24'
                      />
                      <Input
                        type='number'
                        step='any'
                        min={0}
                        value={item.acceptedQty}
                        onChange={(event) =>
                          updateItem(index, {
                            acceptedQty: event.target.value,
                          })
                        }
                        placeholder='Accepted'
                        className='w-24'
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
                    <div className='mt-2 grid grid-cols-3 gap-2'>
                      <div className='grid gap-1'>
                        <Label className='text-xs text-muted-foreground'>
                          Batch # (optional)
                        </Label>
                        <Input
                          value={item.batchNumber}
                          onChange={(event) =>
                            updateItem(index, {
                              batchNumber: event.target.value,
                            })
                          }
                          placeholder='e.g. BATCH-2026-X'
                        />
                      </div>
                      <div className='grid gap-1'>
                        <Label className='text-xs text-muted-foreground'>
                          Expiry date (optional)
                        </Label>
                        <Input
                          type='date'
                          value={item.expiryDate}
                          onChange={(event) =>
                            updateItem(index, {
                              expiryDate: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className='grid gap-1'>
                        <Label className='text-xs text-muted-foreground'>
                          Serials (one per line)
                        </Label>
                        <Textarea
                          value={item.serials}
                          onChange={(event) =>
                            updateItem(index, { serials: event.target.value })
                          }
                          placeholder='SN001&#10;SN002'
                          rows={2}
                        />
                      </div>
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
          <Button onClick={handleSubmit} disabled={createReceipt.isPending}>
            {createReceipt.isPending ? 'Saving...' : 'Create draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

