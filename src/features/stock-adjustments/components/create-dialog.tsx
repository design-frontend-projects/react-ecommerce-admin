import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useStoreOnHand,
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
import {
  createAdjustmentInputSchema,
  type AdjustmentReason,
  type AdjustmentType,
} from '../data/schema'
import { useCreateAdjustment } from '../hooks/use-stock-adjustments'

interface LineItem {
  productVariantId: string
  qty: string
  reason?: AdjustmentReason
}

const emptyItem: LineItem = { productVariantId: '', qty: '' }

const QTY_LABEL: Record<AdjustmentType, string> = {
  manual: 'Delta (+/-)',
  damage: 'Qty to write off',
  stocktake: 'Counted qty',
}

const DAMAGE_REASONS: AdjustmentReason[] = ['damage', 'expired', 'theft']

export function AdjustmentCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [storeId, setStoreId] = useState('')
  const [type, setType] = useState<AdjustmentType>('manual')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([{ ...emptyItem }])
  const [search, setSearch] = useState('')

  const { data: stores = [] } = useStoreOptions()
  const { data: variants = [] } = useVariantOptions(search)
  const { data: onHand = {} } = useStoreOnHand(storeId || undefined)
  const createAdjustment = useCreateAdjustment()

  const reset = () => {
    setStoreId('')
    setType('manual')
    setNotes('')
    setItems([{ ...emptyItem }])
    setSearch('')
  }

  const updateItem = (index: number, patch: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  const discrepancy = (item: LineItem): number | null => {
    if (type !== 'stocktake' || !item.productVariantId || item.qty === '') {
      return null
    }
    const current = onHand[item.productVariantId] ?? 0
    return Number(item.qty) - current
  }

  const handleSubmit = async () => {
    const parsed = createAdjustmentInputSchema.safeParse({
      storeId,
      type,
      notes: notes || undefined,
      items: items
        .filter((item) => item.productVariantId && item.qty !== '')
        .map((item) => ({
          productVariantId: item.productVariantId,
          qty: Number(item.qty),
          reason: type === 'damage' ? (item.reason ?? 'damage') : undefined,
        })),
    })

    if (!parsed.success) {
      toast.error('Please fix the adjustment', {
        description: parsed.error.issues[0]?.message ?? 'Invalid input.',
      })
      return
    }

    try {
      await createAdjustment.mutateAsync(parsed.data)
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
          <DialogTitle>New Stock Adjustment</DialogTitle>
          <DialogDescription>
            Record a manual correction, a damaged/expired write-off, or a
            stocktake count. Created as a draft; apply it to update balances.
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
                <Label>Type</Label>
                <Select
                  value={type}
                  onValueChange={(value) => setType(value as AdjustmentType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='manual'>Manual entry</SelectItem>
                    <SelectItem value='damage'>Damaged / expired</SelectItem>
                    <SelectItem value='stocktake'>Stocktake count</SelectItem>
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
                  placeholder='Search SKU...'
                  className='h-8 w-40'
                />
              </div>
              <div className='space-y-2'>
                {items.map((item, index) => {
                  const diff = discrepancy(item)
                  return (
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
                      <div className='grid gap-1'>
                        <Input
                          type='number'
                          step='any'
                          value={item.qty}
                          onChange={(event) =>
                            updateItem(index, { qty: event.target.value })
                          }
                          placeholder={QTY_LABEL[type]}
                          className='w-32'
                        />
                        {diff !== null ? (
                          <span
                            className={
                              diff === 0
                                ? 'text-xs text-muted-foreground'
                                : diff > 0
                                  ? 'text-xs text-emerald-600'
                                  : 'text-xs text-rose-600'
                            }
                          >
                            Δ {diff > 0 ? '+' : ''}
                            {diff}
                          </span>
                        ) : null}
                      </div>
                      {type === 'damage' ? (
                        <Select
                          value={item.reason ?? 'damage'}
                          onValueChange={(value) =>
                            updateItem(index, {
                              reason: value as AdjustmentReason,
                            })
                          }
                        >
                          <SelectTrigger className='w-32'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DAMAGE_REASONS.map((reason) => (
                              <SelectItem
                                key={reason}
                                value={reason}
                                className='capitalize'
                              >
                                {reason}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
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
                  )
                })}
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
          <Button onClick={handleSubmit} disabled={createAdjustment.isPending}>
            {createAdjustment.isPending ? 'Saving...' : 'Create draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
