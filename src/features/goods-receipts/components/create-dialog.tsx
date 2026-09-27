import { useState, useMemo, useEffect } from 'react'
import {
  ShoppingCart,
  CheckCircle2,
  Package,
  AlertCircle,
  Search,
  ScanBarcode,
  History,
  MapPin,
  Building2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Settings2,
  Hash,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useWarehouseOptions } from '@/hooks/use-inventory-lookups'
import { Badge } from '@/components/ui/badge'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { PoReceivingDetails, PoReceivingItem } from '../data/schema'
import {
  useCreateReceipt,
  usePoReceivingDetails,
  useReceivablePoSearch,
  useWarehouseLocations,
} from '../hooks/use-goods-receipts'
import {
  generateSerials,
  generateDefaultSerialsForProduct,
} from '../utils/serial-generator'
import { SerialGeneratorDialog } from './serial-generator-dialog'

interface ReceivingLineItem {
  purchaseOrderItemId: string
  productVariantId: string
  productName: string
  variantName?: string | null
  sku: string
  barcode?: string | null
  uomName?: string
  orderedQty: number
  previouslyReceivedQty: number
  remainingQty: number
  qtyReceived: string
  acceptedQty: string
  rejectedQty: string
  rejectionReason: string
  condition: string
  unitCost: string
  warehouseLocationId: string
  batchMode: 'existing' | 'new' | 'none'
  batchId: string
  batchNumber: string
  expiryDate: string
  serialsText: string
  isBatchTracked: boolean
  isSerialTracked: boolean
  hasExpiration: boolean
  availableBatches: Array<{
    id: string
    batch_number: string
    expiry_date?: string | null
  }>
}

function PoReceivingForm({
  poDetails,
  warehouses,
  autoPost,
  onClose,
}: {
  poDetails: PoReceivingDetails
  warehouses: Array<{ id: string; name: string; code: string }>
  autoPost: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const createReceipt = useCreateReceipt()

  const [warehouseId, setWarehouseId] = useState(
    poDetails.header.warehouse?.id || ''
  )
  const [notes, setNotes] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [itemFilterQuery, setItemFilterQuery] = useState('')
  const [itemStatusFilter, setItemStatusFilter] = useState<
    'all' | 'remaining' | 'partially_received' | 'fully_received'
  >('remaining')
  const [showPoDetailsPanel, setShowPoDetailsPanel] = useState(true)
  const [activeGeneratorItemIndex, setActiveGeneratorItemIndex] = useState<
    number | null
  >(null)

  const [items, setItems] = useState<ReceivingLineItem[]>(() => {
    return poDetails.items.map((item: PoReceivingItem) => {
      const remaining = item.remaining_quantity
      const receiveDefault = remaining > 0 ? String(remaining) : '0'

      return {
        purchaseOrderItemId: item.id,
        productVariantId: item.product_variant_id,
        productName: item.product_name,
        variantName: item.variant_name,
        sku: item.sku,
        barcode: item.barcode,
        uomName: item.uom?.name || item.uom?.code || 'Unit',
        orderedQty: item.quantity_ordered,
        previouslyReceivedQty: item.previously_received_qty,
        remainingQty: remaining,
        qtyReceived: receiveDefault,
        acceptedQty: receiveDefault,
        rejectedQty: '0',
        rejectionReason: '',
        condition: 'good',
        unitCost: String(item.unit_cost || '0'),
        warehouseLocationId: '',
        batchMode: item.is_batch_tracked
          ? item.available_batches.length > 0
            ? 'existing'
            : 'new'
          : 'none',
        batchId: item.available_batches[0]?.id || '',
        batchNumber: '',
        expiryDate: '',
        serialsText: '',
        isBatchTracked: item.is_batch_tracked,
        isSerialTracked: item.is_serial_tracked,
        hasExpiration: item.has_expiration,
        availableBatches: item.available_batches,
      }
    })
  })

  const { data: locations = [] } = useWarehouseLocations(warehouseId)

  // Handle item update
  const updateItem = (index: number, patch: Partial<ReceivingLineItem>) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        const updated = { ...item, ...patch }

        // Sync accepted when qtyReceived changes
        if (patch.qtyReceived !== undefined) {
          const num = Number(patch.qtyReceived) || 0
          const rej = Number(updated.rejectedQty) || 0
          updated.acceptedQty = String(Math.max(0, num - rej))
        }

        // Adjust rejected if accepted changes
        if (patch.acceptedQty !== undefined) {
          const num = Number(updated.qtyReceived) || 0
          const acc = Number(patch.acceptedQty) || 0
          updated.rejectedQty = String(Math.max(0, num - acc))
        }

        // Adjust accepted if rejected changes
        if (patch.rejectedQty !== undefined) {
          const num = Number(updated.qtyReceived) || 0
          const rej = Number(patch.rejectedQty) || 0
          updated.acceptedQty = String(Math.max(0, num - rej))
        }

        return updated
      })
    )
  }

  // Handle Barcode Scan
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const code = barcodeInput.trim().toLowerCase()
    if (!code) return

    const matchedIndex = items.findIndex(
      (it) =>
        (it.barcode && it.barcode.toLowerCase() === code) ||
        (it.sku && it.sku.toLowerCase() === code)
    )

    if (matchedIndex === -1) {
      toast.error(`No PO line matching barcode/SKU "${barcodeInput}" found.`)
      return
    }

    const matched = items[matchedIndex]
    const currentQty = Number(matched.qtyReceived) || 0
    if (currentQty >= matched.remainingQty) {
      toast.warning(
        `Item "${matched.productName}" is already at full remaining quantity (${matched.remainingQty}).`
      )
      return
    }

    const newQty = String(currentQty + 1)
    updateItem(matchedIndex, { qtyReceived: newQty })
    toast.success(`Incremented "${matched.productName}" to ${newQty}.`)
    setBarcodeInput('')
  }

  // Active item for custom serial generator modal
  const activeGeneratorItem =
    activeGeneratorItemIndex !== null && items[activeGeneratorItemIndex]
      ? items[activeGeneratorItemIndex]
      : null

  // 1-Click quick generate serials based on product name for a single item
  const handleQuickGenerateSerials = (index: number) => {
    const item = items[index]
    const acceptedNum = Number(item.acceptedQty || 0)
    if (acceptedNum <= 0) {
      toast.warning(
        `Please enter an accepted quantity greater than 0 for "${item.productName}" before generating serials.`
      )
      return
    }

    // Collect all serials already used in other lines to guarantee no cross-item collision
    const otherLinesSerials = items
      .filter((_, i) => i !== index)
      .flatMap((it) =>
        it.serialsText
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      )

    const generated = generateDefaultSerialsForProduct(
      item.productName,
      acceptedNum,
      otherLinesSerials
    )

    updateItem(index, { serialsText: generated.join('\n') })
    toast.success(
      `Generated ${generated.length} serial numbers for "${item.productName}" based on product name.`
    )
  }

  // Bulk generate missing serials across all serial-tracked lines
  const handleAutoGenerateAllMissingSerials = () => {
    let generatedTotal = 0
    let updatedLinesCount = 0

    setItems((prevItems) => {
      const currentUsed = new Set<string>()

      // Gather serials from lines that already have valid serial counts
      prevItems.forEach((it) => {
        const acc = Number(it.acceptedQty || 0)
        const entered = it.serialsText
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
        if (!it.isSerialTracked || acc <= 0 || entered.length === acc) {
          entered.forEach((s) => currentUsed.add(s.toUpperCase()))
        }
      })

      return prevItems.map((it) => {
        const acc = Number(it.acceptedQty || 0)
        if (!it.isSerialTracked || acc <= 0) return it

        const entered = it.serialsText
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
        if (entered.length === acc) return it

        const missing = acc - entered.length
        const needed = missing > 0 ? missing : acc
        const shouldAppend = entered.length > 0 && missing > 0

        const generated = generateSerials({
          productName: it.productName,
          count: needed,
          existingSerials: Array.from(currentUsed),
        })

        generated.forEach((s) => currentUsed.add(s.toUpperCase()))
        generatedTotal += generated.length
        updatedLinesCount++

        const newSerials = shouldAppend ? [...entered, ...generated] : generated
        return {
          ...it,
          serialsText: newSerials.join('\n'),
        }
      })
    })

    if (updatedLinesCount > 0) {
      toast.success(
        `Auto-generated ${generatedTotal} serial numbers across ${updatedLinesCount} item(s) using their product names.`
      )
    } else {
      toast.info(
        'All serial-tracked items already have required serial numbers.'
      )
    }
  }

  // Handle applying serials from custom dialog
  const handleApplySerialsFromDialog = (
    serials: string[],
    mode: 'replace' | 'append'
  ) => {
    if (activeGeneratorItemIndex === null) return
    const item = items[activeGeneratorItemIndex]
    const existing = item.serialsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const finalSerials = mode === 'append' ? [...existing, ...serials] : serials
    updateItem(activeGeneratorItemIndex, {
      serialsText: finalSerials.join('\n'),
    })
  }

  // Filtered Items for display
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Status filter
      if (itemStatusFilter === 'remaining' && item.remainingQty <= 0)
        return false
      if (
        itemStatusFilter === 'partially_received' &&
        (item.previouslyReceivedQty === 0 || item.remainingQty === 0)
      )
        return false
      if (itemStatusFilter === 'fully_received' && item.remainingQty > 0)
        return false

      // Text query
      if (itemFilterQuery.trim()) {
        const q = itemFilterQuery.toLowerCase()
        const nameMatch = item.productName.toLowerCase().includes(q)
        const skuMatch = item.sku.toLowerCase().includes(q)
        const barcodeMatch = item.barcode
          ? item.barcode.toLowerCase().includes(q)
          : false
        if (!nameMatch && !skuMatch && !barcodeMatch) return false
      }

      return true
    })
  }, [items, itemFilterQuery, itemStatusFilter])

  // Calculated totals
  const totalReceived = items.reduce(
    (acc, it) => acc + (Number(it.qtyReceived) || 0),
    0
  )
  const totalAccepted = items.reduce(
    (acc, it) => acc + (Number(it.acceptedQty) || 0),
    0
  )
  const totalRejected = items.reduce(
    (acc, it) => acc + (Number(it.rejectedQty) || 0),
    0
  )
  const isAllRejected =
    totalReceived > 0 && totalAccepted === 0 && totalRejected > 0

  // Submission handler
  const handleSubmit = async () => {
    if (!warehouseId) {
      toast.error('Please select a destination warehouse.')
      return
    }

    const receivingLines = items.filter(
      (item) => item.qtyReceived !== '' && Number(item.qtyReceived) > 0
    )

    if (receivingLines.length === 0) {
      toast.error(
        'Please specify a received quantity > 0 for at least one item.'
      )
      return
    }

    for (const item of receivingLines) {
      const qty = Number(item.qtyReceived)
      const accepted = Number(item.acceptedQty || 0)
      const rejected = Number(item.rejectedQty || 0)

      if (qty > item.remainingQty) {
        toast.error(
          `Receiving quantity (${qty}) exceeds remaining quantity (${item.remainingQty}) for "${item.productName}". Over-receiving is not permitted.`
        )
        return
      }

      if (accepted + rejected !== qty) {
        toast.error(
          `Accepted (${accepted}) + Rejected (${rejected}) must equal Received quantity (${qty}) for "${item.productName}".`
        )
        return
      }

      if (item.isBatchTracked) {
        if (item.batchMode === 'existing' && !item.batchId) {
          toast.error(
            `Please select an existing batch for "${item.productName}".`
          )
          return
        }
        if (item.batchMode === 'new') {
          if (!item.batchNumber.trim()) {
            toast.error(
              `Please enter a batch number for "${item.productName}".`
            )
            return
          }
          if (item.hasExpiration) {
            if (!item.expiryDate) {
              toast.error(
                `Expiration date is required for batch "${item.batchNumber}".`
              )
              return
            }
            const exp = new Date(item.expiryDate)
            if (exp <= new Date()) {
              toast.error(
                `Expiration date for batch "${item.batchNumber}" must be in the future.`
              )
              return
            }
          }
        }
      }

      if (item.isSerialTracked && accepted > 0) {
        const serials = item.serialsText
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean)

        if (serials.length !== accepted) {
          toast.error(
            `"${item.productName}" requires exactly ${accepted} serial number(s) for accepted quantity. Currently entered: ${serials.length}.`
          )
          return
        }

        const uniqueSerials = new Set(serials)
        if (uniqueSerials.size !== serials.length) {
          toast.error(
            `Duplicate serial numbers found for "${item.productName}".`
          )
          return
        }
      }
    }

    const payload = {
      purchaseOrderId: poDetails.header.id,
      warehouseId,
      notes: notes || undefined,
      autoPost,
      items: receivingLines.map((item) => {
        const serials = item.serialsText
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean)

        return {
          purchaseOrderItemId: item.purchaseOrderItemId,
          productVariantId: item.productVariantId,
          qtyReceived: Number(item.qtyReceived),
          acceptedQty: Number(item.acceptedQty || 0),
          rejectedQty: Number(item.rejectedQty || 0),
          rejectionReason:
            Number(item.rejectedQty) > 0
              ? item.rejectionReason || 'Inspection failure'
              : null,
          condition: item.condition,
          unitCost: item.unitCost !== '' ? Number(item.unitCost) : undefined,
          warehouseLocationId: item.warehouseLocationId || null,
          batchId: item.batchMode === 'existing' ? item.batchId : null,
          batchNumber:
            item.batchMode === 'new' ? item.batchNumber.trim() : null,
          expiryDate:
            item.batchMode === 'new' && item.expiryDate
              ? item.expiryDate
              : null,
          serials: serials.length > 0 ? serials : undefined,
        }
      }),
    }

    try {
      await createReceipt.mutateAsync(payload)
      onClose()
    } catch {
      // Toast handled by mutation
    }
  }

  return (
    <div className='space-y-4'>
      {/* PO Header & Details Summary Side Panel */}
      <div className='overflow-hidden rounded-lg border bg-muted/20'>
        <div
          className='flex cursor-pointer items-center justify-between bg-muted/40 p-3 px-4 select-none'
          onClick={() => setShowPoDetailsPanel(!showPoDetailsPanel)}
        >
          <div className='flex items-center gap-2'>
            <Building2 className='h-4 w-4 text-primary' />
            <span className='text-sm font-semibold'>
              PO Summary:{' '}
              {poDetails.header.po_number
                ? `PO #${poDetails.header.po_number}`
                : poDetails.header.id.slice(0, 8)}
            </span>
            <Badge variant='secondary' className='text-xs capitalize'>
              {poDetails.header.lifecycle_status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <div className='flex items-center gap-3 text-xs text-muted-foreground'>
            <span>
              Ordered: <strong>{poDetails.summary.ordered_quantity}</strong>
            </span>
            <span>
              Received:{' '}
              <strong className='text-emerald-600'>
                {poDetails.summary.received_quantity}
              </strong>
            </span>
            <span>
              Remaining:{' '}
              <strong className='text-primary'>
                {poDetails.summary.remaining_quantity}
              </strong>
            </span>
            {showPoDetailsPanel ? (
              <ChevronUp className='h-4 w-4' />
            ) : (
              <ChevronDown className='h-4 w-4' />
            )}
          </div>
        </div>

        {showPoDetailsPanel && (
          <div className='space-y-4 border-t p-4'>
            <div className='grid grid-cols-2 gap-3 text-xs sm:grid-cols-4'>
              <div>
                <span className='text-muted-foreground'>Supplier:</span>
                <p className='font-semibold text-foreground'>
                  {poDetails.header.supplier?.name || '—'}
                </p>
              </div>
              <div>
                <span className='text-muted-foreground'>Order Date:</span>
                <p className='font-semibold text-foreground'>
                  {poDetails.header.order_date
                    ? new Date(poDetails.header.order_date).toLocaleDateString()
                    : '—'}
                </p>
              </div>
              <div>
                <span className='text-muted-foreground'>
                  Expected Delivery:
                </span>
                <p className='font-semibold text-foreground'>
                  {poDetails.header.expected_delivery_date
                    ? new Date(
                        poDetails.header.expected_delivery_date
                      ).toLocaleDateString()
                    : '—'}
                </p>
              </div>
              <div>
                <span className='text-muted-foreground'>PO Total:</span>
                <p className='font-mono font-semibold text-foreground'>
                  {poDetails.summary.po_total.toLocaleString()}{' '}
                  {poDetails.header.currency}
                </p>
              </div>
            </div>

            {/* Previous Receipts History */}
            {poDetails.receipts_history?.length > 0 && (
              <div className='space-y-2 rounded-md border bg-background/80 p-3'>
                <div className='flex items-center gap-1.5 text-xs font-semibold text-muted-foreground'>
                  <History className='h-3.5 w-3.5' />
                  Previous Goods Receipts for this Order (
                  {poDetails.receipts_history.length})
                </div>
                <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                  {poDetails.receipts_history.map((hist) => (
                    <div
                      key={hist.id}
                      className='flex items-center justify-between rounded border bg-card p-2 text-xs'
                    >
                      <div>
                        <span className='font-mono font-bold'>
                          {hist.receipt_number}
                        </span>
                        <span className='ms-2 text-muted-foreground'>
                          {hist.received_date
                            ? new Date(hist.received_date).toLocaleDateString()
                            : ''}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Badge
                          variant='outline'
                          className='text-[10px] capitalize'
                        >
                          {hist.status}
                        </Badge>
                        <span className='font-medium text-emerald-600'>
                          +{hist.accepted_quantity} units
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Destination Warehouse & Fast-Scanner */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <div className='space-y-1.5'>
          <Label className='flex items-center gap-1.5 text-xs font-medium'>
            <MapPin className='h-3.5 w-3.5 text-primary' />
            Destination Warehouse *
          </Label>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger className='h-9 text-xs'>
              <SelectValue placeholder='Select warehouse...' />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((wh) => (
                <SelectItem key={wh.id} value={wh.id} className='text-xs'>
                  {wh.name} ({wh.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Barcode scanner quick add */}
        <div className='space-y-1.5'>
          <Label className='flex items-center gap-1.5 text-xs font-medium'>
            <ScanBarcode className='h-3.5 w-3.5 text-primary' />
            Barcode / SKU Fast-Scanner
          </Label>
          <form onSubmit={handleBarcodeSubmit} className='flex gap-2'>
            <Input
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder='Scan barcode or enter SKU...'
              className='h-9 text-xs'
            />
            <Button
              type='submit'
              size='sm'
              variant='secondary'
              className='h-9 px-3 text-xs'
            >
              Add +1
            </Button>
          </form>
        </div>
      </div>

      {/* Items Receiving Table */}
      <div className='space-y-3 pt-2'>
        <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-2.5'>
          <div className='flex items-center gap-2'>
            <Label className='text-sm font-bold'>
              2.{' '}
              {t('goodsReceipts.itemsToReceive', {
                defaultValue: 'Items to Receive',
              })}{' '}
              ({items.length})
            </Label>
            <Badge variant='outline' className='text-xs font-normal'>
              Received Total: {totalReceived} | Accepted: {totalAccepted} |
              Rejected: {totalRejected}
            </Badge>
          </div>

          <div className='flex items-center gap-2'>
            <Input
              value={itemFilterQuery}
              onChange={(e) => setItemFilterQuery(e.target.value)}
              placeholder='Filter items...'
              className='h-8 w-36 text-xs'
            />
            {items.some(
              (it) =>
                it.isSerialTracked &&
                Number(it.acceptedQty || 0) > 0 &&
                it.serialsText.split(/[\n,]+/).filter(Boolean).length !==
                  Number(it.acceptedQty)
            ) && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-8 shrink-0 gap-1.5 border-blue-300 bg-blue-50/50 text-xs font-medium text-blue-600 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40'
                onClick={handleAutoGenerateAllMissingSerials}
                title='Auto-generate serial numbers for all items requiring serials based on their product names'
              >
                <Sparkles className='h-3.5 w-3.5 text-blue-600' />
                Generate All Missing Serials
              </Button>
            )}
            <Select
              value={itemStatusFilter}
              onValueChange={(
                val:
                  | 'all'
                  | 'remaining'
                  | 'partially_received'
                  | 'fully_received'
              ) => setItemStatusFilter(val)}
            >
              <SelectTrigger className='h-8 w-36 text-xs'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Items</SelectItem>
                <SelectItem value='remaining'>Remaining Only</SelectItem>
                <SelectItem value='partially_received'>
                  Partially Received
                </SelectItem>
                <SelectItem value='fully_received'>Fully Received</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isAllRejected && (
          <div className='flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400'>
            <AlertCircle className='h-4 w-4 shrink-0' />
            <span>
              Notice: All receiving units are marked as Rejected. A quarantined
              rejection audit will be posted without increasing available
              warehouse stock.
            </span>
          </div>
        )}

        {filteredItems.length === 0 ? (
          <div className='rounded-lg border bg-muted/10 p-8 text-center text-xs text-muted-foreground'>
            No items match the current filter.
          </div>
        ) : (
          <div className='space-y-3.5'>
            {filteredItems.map((item) => {
              const index = items.findIndex(
                (it) => it.purchaseOrderItemId === item.purchaseOrderItemId
              )
              const acceptedNum = Number(item.acceptedQty || 0)
              const isOverRemaining =
                Number(item.qtyReceived) > item.remainingQty
              const isQtyZero = Number(item.qtyReceived) === 0

              return (
                <div
                  key={item.purchaseOrderItemId}
                  className={`space-y-3 rounded-lg border p-3.5 transition-colors ${
                    isOverRemaining
                      ? 'border-destructive bg-destructive/5'
                      : isQtyZero
                        ? 'bg-muted/10 opacity-75'
                        : 'bg-card shadow-xs'
                  }`}
                >
                  {/* Item header line */}
                  <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-2'>
                    <div className='space-y-0.5'>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm font-bold text-foreground'>
                          {item.productName}
                        </span>
                        {item.variantName && (
                          <span className='text-xs text-muted-foreground'>
                            ({item.variantName})
                          </span>
                        )}
                        <Badge
                          variant='secondary'
                          className='font-mono text-[10px]'
                        >
                          {item.sku}
                        </Badge>
                        {item.isBatchTracked && (
                          <Badge
                            variant='outline'
                            className='border-purple-500/20 bg-purple-500/10 text-[10px] text-purple-600'
                          >
                            Lot Tracked
                          </Badge>
                        )}
                        {item.isSerialTracked && (
                          <Badge
                            variant='outline'
                            className='border-blue-500/20 bg-blue-500/10 text-[10px] text-blue-600'
                          >
                            Serial Tracked
                          </Badge>
                        )}
                      </div>
                      <div className='flex items-center gap-3 text-xs text-muted-foreground'>
                        <span>
                          Ordered:{' '}
                          <strong>
                            {item.orderedQty} {item.uomName}
                          </strong>
                        </span>
                        <span>
                          Received:{' '}
                          <strong>{item.previouslyReceivedQty}</strong>
                        </span>
                        <span className='font-medium text-primary'>
                          Remaining: <strong>{item.remainingQty}</strong>
                        </span>
                      </div>
                    </div>

                    <div className='flex items-center gap-2'>
                      {item.remainingQty > 0 && (
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='h-7 text-xs text-primary'
                          onClick={() =>
                            updateItem(index, {
                              qtyReceived: String(item.remainingQty),
                            })
                          }
                        >
                          Receive All ({item.remainingQty})
                        </Button>
                      )}
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='h-7 text-xs text-muted-foreground'
                        onClick={() => updateItem(index, { qtyReceived: '0' })}
                      >
                        Skip
                      </Button>
                    </div>
                  </div>

                  {/* Quantities & Location Grid */}
                  <div className='grid grid-cols-2 gap-3 sm:grid-cols-5'>
                    <div className='space-y-1'>
                      <Label className='text-[11px] font-medium text-foreground'>
                        Receive Now *
                      </Label>
                      <Input
                        type='number'
                        step='any'
                        min={0}
                        max={item.remainingQty}
                        value={item.qtyReceived}
                        onChange={(e) =>
                          updateItem(index, { qtyReceived: e.target.value })
                        }
                        className={`h-8 text-xs font-bold ${isOverRemaining ? 'border-destructive text-destructive' : ''}`}
                        placeholder='0'
                      />
                    </div>

                    <div className='space-y-1'>
                      <Label className='text-[11px] font-medium text-emerald-600 dark:text-emerald-400'>
                        Accepted
                      </Label>
                      <Input
                        type='number'
                        step='any'
                        min={0}
                        value={item.acceptedQty}
                        onChange={(e) =>
                          updateItem(index, { acceptedQty: e.target.value })
                        }
                        className='h-8 border-emerald-300 text-xs font-semibold dark:border-emerald-800'
                        placeholder='0'
                      />
                    </div>

                    <div className='space-y-1'>
                      <Label className='text-[11px] font-medium text-rose-600 dark:text-rose-400'>
                        Rejected
                      </Label>
                      <Input
                        type='number'
                        step='any'
                        min={0}
                        value={item.rejectedQty}
                        onChange={(e) =>
                          updateItem(index, { rejectedQty: e.target.value })
                        }
                        className='h-8 border-rose-300 text-xs dark:border-rose-800'
                        placeholder='0'
                      />
                    </div>

                    <div className='space-y-1'>
                      <Label className='text-[11px] font-medium text-muted-foreground'>
                        Receiving Cost
                      </Label>
                      <Input
                        type='number'
                        step='any'
                        min={0}
                        value={item.unitCost}
                        onChange={(e) =>
                          updateItem(index, { unitCost: e.target.value })
                        }
                        className='h-8 font-mono text-xs'
                        placeholder='0.00'
                      />
                    </div>

                    <div className='col-span-2 space-y-1 sm:col-span-1'>
                      <Label className='flex items-center gap-1 text-[11px] font-medium text-muted-foreground'>
                        <MapPin className='h-3 w-3' />
                        Location
                      </Label>
                      <Select
                        value={item.warehouseLocationId || 'none'}
                        onValueChange={(val) =>
                          updateItem(index, {
                            warehouseLocationId: val === 'none' ? '' : val,
                          })
                        }
                      >
                        <SelectTrigger className='h-8 text-xs'>
                          <SelectValue placeholder='Default location' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='none'>Default location</SelectItem>
                          {locations.map((loc) => (
                            <SelectItem
                              key={loc.id}
                              value={loc.id}
                              className='text-xs'
                            >
                              {loc.code} {loc.name ? `— ${loc.name}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Rejection Reason (if rejected > 0) */}
                  {Number(item.rejectedQty) > 0 && (
                    <div className='space-y-1 pt-1'>
                      <Label className='text-[11px] font-medium text-rose-500'>
                        Rejection Reason *
                      </Label>
                      <Input
                        value={item.rejectionReason}
                        onChange={(e) =>
                          updateItem(index, { rejectionReason: e.target.value })
                        }
                        placeholder='e.g., Damaged packaging, temperature deviation, failed QA inspection...'
                        className='h-8 border-rose-300 text-xs'
                      />
                    </div>
                  )}

                  {/* Batch / Expiry Sub-form */}
                  {item.isBatchTracked && (
                    <div className='space-y-2 rounded-md border border-purple-500/20 bg-purple-500/5 p-2.5 text-xs'>
                      <div className='flex items-center justify-between'>
                        <Label className='text-xs font-semibold text-purple-700 dark:text-purple-400'>
                          Batch / Lot Tracking
                        </Label>
                        <div className='flex gap-2'>
                          {item.availableBatches.length > 0 && (
                            <Button
                              type='button'
                              variant={
                                item.batchMode === 'existing'
                                  ? 'default'
                                  : 'outline'
                              }
                              size='sm'
                              className='h-6 px-2 text-[11px]'
                              onClick={() =>
                                updateItem(index, { batchMode: 'existing' })
                              }
                            >
                              Existing Batch
                            </Button>
                          )}
                          <Button
                            type='button'
                            variant={
                              item.batchMode === 'new' ? 'default' : 'outline'
                            }
                            size='sm'
                            className='h-6 px-2 text-[11px]'
                            onClick={() =>
                              updateItem(index, { batchMode: 'new' })
                            }
                          >
                            Create New Batch
                          </Button>
                        </div>
                      </div>

                      {item.batchMode === 'existing' ? (
                        <Select
                          value={item.batchId}
                          onValueChange={(val) =>
                            updateItem(index, { batchId: val })
                          }
                        >
                          <SelectTrigger className='h-8 bg-background text-xs'>
                            <SelectValue placeholder='Select existing lot...' />
                          </SelectTrigger>
                          <SelectContent>
                            {item.availableBatches.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                Lot: {b.batch_number}{' '}
                                {b.expiry_date ? `(Exp: ${b.expiry_date})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                          <Input
                            value={item.batchNumber}
                            onChange={(e) =>
                              updateItem(index, { batchNumber: e.target.value })
                            }
                            placeholder='Enter new batch / lot number (e.g. B-2026-001)...'
                            className='h-8 bg-background text-xs'
                          />
                          <Input
                            type='date'
                            value={item.expiryDate}
                            onChange={(e) =>
                              updateItem(index, { expiryDate: e.target.value })
                            }
                            className='h-8 bg-background text-xs'
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Serial Numbers Sub-form */}
                  {item.isSerialTracked && acceptedNum > 0 && (
                    <div className='space-y-2 rounded-md border border-blue-500/20 bg-blue-500/5 p-2.5 text-xs'>
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <div className='flex items-center gap-2'>
                          <Label className='flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400'>
                            <Hash className='h-3.5 w-3.5' />
                            Serial Numbers Tracking
                          </Label>
                          <span className='font-mono text-[11px]'>
                            Required: <strong>{acceptedNum}</strong> | Entered:{' '}
                            <strong
                              className={
                                item.serialsText.split(/[\n,]+/).filter(Boolean)
                                  .length === acceptedNum
                                  ? 'text-emerald-600'
                                  : 'text-amber-600'
                              }
                            >
                              {
                                item.serialsText.split(/[\n,]+/).filter(Boolean)
                                  .length
                              }{' '}
                              / {acceptedNum}
                            </strong>
                          </span>
                        </div>

                        <div className='flex items-center gap-1.5'>
                          {/* 1-Click Auto-Generate Button */}
                          <Button
                            type='button'
                            variant='secondary'
                            size='sm'
                            className='h-6 gap-1 border border-blue-300 bg-blue-100 px-2 text-[11px] font-medium text-blue-700 hover:bg-blue-200 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/70'
                            onClick={() => handleQuickGenerateSerials(index)}
                            title={`Auto-generate ${acceptedNum} serial numbers based on product name "${item.productName}"`}
                          >
                            <Sparkles className='h-3 w-3' />
                            Auto Generate
                          </Button>

                          {/* Custom Generator Dialog Trigger */}
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='h-6 gap-1 bg-background px-2 text-[11px] hover:bg-muted'
                            onClick={() => setActiveGeneratorItemIndex(index)}
                            title='Customize serial prefix, format, date stamp, and sequence'
                          >
                            <Settings2 className='h-3 w-3' />
                            Custom...
                          </Button>
                        </div>
                      </div>

                      <Textarea
                        rows={2}
                        value={item.serialsText}
                        onChange={(e) =>
                          updateItem(index, { serialsText: e.target.value })
                        }
                        placeholder='Enter serial numbers separated by comma or new lines (SN-001, SN-002)... or click Auto Generate'
                        className='bg-background font-mono text-xs'
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className='space-y-1.5 pt-2'>
        <Label className='text-xs font-medium'>
          {t('goodsReceipts.form.notes', {
            defaultValue: 'Notes / Receiving Inspection Remarks',
          })}
        </Label>
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder='Carrier, bill of lading #, visual inspection notes, temperature compliance...'
          className='text-xs'
        />
      </div>

      {/* Footer Buttons */}
      <div className='flex items-center justify-between border-t pt-3'>
        <div className='text-xs text-muted-foreground'>
          Total Lines:{' '}
          <strong>
            {items.filter((i) => Number(i.qtyReceived) > 0).length}
          </strong>{' '}
          | Total Units: <strong>{totalReceived}</strong>
        </div>

        <div className='flex gap-2'>
          <Button type='button' variant='outline' onClick={onClose}>
            Cancel
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
                Receive & Post Stock
              </>
            ) : (
              <>
                <Package className='h-4 w-4' />
                Save Draft Receipt
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Serial Generator Dialog for Custom Configuration */}
      {activeGeneratorItem && activeGeneratorItemIndex !== null && (
        <SerialGeneratorDialog
          open={activeGeneratorItemIndex !== null}
          onOpenChange={(isOpen) => {
            if (!isOpen) setActiveGeneratorItemIndex(null)
          }}
          productName={activeGeneratorItem.productName}
          variantName={activeGeneratorItem.variantName}
          sku={activeGeneratorItem.sku}
          requiredCount={Number(activeGeneratorItem.acceptedQty || 0)}
          currentSerials={activeGeneratorItem.serialsText
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean)}
          existingReceiptSerials={items
            .filter((_, i) => i !== activeGeneratorItemIndex)
            .flatMap((it) =>
              it.serialsText
                .split(/[\n,]+/)
                .map((s) => s.trim())
                .filter(Boolean)
            )}
          onApply={handleApplySerialsFromDialog}
        />
      )}
    </div>
  )
}

export function ReceiptCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()

  // PO Search state
  const [poSearchQuery, setPoSearchQuery] = useState('')
  const [debouncedPoSearch, setDebouncedPoSearch] = useState('')
  const [selectedPoId, setSelectedPoId] = useState<string>('')
  const [autoPost, setAutoPost] = useState(true)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPoSearch(poSearchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [poSearchQuery])

  // Lookups & API queries
  const { data: warehouses = [] } = useWarehouseOptions()
  const { data: poSearchResult, isLoading: isLoadingPos } =
    useReceivablePoSearch({
      query: debouncedPoSearch,
      limit: 20,
    })
  const { data: poDetails } = usePoReceivingDetails(selectedPoId)

  const reset = () => {
    setPoSearchQuery('')
    setDebouncedPoSearch('')
    setSelectedPoId('')
    setAutoPost(true)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) reset()
        onOpenChange(value)
      }}
    >
      <DialogContent className='flex max-h-[92vh] flex-col p-6 sm:max-w-5xl'>
        <DialogHeader className='border-b pb-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2.5'>
              <div className='rounded-lg bg-primary/10 p-2 text-primary'>
                <Package className='h-5 w-5' />
              </div>
              <div>
                <DialogTitle className='text-lg font-bold'>
                  {t('goodsReceipts.dialog.createTitle', {
                    defaultValue: 'Goods Receipt & Receiving',
                  })}
                </DialogTitle>
                <DialogDescription className='text-xs'>
                  {t('goodsReceipts.dialog.createDesc', {
                    defaultValue:
                      'Receive against Purchase Orders, track lots & serials, and update warehouse inventory.',
                  })}
                </DialogDescription>
              </div>
            </div>

            <div className='flex items-center space-x-2.5 rounded-lg border bg-muted/40 p-2 px-3'>
              <Switch
                id='auto-post-switch'
                checked={autoPost}
                onCheckedChange={setAutoPost}
              />
              <div className='space-y-0.5 text-start'>
                <Label
                  htmlFor='auto-post-switch'
                  className='flex cursor-pointer items-center gap-1 text-xs font-semibold'
                >
                  <CheckCircle2 className='h-3.5 w-3.5 text-emerald-500' />
                  {t('goodsReceipts.autoPostLabel', {
                    defaultValue: 'Post to stock immediately',
                  })}
                </Label>
                <p className='text-[10px] text-muted-foreground'>
                  {t('goodsReceipts.autoPostDesc', {
                    defaultValue:
                      'Increases stock balances & updates PO status',
                  })}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className='flex-1 pe-4'>
          <div className='space-y-4 py-3'>
            {/* Step 1: Search & Select Purchase Order */}
            <div className='space-y-3 rounded-lg border bg-card p-4 shadow-xs'>
              <div className='flex items-center justify-between'>
                <Label className='flex items-center gap-2 text-sm font-semibold'>
                  <ShoppingCart className='h-4 w-4 text-primary' />
                  1.{' '}
                  {t('goodsReceipts.selectPoTitle', {
                    defaultValue: 'Select Purchase Order for Receiving',
                  })}{' '}
                  *
                </Label>
                {selectedPoId && (
                  <Badge
                    variant='outline'
                    className='border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-600'
                  >
                    <ShieldCheck className='me-1 h-3 w-3' />
                    PO Selected
                  </Badge>
                )}
              </div>

              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                {/* Search input */}
                <div className='relative'>
                  <Search className='absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground' />
                  <Input
                    value={poSearchQuery}
                    onChange={(e) => setPoSearchQuery(e.target.value)}
                    placeholder='Search PO #, supplier, SKU, product, barcode...'
                    className='h-9 pl-8 text-xs'
                  />
                </div>

                {/* PO Selector Dropdown */}
                <Select
                  value={selectedPoId}
                  onValueChange={(val) => {
                    setSelectedPoId(val)
                  }}
                  disabled={isLoadingPos}
                >
                  <SelectTrigger className='h-9 text-xs font-medium'>
                    <SelectValue
                      placeholder={
                        isLoadingPos
                          ? 'Searching POs...'
                          : 'Choose Purchase Order...'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className='max-h-72'>
                    {poSearchResult?.items?.length ? (
                      poSearchResult.items.map((po) => (
                        <SelectItem
                          key={po.id}
                          value={po.id}
                          className='py-2 text-xs'
                        >
                          <div className='flex flex-col gap-0.5'>
                            <div className='flex items-center gap-2'>
                              <span className='font-bold text-primary'>
                                {po.po_number
                                  ? `PO #${po.po_number}`
                                  : `PO-${po.id.slice(0, 8)}`}
                              </span>
                              <span>
                                — {po.suppliers?.name || 'Unknown Supplier'}
                              </span>
                              <Badge
                                variant='outline'
                                className='font-mono text-[10px] uppercase'
                              >
                                {po.lifecycle_status.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <div className='text-[11px] text-muted-foreground'>
                              Warehouse: {po.warehouses?.name || 'Main'} |
                              Items: {po.items_count} | Remaining:{' '}
                              {po.remaining_quantity} units
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem
                        value='none'
                        disabled
                        className='text-xs text-muted-foreground'
                      >
                        No receivable purchase orders found matching search.
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Step 2: PO Receiving Form (keyed by PO ID so state initializes cleanly) */}
            {poDetails ? (
              <PoReceivingForm
                key={poDetails.header.id}
                poDetails={poDetails}
                warehouses={warehouses}
                autoPost={autoPost}
                onClose={() => {
                  reset()
                  onOpenChange(false)
                }}
              />
            ) : (
              <div className='rounded-lg border bg-muted/10 p-12 text-center text-xs text-muted-foreground'>
                <ShoppingCart className='mx-auto mb-2 h-8 w-8 text-muted-foreground/60' />
                <p className='mb-1 text-sm font-medium text-foreground'>
                  No Purchase Order Selected
                </p>
                <p>
                  Search and select an approved or partially received Purchase
                  Order above to load line items.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {!poDetails && (
          <DialogFooter className='border-t pt-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                reset()
                onOpenChange(false)
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
