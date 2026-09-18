import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, ShoppingCart, CheckCircle2, Package } from 'lucide-react'
import { toast } from 'sonner'
import {
  useWarehouseOptions,
  useStoreOptions,
  useSupplierOptions,
  useVariantOptions,
} from '@/hooks/use-inventory-lookups'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import { createReceiptInputSchema, type ReceivablePurchaseOrder } from '../data/schema'
import { useCreateReceipt, useReceivablePurchaseOrders } from '../hooks/use-goods-receipts'

interface LineItem {
  purchaseOrderItemId?: string | null
  productVariantId: string
  productName?: string
  sku?: string
  orderedQty?: number
  alreadyReceivedQty?: number
  outstandingQty?: number
  qtyReceived: string
  acceptedQty: string
  rejectedQty: string
  rejectionReason: string
  unitCost: string
  batchNumber: string
  expiryDate: string
  serials: string
}

const emptyItem: LineItem = {
  purchaseOrderItemId: null,
  productVariantId: '',
  qtyReceived: '',
  acceptedQty: '',
  rejectedQty: '0',
  rejectionReason: '',
  unitCost: '',
  batchNumber: '',
  expiryDate: '',
  serials: '',
}

const NO_PO = 'none'
const NO_SUPPLIER = 'none'

export function ReceiptCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const [selectedPoId, setSelectedPoId] = useState(NO_PO)
  const [warehouseId, setWarehouseId] = useState('')
  const [supplierId, setSupplierId] = useState(NO_SUPPLIER)
  const [notes, setNotes] = useState('')
  const [autoPost, setAutoPost] = useState(true)
  const [items, setItems] = useState<LineItem[]>([{ ...emptyItem }])
  const [search, setSearch] = useState('')

  const { data: warehouses = [] } = useWarehouseOptions()
  const { data: stores = [] } = useStoreOptions()
  const { data: suppliers = [] } = useSupplierOptions()
  const { data: variants = [] } = useVariantOptions(search)
  const { data: receivablePos = [], isLoading: isLoadingPos } = useReceivablePurchaseOrders()
  const createReceipt = useCreateReceipt()

  const locationOptions =
    warehouses.length > 0
      ? warehouses.map((w) => ({ id: w.id, name: `${w.name} (${w.code})` }))
      : stores.map((s) => ({ id: s.store_id, name: s.name ?? s.store_id }))

  const reset = () => {
    setSelectedPoId(NO_PO)
    setWarehouseId('')
    setSupplierId(NO_SUPPLIER)
    setNotes('')
    setAutoPost(true)
    setItems([{ ...emptyItem }])
    setSearch('')
  }

  // Handle PO Selection: Pre-populate supplier, warehouse, and receivable items
  const handlePoChange = (poId: string) => {
    setSelectedPoId(poId)
    if (poId === NO_PO) {
      setItems([{ ...emptyItem }])
      return
    }

    const po = receivablePos.find((p: ReceivablePurchaseOrder) => p.id === poId)
    if (!po) return

    if (po.warehouse_id) {
      setWarehouseId(po.warehouse_id)
    }
    if (po.supplier_id) {
      setSupplierId(po.supplier_id)
    }

    // Populate items from PO
    const newItems: LineItem[] = po.purchase_order_items.map((item) => {
      const variantId = item.product_variant_id || item.product_variants?.id || ''
      const outstanding = item.outstanding_qty || 0
      return {
        purchaseOrderItemId: item.id,
        productVariantId: variantId,
        productName: item.products?.name ?? item.product_variants?.sku ?? '',
        sku: item.product_variants?.sku ?? item.products?.sku ?? '',
        orderedQty: item.quantity_ordered,
        alreadyReceivedQty: Number(item.received_quantity) || 0,
        outstandingQty: outstanding,
        qtyReceived: String(outstanding),
        acceptedQty: String(outstanding),
        rejectedQty: '0',
        rejectionReason: '',
        unitCost: String(item.unit_cost || '0'),
        batchNumber: '',
        expiryDate: '',
        serials: '',
      }
    })

    setItems(newItems.length > 0 ? newItems : [{ ...emptyItem }])
  }

  const updateItem = (index: number, patch: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        const updated = { ...item, ...patch }

        // If qtyReceived changes and user hasn't explicitly set acceptedQty, sync them
        if (patch.qtyReceived !== undefined) {
          const num = Number(patch.qtyReceived) || 0
          const rej = Number(updated.rejectedQty) || 0
          updated.acceptedQty = String(Math.max(0, num - rej))
        }

        // If rejectedQty changes, adjust acceptedQty accordingly
        if (patch.rejectedQty !== undefined) {
          const num = Number(updated.qtyReceived) || 0
          const rej = Number(patch.rejectedQty) || 0
          updated.acceptedQty = String(Math.max(0, num - rej))
        }

        return updated
      })
    )
  }

  const addItem = () => {
    setItems((prev) => [...prev, { ...emptyItem }])
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!warehouseId) {
      toast.error(
        t('goodsReceipts.validation.warehouseRequired', {
          defaultValue: 'Please select a destination warehouse.',
        })
      )
      return
    }

    // Filter valid items
    const validItems = items.filter(
      (item) => item.productVariantId && item.qtyReceived !== '' && Number(item.qtyReceived) > 0
    )

    if (validItems.length === 0) {
      toast.error(
        t('goodsReceipts.validation.atLeastOneItem', {
          defaultValue: 'Please enter a received quantity for at least one item.',
        })
      )
      return
    }

    // Validation: check outstanding qty limits for PO items
    for (const item of validItems) {
      const qty = Number(item.qtyReceived)
      if (item.outstandingQty !== undefined && qty > item.outstandingQty) {
        toast.error(
          t('goodsReceipts.validation.qtyExceedsOutstanding', {
            defaultValue: `Receiving quantity (${qty}) cannot exceed outstanding quantity (${item.outstandingQty}) for ${item.productName || item.sku || 'item'}.`,
            max: item.outstandingQty,
          })
        )
        return
      }

      const accepted = Number(item.acceptedQty || 0)
      const rejected = Number(item.rejectedQty || 0)
      if (accepted + rejected !== qty) {
        toast.error(
          t('goodsReceipts.validation.acceptedPlusRejected', {
            defaultValue: `Accepted (${accepted}) + Rejected (${rejected}) must equal Received quantity (${qty}).`,
          })
        )
        return
      }
    }

    const parsed = createReceiptInputSchema.safeParse({
      warehouseId: warehouseId || undefined,
      storeId: undefined,
      purchaseOrderId: selectedPoId === NO_PO ? undefined : selectedPoId,
      supplierId: supplierId === NO_SUPPLIER ? undefined : supplierId,
      notes: notes || undefined,
      autoPost,
      items: validItems.map((item) => {
        const serialNumbers = item.serials
          .split('\n')
          .map((serial) => serial.trim())
          .filter(Boolean)
        const qty = Number(item.qtyReceived)
        const accepted = item.acceptedQty ? Number(item.acceptedQty) : qty
        const rejected = item.rejectedQty ? Number(item.rejectedQty) : 0
        return {
          purchaseOrderItemId: item.purchaseOrderItemId || undefined,
          productVariantId: item.productVariantId,
          qtyReceived: qty,
          acceptedQty: accepted,
          rejectedQty: rejected,
          rejectionReason: item.rejectionReason || undefined,
          unitCost: item.unitCost === '' ? undefined : Number(item.unitCost),
          batchNumber: item.batchNumber || undefined,
          expiryDate: item.expiryDate || undefined,
          serialNumbers: serialNumbers.length > 0 ? serialNumbers : undefined,
        }
      }),
    })

    if (!parsed.success) {
      toast.error(
        t('goodsReceipts.toast.error', { defaultValue: 'Please fix the receipt' }),
        {
          description: parsed.error.issues[0]?.message ?? 'Invalid input.',
        }
      )
      return
    }

    try {
      await createReceipt.mutateAsync(parsed.data)
      reset()
      onOpenChange(false)
    } catch {
      /* Handled by mutation onError toast */
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
      <DialogContent className='sm:max-w-4xl max-h-[90vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-xl'>
            <Package className='h-5 w-5 text-primary' />
            {t('goodsReceipts.dialog.createTitle', { defaultValue: 'New Goods Receipt' })}
          </DialogTitle>
          <DialogDescription>
            {t('goodsReceipts.dialog.createDesc', {
              defaultValue:
                'Receive items into warehouse. Connect to purchase orders, track inspection metrics, and update inventory balances.',
            })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className='flex-1 pe-4'>
          <div className='grid gap-5 py-2'>
            {/* Top Bar: PO Selector and Auto-Post Toggle */}
            <div className='rounded-lg border bg-muted/30 p-4 space-y-3'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='flex-1 min-w-[280px]'>
                  <Label className='text-sm font-semibold flex items-center gap-1.5 mb-1.5'>
                    <ShoppingCart className='h-4 w-4 text-primary' />
                    {t('goodsReceipts.receiveFromPo', { defaultValue: 'Receive from Purchase Order' })}
                  </Label>
                  <Select value={selectedPoId} onValueChange={handlePoChange} disabled={isLoadingPos}>
                    <SelectTrigger className='bg-background'>
                      <SelectValue placeholder={t('goodsReceipts.selectPo', { defaultValue: 'Select Purchase Order...' })} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PO}>
                        {t('goodsReceipts.manualReceipt', { defaultValue: 'Manual Receipt (Without PO)' })}
                      </SelectItem>
                      {receivablePos.map((po: ReceivablePurchaseOrder) => {
                        const count = po.purchase_order_items.length
                        const poNumStr = po.po_number ? `PO #${po.po_number}` : `PO-${po.id.slice(0, 8)}`
                        const supplierName = po.suppliers?.name ? ` — ${po.suppliers.name}` : ''
                        return (
                          <SelectItem key={po.id} value={po.id}>
                            {poNumStr} {supplierName} ({count} {count === 1 ? 'item' : 'items'} pending)
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className='flex items-center space-x-3 rounded-md border bg-background p-2.5 px-3'>
                  <Switch
                    id='auto-post-switch'
                    checked={autoPost}
                    onCheckedChange={setAutoPost}
                  />
                  <div className='space-y-0.5'>
                    <Label htmlFor='auto-post-switch' className='text-xs font-semibold cursor-pointer flex items-center gap-1'>
                      <CheckCircle2 className='h-3.5 w-3.5 text-emerald-500' />
                      {t('goodsReceipts.autoPostLabel', { defaultValue: 'Post immediately to inventory' })}
                    </Label>
                    <p className='text-[11px] text-muted-foreground'>
                      {t('goodsReceipts.autoPostDesc', { defaultValue: 'Updates stock balance & PO lifecycle' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Header Fields: Warehouse, Supplier, Notes */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-medium'>
                  {t('goodsReceipts.form.warehouse', { defaultValue: 'Destination Warehouse' })} *
                </Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('goodsReceipts.form.selectWarehouse', { defaultValue: 'Select warehouse' })} />
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

              <div className='space-y-1.5'>
                <Label className='text-xs font-medium'>
                  {t('goodsReceipts.columns.supplier', { defaultValue: 'Supplier' })}
                </Label>
                <Select
                  value={supplierId}
                  onValueChange={setSupplierId}
                  disabled={selectedPoId !== NO_PO}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('goodsReceipts.noSupplier', { defaultValue: 'No supplier' })} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SUPPLIER}>
                      {t('goodsReceipts.noSupplier', { defaultValue: 'No supplier' })}
                    </SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items Header & Search */}
            <div className='space-y-3'>
              <div className='flex items-center justify-between border-b pb-2'>
                <div className='flex items-center gap-2'>
                  <Label className='font-semibold text-sm'>
                    {t('goodsReceipts.items', { defaultValue: 'Receipt Items' })} ({items.length})
                  </Label>
                  {selectedPoId !== NO_PO && (
                    <Badge variant='outline' className='text-xs bg-primary/5 text-primary border-primary/20'>
                      {t('goodsReceipts.linkedToPo', { defaultValue: 'Linked to PO' })}
                    </Badge>
                  )}
                </div>
                {selectedPoId === NO_PO && (
                  <div className='flex items-center gap-2'>
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t('goodsReceipts.searchVariant', { defaultValue: 'Filter variants...' })}
                      className='h-8 w-40 text-xs'
                    />
                    <Button type='button' variant='outline' size='sm' onClick={addItem} className='h-8 text-xs'>
                      <Plus className='h-3.5 w-3.5 me-1' />
                      {t('goodsReceipts.addItem', { defaultValue: 'Add Item' })}
                    </Button>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className='space-y-3'>
                {items.map((item, index) => {
                  const isPoItem = Boolean(item.purchaseOrderItemId)
                  return (
                    <div
                      key={index}
                      className='rounded-lg border bg-card p-3.5 shadow-xs space-y-3 transition-colors hover:border-primary/40'
                    >
                      {/* Item Title and Badges */}
                      <div className='flex flex-wrap items-center justify-between gap-2 border-b border-dashed pb-2'>
                        <div className='flex-1 min-w-[200px]'>
                          {isPoItem ? (
                            <div className='space-y-0.5'>
                              <div className='font-medium text-sm text-foreground flex items-center gap-2'>
                                <span>{item.productName || item.sku}</span>
                                {item.sku && item.productName && (
                                  <Badge variant='secondary' className='text-[10px] font-mono'>
                                    {item.sku}
                                  </Badge>
                                )}
                              </div>
                              <div className='flex items-center gap-3 text-xs text-muted-foreground'>
                                <span>
                                  {t('goodsReceipts.orderedQty', { defaultValue: 'Ordered' })}: <strong>{item.orderedQty}</strong>
                                </span>
                                <span>
                                  {t('goodsReceipts.receivedQty', { defaultValue: 'Received' })}: <strong>{item.alreadyReceivedQty}</strong>
                                </span>
                                <span className='text-primary font-medium'>
                                  {t('goodsReceipts.outstandingQty', { defaultValue: 'Outstanding' })}: <strong>{item.outstandingQty}</strong>
                                </span>
                              </div>
                            </div>
                          ) : (
                            <Select
                              value={item.productVariantId}
                              onValueChange={(val) => {
                                const variant = variants.find((v) => v.id === val)
                                updateItem(index, {
                                  productVariantId: val,
                                  sku: variant?.sku,
                                  productName: variant?.products?.name ?? variant?.sku,
                                })
                              }}
                            >
                              <SelectTrigger className='h-9 text-xs'>
                                <SelectValue placeholder={t('goodsReceipts.selectVariant', { defaultValue: 'Select product variant' })} />
                              </SelectTrigger>
                              <SelectContent>
                                {variants.map((v) => (
                                  <SelectItem key={v.id} value={v.id}>
                                    {v.sku} {v.products?.name ? `— ${v.products.name}` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        {selectedPoId === NO_PO && items.length > 1 && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => removeItem(index)}
                            className='h-8 w-8 p-0 text-muted-foreground hover:text-destructive'
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        )}
                      </div>

                      {/* Quantities & Cost Grid */}
                      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                        <div className='space-y-1'>
                          <Label className='text-[11px] font-medium text-muted-foreground'>
                            {t('goodsReceipts.receivingQty', { defaultValue: 'Receiving Qty' })} *
                          </Label>
                          <Input
                            type='number'
                            step='any'
                            min={0}
                            max={item.outstandingQty ?? undefined}
                            value={item.qtyReceived}
                            onChange={(e) => updateItem(index, { qtyReceived: e.target.value })}
                            className='h-8 text-xs font-semibold'
                            placeholder='0'
                          />
                        </div>

                        <div className='space-y-1'>
                          <Label className='text-[11px] font-medium text-emerald-600 dark:text-emerald-400'>
                            {t('goodsReceipts.acceptedQty', { defaultValue: 'Accepted Qty' })}
                          </Label>
                          <Input
                            type='number'
                            step='any'
                            min={0}
                            value={item.acceptedQty}
                            onChange={(e) => updateItem(index, { acceptedQty: e.target.value })}
                            className='h-8 text-xs border-emerald-300 dark:border-emerald-800'
                            placeholder='0'
                          />
                        </div>

                        <div className='space-y-1'>
                          <Label className='text-[11px] font-medium text-rose-600 dark:text-rose-400'>
                            {t('goodsReceipts.rejectedQty', { defaultValue: 'Rejected Qty' })}
                          </Label>
                          <Input
                            type='number'
                            step='any'
                            min={0}
                            value={item.rejectedQty}
                            onChange={(e) => updateItem(index, { rejectedQty: e.target.value })}
                            className='h-8 text-xs border-rose-300 dark:border-rose-800'
                            placeholder='0'
                          />
                        </div>

                        <div className='space-y-1'>
                          <Label className='text-[11px] font-medium text-muted-foreground'>
                            {t('goodsReceipts.unitCost', { defaultValue: 'Unit Cost' })}
                          </Label>
                          <Input
                            type='number'
                            step='any'
                            min={0}
                            value={item.unitCost}
                            onChange={(e) => updateItem(index, { unitCost: e.target.value })}
                            className='h-8 text-xs'
                            placeholder='0.00'
                          />
                        </div>
                      </div>

                      {/* Optional Batch, Expiry, Rejection Reason */}
                      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-dashed'>
                        <div className='space-y-1'>
                          <Label className='text-[11px] text-muted-foreground'>
                            {t('goodsReceipts.batchNumber', { defaultValue: 'Batch / Lot #' })}
                          </Label>
                          <Input
                            value={item.batchNumber}
                            onChange={(e) => updateItem(index, { batchNumber: e.target.value })}
                            placeholder='e.g. LOT-2026-A'
                            className='h-8 text-xs'
                          />
                        </div>

                        <div className='space-y-1'>
                          <Label className='text-[11px] text-muted-foreground'>
                            {t('goodsReceipts.expiryDate', { defaultValue: 'Expiry Date' })}
                          </Label>
                          <Input
                            type='date'
                            value={item.expiryDate}
                            onChange={(e) => updateItem(index, { expiryDate: e.target.value })}
                            className='h-8 text-xs'
                          />
                        </div>

                        {Number(item.rejectedQty) > 0 ? (
                          <div className='space-y-1'>
                            <Label className='text-[11px] text-rose-500'>
                              {t('goodsReceipts.rejectionReason', { defaultValue: 'Rejection Reason' })}
                            </Label>
                            <Input
                              value={item.rejectionReason}
                              onChange={(e) => updateItem(index, { rejectionReason: e.target.value })}
                              placeholder='e.g. Damaged during transit'
                              className='h-8 text-xs border-rose-300'
                            />
                          </div>
                        ) : (
                          <div className='space-y-1'>
                            <Label className='text-[11px] text-muted-foreground'>
                              {t('goodsReceipts.serials', { defaultValue: 'Serials (optional)' })}
                            </Label>
                            <Input
                              value={item.serials}
                              onChange={(e) => updateItem(index, { serials: e.target.value })}
                              placeholder='SN1, SN2...'
                              className='h-8 text-xs'
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Notes */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium'>
                {t('goodsReceipts.form.notes', { defaultValue: 'Notes / Remarks' })}
              </Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('goodsReceipts.notesPlaceholder', {
                  defaultValue: 'Inspection comments, delivery note number, carrier information...',
                })}
                className='text-xs'
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className='border-t pt-3'>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              reset()
              onOpenChange(false)
            }}
          >
            {t('goodsReceipts.form.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            type='button'
            onClick={handleSubmit}
            disabled={createReceipt.isPending}
            className='gap-1.5'
          >
            {autoPost ? (
              <>
                <CheckCircle2 className='h-4 w-4' />
                {t('goodsReceipts.createAndPost', { defaultValue: 'Receive & Post Stock' })}
              </>
            ) : (
              <>
                <Package className='h-4 w-4' />
                {t('goodsReceipts.saveDraft', { defaultValue: 'Save as Draft' })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
