'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Plus,
  Trash2,
  Warehouse,
  Store,
  Package,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Layers,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useWarehouseOnHand,
  useStoreOnHand,
  useWarehouseOptions,
  useStoreOptions,
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
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  createAdjustmentInputSchema,
  type AdjustmentReason,
  type AdjustmentType,
} from '../data/schema'
import { useCreateAdjustment } from '../hooks/use-stock-adjustments'
import {
  useAdjustmentProductVariants,
  type AdjustmentProductVariant,
} from '../hooks/use-adjustment-products'
import { StockAdjustmentProductVirtualCombobox } from './stock-adjustment-product-virtual-combobox'

interface LineItem {
  id: string
  productVariantId: string
  qty: string
  reason?: AdjustmentReason
  unitCost?: number
  variant?: AdjustmentProductVariant | null
}

const generateId = () => `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

const emptyItem = (): LineItem => ({
  id: generateId(),
  productVariantId: '',
  qty: '',
  variant: null,
})

const QTY_CONFIG: Record<
  AdjustmentType,
  { label: string; placeholder: string; helper: string }
> = {
  manual: {
    label: 'Delta (+/-)',
    placeholder: '+10 or -5',
    helper: 'Positive adds stock, negative removes stock',
  },
  damage: {
    label: 'Qty to Write Off',
    placeholder: 'e.g. 5',
    helper: 'Reduces on-hand balance as damaged/loss',
  },
  stocktake: {
    label: 'Counted Qty',
    placeholder: 'Physical count',
    helper: 'Sets new physical count; calculates discrepancy',
  },
}

const DAMAGE_REASONS: Array<{ value: AdjustmentReason; label: string }> = [
  { value: 'damage', label: 'Damaged' },
  { value: 'expired', label: 'Expired' },
  { value: 'theft', label: 'Theft / Stolen' },
  { value: 'loss', label: 'Lost in Facility' },
  { value: 'data_entry_error', label: 'Data Entry Error' },
  { value: 'stocktake_discrepancy', label: 'Stocktake Discrepancy' },
  { value: 'count_correction', label: 'Count Correction' },
  { value: 'system_correction', label: 'System Correction' },
  { value: 'found', label: 'Found Item' },
  { value: 'other', label: 'Other Reason' },
]

export function AdjustmentCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [facilityType, setFacilityType] = useState<'warehouse' | 'store'>('warehouse')
  const [facilityId, setFacilityId] = useState('')
  const [type, setType] = useState<AdjustmentType>('manual')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([emptyItem()])

  // Lookup options
  const { data: warehouses = [] } = useWarehouseOptions()
  const { data: stores = [] } = useStoreOptions()

  // Real-time facility balances from stock_balances
  const { data: whOnHand = {} } = useWarehouseOnHand(
    facilityType === 'warehouse' && facilityId ? facilityId : undefined
  )
  const { data: stOnHand = {} } = useStoreOnHand(
    facilityType === 'store' && facilityId ? facilityId : undefined
  )
  const onHandMap = facilityType === 'warehouse' ? whOnHand : stOnHand

  // Initial catalog variants for combobox baseline
  const { data: baseVariants = [], isLoading: isLoadingBaseVariants } =
    useAdjustmentProductVariants('', {
      facilityType,
      facilityId: facilityId || undefined,
      enabled: open,
    })

  const createAdjustment = useCreateAdjustment()

  const selectedFacilityName = useMemo(() => {
    if (!facilityId) return null
    if (facilityType === 'warehouse') {
      const wh = warehouses.find((w) => w.id === facilityId)
      return wh ? `${wh.name} (${wh.code})` : null
    }
    const st = stores.find((s) => s.store_id === facilityId)
    return st ? st.name : null
  }, [facilityType, facilityId, warehouses, stores])

  const reset = () => {
    setFacilityType('warehouse')
    setFacilityId('')
    setType('manual')
    setNotes('')
    setItems([emptyItem()])
  }

  const updateItem = (index: number, patch: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  const removeItem = (index: number) => {
    setItems((prev) => {
      if (prev.length <= 1) {
        return [emptyItem()]
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleQuickAdd = (variant: AdjustmentProductVariant | null) => {
    if (!variant) return
    const currentStock =
      variant.facilityStock?.qtyOnHand ?? (onHandMap[variant.id] ?? 0)

    // Check if item already exists in the list
    const existingIndex = items.findIndex(
      (item) => item.productVariantId === variant.id
    )

    if (existingIndex >= 0) {
      toast.info('Item already added', {
        description: `${variant.name} (${variant.sku}) is already in the list.`,
      })
      return
    }

    // Replace the first item if it's empty, otherwise append
    setItems((prev) => {
      const firstIsEmpty =
        prev.length === 1 && !prev[0].productVariantId && prev[0].qty === ''
      const newItem: LineItem = {
        id: generateId(),
        productVariantId: variant.id,
        qty: type === 'stocktake' ? String(currentStock) : '1',
        reason: type === 'damage' ? 'damage' : undefined,
        unitCost: variant.costPrice || 0,
        variant,
      }

      if (firstIsEmpty) {
        return [newItem]
      }
      return [...prev, newItem]
    })

    toast.success('Added item', {
      description: `${variant.name} (${variant.sku}) added to adjustment list.`,
    })
  }

  // Stock calculations per item
  const getItemStockInfo = useCallback(
    (item: LineItem) => {
      if (!item.productVariantId) {
        return { currentStock: 0, newStock: null, diff: null, costImpact: 0 }
      }

      const currentStock =
        item.variant?.facilityStock?.qtyOnHand ??
        (onHandMap[item.productVariantId] ?? 0)

      const unitCost = item.unitCost ?? (item.variant?.costPrice || 0)
      const qtyVal = Number(item.qty)

      if (item.qty === '' || isNaN(qtyVal)) {
        return { currentStock, newStock: null, diff: null, costImpact: 0 }
      }

      if (type === 'manual') {
        const newStock = currentStock + qtyVal
        const diff = qtyVal
        const costImpact = diff * unitCost
        return { currentStock, newStock, diff, costImpact }
      }

      if (type === 'damage') {
        const newStock = Math.max(0, currentStock - Math.abs(qtyVal))
        const diff = -Math.abs(qtyVal)
        const costImpact = -Math.abs(qtyVal) * unitCost
        return { currentStock, newStock, diff, costImpact }
      }

      // stocktake
      const newStock = qtyVal
      const diff = qtyVal - currentStock
      const costImpact = diff * unitCost
      return { currentStock, newStock, diff, costImpact }
    },
    [type, onHandMap]
  )

  // Aggregate KPI summary
  const summary = useMemo(() => {
    const validItems = items.filter(
      (item) => item.productVariantId && item.qty !== '' && !isNaN(Number(item.qty))
    )

    let totalNetQty = 0
    let totalCostImpact = 0

    for (const item of validItems) {
      const { diff, costImpact } = getItemStockInfo(item)
      if (diff !== null) totalNetQty += diff
      totalCostImpact += costImpact
    }

    return {
      validCount: validItems.length,
      totalNetQty,
      totalCostImpact,
    }
  }, [items, getItemStockInfo])

  const handleSubmit = async () => {
    if (!facilityId) {
      toast.error('Facility required', {
        description: `Please select a ${facilityType === 'warehouse' ? 'warehouse' : 'store'} to adjust stock.`,
      })
      return
    }

    const validItems = items.filter(
      (item) => item.productVariantId && item.qty !== ''
    )

    if (validItems.length === 0) {
      toast.error('No items entered', {
        description: 'Please add at least one item with a valid quantity.',
      })
      return
    }

    const parsed = createAdjustmentInputSchema.safeParse({
      warehouseId:
        facilityType === 'warehouse' ? facilityId || undefined : undefined,
      storeId: facilityType === 'store' ? facilityId || undefined : undefined,
      type,
      notes: notes || undefined,
      items: validItems.map((item) => {
        let numericQty = Number(item.qty)
        if (type === 'damage') {
          // write off is positive in schema (server handles deduction)
          numericQty = Math.abs(numericQty)
        }
        return {
          productVariantId: item.productVariantId,
          qty: numericQty,
          reason:
            item.reason ?? (type === 'damage' ? 'damage' : undefined),
          unitCost:
            item.unitCost != null && item.unitCost > 0
              ? item.unitCost
              : undefined,
        }
      }),
    })

    if (!parsed.success) {
      toast.error('Please fix the adjustment details', {
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
      <DialogContent className='flex max-h-[92vh] w-full max-w-[98vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-full md:max-w-[95vw] lg:w-[75vw] lg:max-w-[75vw] xl:max-w-[1280px]'>
        {/* Sticky Header */}
        <DialogHeader className='shrink-0 border-b bg-muted/15 p-4 sm:p-5'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex items-center gap-2.5'>
              <div className='rounded-xl bg-primary/10 p-2.5 text-primary'>
                <Layers className='h-5 w-5' />
              </div>
              <div>
                <DialogTitle className='text-lg font-bold sm:text-xl'>
                  New Stock Adjustment
                </DialogTitle>
                <DialogDescription className='text-xs text-muted-foreground'>
                  Adjust inventory counts, log damage write-offs, or reconcile stocktake discrepancies.
                </DialogDescription>
              </div>
            </div>

            {selectedFacilityName && (
              <Badge
                variant='outline'
                className='flex items-center gap-1.5 bg-background px-2.5 py-1 text-xs font-medium'
              >
                {facilityType === 'warehouse' ? (
                  <Warehouse className='h-3.5 w-3.5 text-primary' />
                ) : (
                  <Store className='h-3.5 w-3.5 text-primary' />
                )}
                <span>{selectedFacilityName}</span>
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <ScrollArea className='flex-1 overflow-y-auto'>
          <div className='space-y-5 p-4 sm:p-6'>
            {/* Facility & Type Controls Grid */}
            <div className='grid grid-cols-1 gap-4 rounded-xl border bg-card p-4 shadow-xs sm:grid-cols-3'>
              {/* Facility Type */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Facility Type</Label>
                <Select
                  value={facilityType}
                  onValueChange={(val: 'warehouse' | 'store') => {
                    setFacilityType(val)
                    setFacilityId('')
                  }}
                >
                  <SelectTrigger className='h-9 text-xs'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='warehouse'>
                      <div className='flex items-center gap-2 text-xs'>
                        <Warehouse className='h-3.5 w-3.5 text-muted-foreground' />
                        Warehouse
                      </div>
                    </SelectItem>
                    <SelectItem value='store'>
                      <div className='flex items-center gap-2 text-xs'>
                        <Store className='h-3.5 w-3.5 text-muted-foreground' />
                        Store / Retail Location
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Facility Selection */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>
                  {facilityType === 'warehouse' ? 'Warehouse' : 'Store'}{' '}
                  <span className='text-destructive'>*</span>
                </Label>
                <Select value={facilityId} onValueChange={setFacilityId}>
                  <SelectTrigger
                    className={cn(
                      'h-9 text-xs',
                      !facilityId && 'border-amber-500/50 text-muted-foreground'
                    )}
                  >
                    <SelectValue
                      placeholder={
                        facilityType === 'warehouse'
                          ? 'Select warehouse...'
                          : 'Select store...'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {facilityType === 'warehouse'
                      ? warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id} className='text-xs'>
                            <div className='flex items-center gap-2'>
                              <Warehouse className='h-3.5 w-3.5 text-muted-foreground' />
                              <span>{w.name}</span>
                              <span className='font-mono text-[10px] text-muted-foreground'>
                                ({w.code})
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      : stores.map((s) => (
                          <SelectItem
                            key={s.store_id}
                            value={s.store_id}
                            className='text-xs'
                          >
                            <div className='flex items-center gap-2'>
                              <Store className='h-3.5 w-3.5 text-muted-foreground' />
                              <span>{s.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Adjustment Mode */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Adjustment Type</Label>
                <Select
                  value={type}
                  onValueChange={(value) => setType(value as AdjustmentType)}
                >
                  <SelectTrigger className='h-9 text-xs'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='manual' className='text-xs'>
                      <div className='flex items-center gap-1.5'>
                        <Sparkles className='h-3.5 w-3.5 text-blue-500' />
                        <span>Manual Delta (+/-)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value='damage' className='text-xs'>
                      <div className='flex items-center gap-1.5'>
                        <TrendingDown className='h-3.5 w-3.5 text-rose-500' />
                        <span>Damaged / Expired Write-Off</span>
                      </div>
                    </SelectItem>
                    <SelectItem value='stocktake' className='text-xs'>
                      <div className='flex items-center gap-1.5'>
                        <TrendingUp className='h-3.5 w-3.5 text-emerald-500' />
                        <span>Stocktake Physical Count</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Add Bar */}
            <div className='rounded-xl border bg-muted/20 p-3 sm:p-4'>
              <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
                <div className='flex items-center gap-2'>
                  <Search className='h-4 w-4 text-primary' />
                  <span className='text-xs font-semibold text-foreground'>
                    Quick Product Search & Add
                  </span>
                </div>
                <span className='text-[11px] text-muted-foreground'>
                  Search by SKU, Barcode, or Product Name to append directly to the list
                </span>
              </div>
              <StockAdjustmentProductVirtualCombobox
                facilityType={facilityType}
                facilityId={facilityId}
                facilityName={selectedFacilityName}
                facilityStockMap={onHandMap}
                variants={baseVariants}
                isLoading={isLoadingBaseVariants}
                disabled={!facilityId}
                placeholder={
                  facilityId
                    ? 'Scan barcode or type SKU / product name to quick-add...'
                    : 'Select a facility above first to enable product search...'
                }
                onChange={handleQuickAdd}
              />
            </div>

            {/* Line Items Section */}
            <div className='space-y-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='flex items-center gap-2'>
                  <Package className='h-4 w-4 text-primary' />
                  <Label className='text-xs font-bold text-foreground'>
                    Line Items ({items.length})
                  </Label>
                </div>
                <span className='text-[11px] text-muted-foreground'>
                  {QTY_CONFIG[type].helper}
                </span>
              </div>

              {/* Items Card List / Table */}
              <div className='space-y-2.5'>
                {items.map((item, index) => {
                  const { currentStock, newStock, diff, costImpact } =
                    getItemStockInfo(item)
                  const isExceedingDamage =
                    type === 'damage' &&
                    item.qty !== '' &&
                    Number(item.qty) > currentStock

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'relative rounded-xl border bg-card p-3 transition-colors shadow-2xs sm:p-3.5',
                        item.productVariantId
                          ? 'border-border'
                          : 'border-dashed border-muted-foreground/30'
                      )}
                    >
                      <div className='grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-center'>
                        {/* Column 1: Product Selector (5 cols on lg) */}
                        <div className='space-y-1 lg:col-span-5'>
                          <div className='flex items-center justify-between'>
                            <span className='font-mono text-[10px] font-medium text-muted-foreground'>
                              #{index + 1} Item
                            </span>
                            {item.productVariantId && (
                              <span className='text-[11px] text-muted-foreground'>
                                Current:{' '}
                                <strong className='text-foreground'>
                                  {currentStock}
                                </strong>{' '}
                                {item.variant?.uom || 'PCS'}
                              </span>
                            )}
                          </div>
                          <StockAdjustmentProductVirtualCombobox
                            value={item.productVariantId}
                            facilityType={facilityType}
                            facilityId={facilityId}
                            facilityName={selectedFacilityName}
                            facilityStockMap={onHandMap}
                            variants={baseVariants}
                            isLoading={isLoadingBaseVariants}
                            disabled={!facilityId}
                            onChange={(v) => {
                              updateItem(index, {
                                productVariantId: v?.id || '',
                                variant: v,
                                unitCost: v?.costPrice || 0,
                                qty:
                                  type === 'stocktake' && v
                                    ? String(
                                        v.facilityStock?.qtyOnHand ??
                                          (onHandMap[v.id] ?? 0)
                                      )
                                    : item.qty || '1',
                              })
                            }}
                          />
                        </div>

                        {/* Column 2: Quantity Input (2 cols on lg) */}
                        <div className='space-y-1 lg:col-span-2'>
                          <Label className='text-[11px] font-medium text-muted-foreground'>
                            {QTY_CONFIG[type].label}
                          </Label>
                          <Input
                            type='number'
                            step='any'
                            value={item.qty}
                            onChange={(e) =>
                              updateItem(index, { qty: e.target.value })
                            }
                            placeholder={QTY_CONFIG[type].placeholder}
                            className={cn(
                              'h-9 text-xs font-mono font-medium',
                              isExceedingDamage && 'border-rose-500 ring-rose-500/20'
                            )}
                          />
                        </div>

                        {/* Column 3: Live Preview / Discrepancy (2 cols on lg) */}
                        <div className='space-y-1 lg:col-span-2'>
                          <Label className='text-[11px] font-medium text-muted-foreground'>
                            {type === 'stocktake'
                              ? 'Discrepancy (Δ)'
                              : 'New Balance'}
                          </Label>
                          <div className='flex h-9 items-center rounded-lg border bg-muted/30 px-2.5 text-xs font-mono'>
                            {diff !== null ? (
                              <div className='flex items-center gap-1.5'>
                                {type === 'stocktake' ? (
                                  <span
                                    className={cn(
                                      'font-semibold',
                                      diff === 0 && 'text-muted-foreground',
                                      diff > 0 && 'text-emerald-600 dark:text-emerald-400',
                                      diff < 0 && 'text-rose-600 dark:text-rose-400'
                                    )}
                                  >
                                    {diff > 0 ? `+${diff}` : diff}
                                  </span>
                                ) : (
                                  <div className='flex items-center gap-1'>
                                    <span className='text-muted-foreground'>
                                      {currentStock}
                                    </span>
                                    <ArrowRight className='h-3 w-3 text-muted-foreground/60' />
                                    <strong
                                      className={cn(
                                        newStock != null && newStock < 0
                                          ? 'text-rose-600'
                                          : 'text-foreground'
                                      )}
                                    >
                                      {newStock}
                                    </strong>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className='text-muted-foreground/60'>--</span>
                            )}
                          </div>
                        </div>

                        {/* Column 4: Reason / Unit Cost (2 cols on lg) */}
                        <div className='space-y-1 lg:col-span-2'>
                          <Label className='text-[11px] font-medium text-muted-foreground'>
                            {type === 'damage' ? 'Damage Reason' : 'Reason (opt)'}
                          </Label>
                          <Select
                            value={item.reason ?? (type === 'damage' ? 'damage' : '')}
                            onValueChange={(val) =>
                              updateItem(index, {
                                reason: val as AdjustmentReason,
                              })
                            }
                          >
                            <SelectTrigger className='h-9 text-xs'>
                              <SelectValue placeholder='Select reason...' />
                            </SelectTrigger>
                            <SelectContent>
                              {DAMAGE_REASONS.map((r) => (
                                <SelectItem
                                  key={r.value}
                                  value={r.value}
                                  className='text-xs'
                                >
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Column 5: Action (1 col on lg) */}
                        <div className='flex items-center justify-end pt-2 lg:col-span-1 lg:justify-center lg:pt-5'>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            onClick={() => removeItem(index)}
                            className='h-8 w-8 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600'
                            title='Remove item'
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </div>
                      </div>

                      {/* Financial Impact & Warning Strip */}
                      {(costImpact !== 0 || isExceedingDamage) && (
                        <div className='mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-[11px]'>
                          {isExceedingDamage ? (
                            <span className='flex items-center gap-1 text-rose-600 dark:text-rose-400'>
                              <AlertTriangle className='h-3 w-3' />
                              Write-off quantity ({item.qty}) exceeds on-hand balance ({currentStock}).
                            </span>
                          ) : (
                            <span className='text-muted-foreground'>
                              Unit Cost:{' '}
                              <strong className='text-foreground'>
                                ${(item.unitCost ?? item.variant?.costPrice ?? 0).toFixed(2)}
                              </strong>
                            </span>
                          )}

                          <span
                            className={cn(
                              'font-mono font-medium',
                              costImpact > 0 && 'text-emerald-600 dark:text-emerald-400',
                              costImpact < 0 && 'text-rose-600 dark:text-rose-400',
                              costImpact === 0 && 'text-muted-foreground'
                            )}
                          >
                            Cost Impact: {costImpact > 0 ? '+' : ''}$
                            {costImpact.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Add item button */}
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setItems((prev) => [...prev, emptyItem()])}
                className='h-8 text-xs font-medium'
              >
                <Plus className='mr-1.5 h-3.5 w-3.5' />
                Add Blank Row
              </Button>
            </div>

            {/* Notes Field */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Notes / Justification</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder='Add any internal reference, audit notes, or approval reason...'
                rows={2}
                className='text-xs'
              />
            </div>
          </div>
        </ScrollArea>

        {/* KPI Summary Strip & Sticky Footer */}
        <div className='shrink-0 border-t bg-muted/20'>
          {/* Summary KPI Strip */}
          <div className='flex flex-wrap items-center justify-between gap-3 border-b bg-card/60 px-4 py-2.5 sm:px-6'>
            <div className='flex items-center gap-4 text-xs'>
              <span className='text-muted-foreground'>
                Items:{' '}
                <strong className='font-mono text-foreground'>
                  {summary.validCount}
                </strong>
              </span>
              <span className='text-muted-foreground'>
                Net Qty Delta:{' '}
                <strong
                  className={cn(
                    'font-mono',
                    summary.totalNetQty > 0 && 'text-emerald-600',
                    summary.totalNetQty < 0 && 'text-rose-600',
                    summary.totalNetQty === 0 && 'text-foreground'
                  )}
                >
                  {summary.totalNetQty > 0 ? `+${summary.totalNetQty}` : summary.totalNetQty}
                </strong>
              </span>
            </div>

            <div className='flex items-center gap-1.5 text-xs'>
              <DollarSign className='h-3.5 w-3.5 text-muted-foreground' />
              <span className='text-muted-foreground'>Est. Financial Impact:</span>
              <strong
                className={cn(
                  'font-mono font-bold',
                  summary.totalCostImpact > 0 && 'text-emerald-600 dark:text-emerald-400',
                  summary.totalCostImpact < 0 && 'text-rose-600 dark:text-rose-400',
                  summary.totalCostImpact === 0 && 'text-foreground'
                )}
              >
                {summary.totalCostImpact > 0 ? '+' : ''}$
                {summary.totalCostImpact.toFixed(2)}
              </strong>
            </div>
          </div>

          {/* Dialog Action Buttons */}
          <DialogFooter className='p-3 sm:px-6 sm:py-3.5'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              className='h-9 text-xs'
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={handleSubmit}
              disabled={createAdjustment.isPending || !facilityId}
              className='h-9 text-xs font-semibold'
            >
              {createAdjustment.isPending ? 'Saving Adjustment...' : 'Create Draft'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
