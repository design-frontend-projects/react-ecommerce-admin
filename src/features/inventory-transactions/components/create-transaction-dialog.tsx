import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Loader2, PackagePlus } from 'lucide-react'
import { useCreateInventoryTransaction } from '../hooks/use-inventory-transactions'
import { useWarehouseOptions, useVariantOptions } from '@/hooks/use-inventory-lookups'

interface LineItemState {
  productVariantId: string
  quantity: string
  unitCost: string
  notes: string
}

interface CreateTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const AVAILABLE_TYPES = [
  { code: 'ADJUSTMENT_IN', name: 'Stock Adjustment (Increase)', direction: 'inbound' },
  { code: 'ADJUSTMENT_OUT', name: 'Stock Adjustment (Decrease)', direction: 'outbound' },
  { code: 'OPENING_BALANCE', name: 'Opening Stock Baseline', direction: 'inbound' },
  { code: 'DAMAGE_WRITE_OFF', name: 'Damaged Stock Write-Off', direction: 'outbound' },
  { code: 'EXPIRY_SCRAP', name: 'Expired Stock Scrap', direction: 'outbound' },
  { code: 'PURCHASE_RECEIPT', name: 'Direct Purchase Receipt', direction: 'inbound' },
  { code: 'TRANSFER_SHIPMENT', name: 'Warehouse Transfer Dispatch', direction: 'internal' },
]

export function CreateTransactionDialog({
  open,
  onOpenChange,
}: CreateTransactionDialogProps) {
  const [typeCode, setTypeCode] = useState('ADJUSTMENT_IN')
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>('')
  const [destWarehouseId, setDestWarehouseId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [autoPost, setAutoPost] = useState(true)

  const [items, setItems] = useState<LineItemState[]>([
    { productVariantId: '', quantity: '1', unitCost: '0', notes: '' },
  ])

  const { data: warehouses = [] } = useWarehouseOptions()
  const { data: variants = [] } = useVariantOptions()
  const createMutation = useCreateInventoryTransaction()

  const selectedType = AVAILABLE_TYPES.find((t) => t.code === typeCode)
  const isInbound = selectedType?.direction === 'inbound'
  const isOutbound = selectedType?.direction === 'outbound'
  const isInternal = selectedType?.direction === 'internal'

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { productVariantId: '', quantity: '1', unitCost: '0', notes: '' },
    ])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: keyof LineItemState, value: string) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const preparedItems = items
      .filter((i) => Boolean(i.productVariantId))
      .map((i) => ({
        productVariantId: i.productVariantId,
        quantity: parseFloat(i.quantity) || 1,
        unitCost: parseFloat(i.unitCost) || 0,
        notes: i.notes || undefined,
      }))

    if (preparedItems.length === 0) return

    createMutation.mutate(
      {
        typeCode,
        sourceWarehouseId: sourceWarehouseId || null,
        destWarehouseId: destWarehouseId || null,
        notes: notes || null,
        autoPost,
        items: preparedItems,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          // Reset form
          setItems([{ productVariantId: '', quantity: '1', unitCost: '0', notes: '' }])
          setNotes('')
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-3xl max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <PackagePlus className='h-5 w-5 text-primary' />
            <DialogTitle>New Inventory Transaction</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-5 pt-2'>
          {/* Header configuration */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label>Transaction Type</Label>
              <Select value={typeCode} onValueChange={setTypeCode}>
                <SelectTrigger>
                  <SelectValue placeholder='Select type' />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_TYPES.map((t) => (
                    <SelectItem key={t.code} value={t.code}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(isOutbound || isInternal) && (
              <div className='space-y-2'>
                <Label>Source Warehouse</Label>
                <Select value={sourceWarehouseId} onValueChange={setSourceWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select source warehouse' />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(isInbound || isInternal) && (
              <div className='space-y-2'>
                <Label>Destination Warehouse</Label>
                <Select value={destWarehouseId} onValueChange={setDestWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select destination warehouse' />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className='space-y-2'>
            <Label>Remarks / Notes</Label>
            <Textarea
              placeholder='Optional notes or transaction purpose...'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Line items section */}
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <Label className='text-sm font-semibold'>Items to Transact</Label>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleAddItem}
                className='h-8'
              >
                <Plus className='h-3.5 w-3.5 me-1' />
                Add Item
              </Button>
            </div>

            <div className='space-y-2'>
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className='flex flex-wrap md:flex-nowrap items-center gap-2 p-2.5 rounded-md border bg-muted/20'
                >
                  <div className='flex-1 min-w-[200px]'>
                    <Select
                      value={item.productVariantId}
                      onValueChange={(val) => handleItemChange(idx, 'productVariantId', val)}
                    >
                      <SelectTrigger className='h-9'>
                        <SelectValue placeholder='Select Product Variant' />
                      </SelectTrigger>
                      <SelectContent>
                        {variants.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.sku} — {v.products?.name ?? 'Item'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='w-28'>
                    <Input
                      type='number'
                      step='any'
                      min='0.0001'
                      placeholder='Qty'
                      className='h-9 font-mono'
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      required
                    />
                  </div>

                  <div className='w-28'>
                    <Input
                      type='number'
                      step='any'
                      min='0'
                      placeholder='Cost'
                      className='h-9 font-mono'
                      value={item.unitCost}
                      onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                    />
                  </div>

                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='h-9 w-9 text-muted-foreground hover:text-destructive'
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length <= 1}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className='flex items-center space-x-2 pt-1'>
            <Checkbox
              id='autoPost'
              checked={autoPost}
              onCheckedChange={(checked) => setAutoPost(Boolean(checked))}
            />
            <Label htmlFor='autoPost' className='text-sm font-normal cursor-pointer'>
              Post immediately (apply stock mutations now). If unchecked, saves as Draft.
            </Label>
          </div>

          <div className='flex justify-end gap-2 pt-4 border-t'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={createMutation.isPending}
              className='min-w-[120px]'
            >
              {createMutation.isPending && (
                <Loader2 className='h-4 w-4 animate-spin me-1.5' />
              )}
              {autoPost ? 'Post Transaction' : 'Save Draft'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
