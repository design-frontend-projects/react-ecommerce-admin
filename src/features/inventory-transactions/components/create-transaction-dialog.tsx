import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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

const AVAILABLE_TYPE_CODES = [
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'OPENING_BALANCE',
  'DAMAGE_WRITE_OFF',
  'EXPIRY_SCRAP',
  'PURCHASE_RECEIPT',
  'TRANSFER_SHIPMENT',
] as const

const TYPE_DIRECTIONS: Record<string, string> = {
  ADJUSTMENT_IN: 'inbound',
  ADJUSTMENT_OUT: 'outbound',
  OPENING_BALANCE: 'inbound',
  DAMAGE_WRITE_OFF: 'outbound',
  EXPIRY_SCRAP: 'outbound',
  PURCHASE_RECEIPT: 'inbound',
  TRANSFER_SHIPMENT: 'internal',
}

const TYPE_I18N_KEYS: Record<string, string> = {
  ADJUSTMENT_IN: 'inventoryTransactions.createDialog.types.adjustmentIn',
  ADJUSTMENT_OUT: 'inventoryTransactions.createDialog.types.adjustmentOut',
  OPENING_BALANCE: 'inventoryTransactions.createDialog.types.openingBalance',
  DAMAGE_WRITE_OFF: 'inventoryTransactions.createDialog.types.damageWriteOff',
  EXPIRY_SCRAP: 'inventoryTransactions.createDialog.types.expiryScrap',
  PURCHASE_RECEIPT: 'inventoryTransactions.createDialog.types.purchaseReceipt',
  TRANSFER_SHIPMENT: 'inventoryTransactions.createDialog.types.transferShipment',
}

export function CreateTransactionDialog({
  open,
  onOpenChange,
}: CreateTransactionDialogProps) {
  const { t } = useTranslation()
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

  const direction = TYPE_DIRECTIONS[typeCode] ?? 'inbound'
  const isInbound = direction === 'inbound'
  const isOutbound = direction === 'outbound'
  const isInternal = direction === 'internal'

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
            <DialogTitle>{t('inventoryTransactions.createDialog.title')}</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-5 pt-2'>
          {/* Header configuration */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label>{t('inventoryTransactions.createDialog.transactionType')}</Label>
              <Select value={typeCode} onValueChange={setTypeCode}>
                <SelectTrigger>
                  <SelectValue placeholder={t('inventoryTransactions.createDialog.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_TYPE_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {t(TYPE_I18N_KEYS[code])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(isOutbound || isInternal) && (
              <div className='space-y-2'>
                <Label>{t('inventoryTransactions.createDialog.sourceWarehouse')}</Label>
                <Select value={sourceWarehouseId} onValueChange={setSourceWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('inventoryTransactions.createDialog.selectSourceWarehouse')} />
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
                <Label>{t('inventoryTransactions.createDialog.destinationWarehouse')}</Label>
                <Select value={destWarehouseId} onValueChange={setDestWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('inventoryTransactions.createDialog.selectDestWarehouse')} />
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
            <Label>{t('inventoryTransactions.createDialog.remarksNotes')}</Label>
            <Textarea
              placeholder={t('inventoryTransactions.createDialog.remarksPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Line items section */}
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <Label className='text-sm font-semibold'>{t('inventoryTransactions.createDialog.itemsToTransact')}</Label>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleAddItem}
                className='h-8'
              >
                <Plus className='h-3.5 w-3.5 me-1' />
                {t('inventoryTransactions.createDialog.addItem')}
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
                        <SelectValue placeholder={t('inventoryTransactions.createDialog.selectProductVariant')} />
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
                      placeholder={t('inventoryTransactions.createDialog.qty')}
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
                      placeholder={t('inventoryTransactions.createDialog.cost')}
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
              {t('inventoryTransactions.createDialog.autoPostLabel')}
            </Label>
          </div>

          <div className='flex justify-end gap-2 pt-4 border-t'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              {t('inventoryTransactions.createDialog.cancel')}
            </Button>
            <Button
              type='submit'
              disabled={createMutation.isPending}
              className='min-w-[120px]'
            >
              {createMutation.isPending && (
                <Loader2 className='h-4 w-4 animate-spin me-1.5' />
              )}
              {autoPost ? t('inventoryTransactions.createDialog.postTransaction') : t('inventoryTransactions.createDialog.saveDraft')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
