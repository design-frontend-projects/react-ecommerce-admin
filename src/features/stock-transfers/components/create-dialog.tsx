import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useStoreOptions,
  useVariantOptions,
} from '@/hooks/use-inventory-lookups'
import { useCreateTransfer } from '../hooks/use-stock-transfers'
import { createTransferInputSchema } from '../data/schema'
import { toast } from 'sonner'

interface LineItem {
  productVariantId: string
  qty: string
  unitCost: string
}

const emptyItem: LineItem = { productVariantId: '', qty: '', unitCost: '' }

export function TransferCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [fromStoreId, setFromStoreId] = useState('')
  const [toStoreId, setToStoreId] = useState('')
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([{ ...emptyItem }])
  const [search, setSearch] = useState('')

  const { data: stores = [] } = useStoreOptions()
  const { data: variants = [] } = useVariantOptions(search)
  const createTransfer = useCreateTransfer()

  const reset = () => {
    setFromStoreId('')
    setToStoreId('')
    setReferenceNo('')
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
    const parsed = createTransferInputSchema.safeParse({
      fromStoreId,
      toStoreId,
      referenceNo: referenceNo || undefined,
      notes: notes || undefined,
      items: items
        .filter((item) => item.productVariantId && item.qty)
        .map((item) => ({
          productVariantId: item.productVariantId,
          qty: Number(item.qty),
          unitCost: item.unitCost ? Number(item.unitCost) : undefined,
        })),
    })

    if (!parsed.success) {
      toast.error('Please fix the transfer', {
        description: parsed.error.issues[0]?.message ?? 'Invalid input.',
      })
      return
    }

    try {
      await createTransfer.mutateAsync(parsed.data)
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
          <DialogTitle>New Stock Transfer</DialogTitle>
          <DialogDescription>
            Move stock between two stores. The transfer is created as a draft;
            apply it to update balances.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className='max-h-[60vh] pe-4'>
          <div className='grid gap-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label>From store</Label>
                <Select value={fromStoreId} onValueChange={setFromStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder='Source' />
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
                <Label>To store</Label>
                <Select value={toStoreId} onValueChange={setToStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder='Destination' />
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
            </div>

            <div className='grid gap-2'>
              <Label>Reference no. (optional)</Label>
              <Input
                value={referenceNo}
                onChange={(event) => setReferenceNo(event.target.value)}
                placeholder='e.g. TR-1024'
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
                      min='0'
                      step='any'
                      value={item.qty}
                      onChange={(event) =>
                        updateItem(index, { qty: event.target.value })
                      }
                      placeholder='Qty'
                      className='w-24'
                    />
                    <Input
                      type='number'
                      min='0'
                      step='any'
                      value={item.unitCost}
                      onChange={(event) =>
                        updateItem(index, { unitCost: event.target.value })
                      }
                      placeholder='Cost'
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
          <Button onClick={handleSubmit} disabled={createTransfer.isPending}>
            {createTransfer.isPending ? 'Saving...' : 'Create draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
