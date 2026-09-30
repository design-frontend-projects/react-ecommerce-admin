import { useEffect, useMemo, useState } from 'react'
import {
  Controller,
  useFieldArray,
  useForm,
  type FieldErrors,
  type Resolver,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Building2,
  Calendar,
  Layers,
  Package,
  Plus,
  Scale,
  SlidersHorizontal,
  Store,
  Tag,
  Trash2,
  TrendingUp,
  Warehouse,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  useBranchOptions,
  useStoreOnHand,
  useStoreOptions,
  useWarehouseLocationOptions,
  useWarehouseOnHand,
  useWarehouseOptions,
} from '@/hooks/use-inventory-lookups'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  createTransferInputSchema,
  type CreateTransferInput,
  type StockCondition,
  type TransferDetail,
  type TransferListItem,
  type TransferPriority,
} from '../data/schema'
import {
  useStockTransferProductVariants,
  type StockTransferProductVariant,
} from '../hooks/use-stock-transfer-products'
import {
  useCreateTransfer,
  useTransfer,
  useUpdateTransfer,
} from '../hooks/use-stock-transfers'
import { CrossWarehouseStockBadge } from './cross-warehouse-stock-badge'
import { StockTransferProductVirtualCombobox } from './stock-transfer-product-virtual-combobox'

const CONDITIONS: {
  value: StockCondition
  label: string
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'
}[] = [
  { value: 'good', label: 'Good', badgeVariant: 'secondary' },
  { value: 'damaged', label: 'Damaged', badgeVariant: 'destructive' },
  { value: 'quarantine', label: 'Quarantine', badgeVariant: 'outline' },
  { value: 'expired', label: 'Expired', badgeVariant: 'destructive' },
  { value: 'blocked', label: 'Blocked', badgeVariant: 'outline' },
]

const PRIORITIES: {
  value: TransferPriority
  label: string
  badgeColor: string
}[] = [
  {
    value: 'low',
    label: 'Low',
    badgeColor:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  {
    value: 'normal',
    label: 'Normal',
    badgeColor:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  {
    value: 'high',
    label: 'High',
    badgeColor:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  {
    value: 'urgent',
    label: 'Urgent',
    badgeColor:
      'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  },
]

const REASON_CODES = [
  { value: 'replenishment', label: 'Replenishment' },
  { value: 'rebalance', label: 'Stock Rebalance' },
  { value: 'customer_order', label: 'Customer Order Fulfillment' },
  { value: 'seasonal', label: 'Seasonal Allocation' },
  { value: 'damaged_return', label: 'Damaged / Defective Return' },
  { value: 'quarantine', label: 'Quarantine Isolation' },
  { value: 'store_opening', label: 'Store Opening / Expansion' },
  { value: 'custom', label: 'Custom / Other Reason' },
]

const defaultValues: CreateTransferInput = {
  transferType: 'inter_warehouse',
  priority: 'normal',
  reasonCode: '',
  expectedShipDate: '',
  expectedReceiveDate: '',
  sourceWarehouseId: null,
  destinationWarehouseId: null,
  fromStoreId: null,
  toStoreId: null,
  fromBranchId: null,
  toBranchId: null,
  referenceNo: '',
  notes: '',
  items: [
    {
      productVariantId: '',
      qty: 1,
      unitCost: 0,
      condition: 'good',
      sourceLocationId: null,
      destinationLocationId: null,
      batchId: null,
      serialId: null,
      notes: null,
    },
  ],
}

interface TransferCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transferToEdit?: TransferListItem | TransferDetail | null
}

export function TransferCreateDialog({
  open,
  onOpenChange,
  transferToEdit,
}: TransferCreateDialogProps) {
  const { t } = useTranslation()
  const createTransfer = useCreateTransfer()
  const updateTransfer = useUpdateTransfer()
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [customReason, setCustomReason] = useState(false)

  const isEdit = Boolean(transferToEdit)

  // Fetch full details if editing a transfer
  const { data: fullDetail } = useTransfer(
    open && isEdit && transferToEdit ? transferToEdit.id : undefined
  )

  const { data: warehouses = [] } = useWarehouseOptions()
  const { data: stores = [] } = useStoreOptions()
  const { data: branches = [] } = useBranchOptions()
  const { data: variants = [], isLoading: isLoadingVariants } =
    useStockTransferProductVariants()

  // Track dynamically discovered variants (e.g. from server search selection or edit mode)
  const [selectedVariantsMap, setSelectedVariantsMap] = useState<
    Map<string, StockTransferProductVariant>
  >(new Map())

  const registerVariant = (variant: StockTransferProductVariant) => {
    setSelectedVariantsMap((prev) => {
      if (prev.has(variant.id)) return prev
      const next = new Map(prev)
      next.set(variant.id, variant)
      return next
    })
  }

  // Combined pool of variants ensuring any dynamically searched item retains metadata for totals & badges
  const allKnownVariants = useMemo(() => {
    const map = new Map<string, StockTransferProductVariant>()
    for (const v of variants) {
      map.set(v.id, v)
    }
    selectedVariantsMap.forEach((v, k) => {
      map.set(k, v)
    })
    return Array.from(map.values())
  }, [variants, selectedVariantsMap])

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransferInput>({
    resolver: zodResolver(
      createTransferInputSchema
    ) as Resolver<CreateTransferInput>,
    defaultValues,
    mode: 'onChange',
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const transferType = watch('transferType')
  const sourceWarehouseId = watch('sourceWarehouseId')
  const destinationWarehouseId = watch('destinationWarehouseId')
  const fromStoreId = watch('fromStoreId')
  const fromBranchId = watch('fromBranchId')
  const watchedPriority = watch('priority') || 'normal'
  const watchedExpectedShip = watch('expectedShipDate') || ''
  const watchedItems = watch('items')

  // When editing, populate form from fetched detail
  useEffect(() => {
    if (!open) return

    if (isEdit && fullDetail) {
      if (
        fullDetail.stock_transfer_items &&
        fullDetail.stock_transfer_items.length > 0
      ) {
        setSelectedVariantsMap((prev) => {
          const next = new Map(prev)
          for (const it of fullDetail.stock_transfer_items) {
            const pv = it.product_variants
            if (pv && !next.has(pv.id)) {
              next.set(pv.id, {
                id: pv.id,
                sku: pv.sku,
                barcode: pv.barcode ?? null,
                name: pv.name || pv.products?.name || pv.sku,
                productId: pv.products?.id || '',
                productName: pv.products?.name || pv.name || pv.sku,
                brand: pv.brand || pv.products?.brand_name || null,
                category: pv.category || pv.products?.category_name || null,
                uom: pv.uom || pv.products?.uom_name || 'PCS',
                weight: Number(pv.weight || 0),
                costPrice: Number(pv.cost_price ?? it.unit_cost ?? 0),
                listPrice: Number(pv.price ?? 0),
                priceListName: pv.price_list_name || null,
                priceSource: 'Detail',
                isBatchTracked: false,
                isSerialTracked: false,
                searchString: `${pv.sku} ${pv.name || ''} ${pv.products?.name || ''}`.toLowerCase(),
              })
            }
          }
          return next
        })
      }

      let mappedType: CreateTransferInput['transferType'] = 'inter_warehouse'
      if (fullDetail.transfer_type === 'internal') mappedType = 'internal'
      else if (fullDetail.transfer_type === 'inter_store')
        mappedType = 'inter_store'
      else if (fullDetail.transfer_type === 'inter_branch')
        mappedType = 'inter_branch'
      else if (fullDetail.transfer_type === 'inter_warehouse')
        mappedType = 'inter_warehouse'
      else if (fullDetail.from_store_id) mappedType = 'store'
      else if (fullDetail.from_branch_id) mappedType = 'branch'

      const isKnownReason = REASON_CODES.some(
        (r) => r.value !== 'custom' && r.value === fullDetail.reason_code
      )
      setCustomReason(Boolean(fullDetail.reason_code && !isKnownReason))

      reset({
        transferType: mappedType,
        priority: fullDetail.priority || 'normal',
        reasonCode: fullDetail.reason_code || '',
        expectedShipDate: fullDetail.expected_ship_date
          ? new Date(fullDetail.expected_ship_date).toISOString().slice(0, 10)
          : '',
        expectedReceiveDate: fullDetail.expected_receive_date
          ? new Date(fullDetail.expected_receive_date)
              .toISOString()
              .slice(0, 10)
          : '',
        sourceWarehouseId: fullDetail.source_warehouse_id || null,
        destinationWarehouseId: fullDetail.destination_warehouse_id || null,
        fromStoreId: fullDetail.from_store_id || null,
        toStoreId: fullDetail.to_store_id || null,
        fromBranchId: fullDetail.from_branch_id || null,
        toBranchId: fullDetail.to_branch_id || null,
        referenceNo: fullDetail.reference_no || '',
        notes: fullDetail.notes || '',
        items:
          fullDetail.stock_transfer_items &&
          fullDetail.stock_transfer_items.length > 0
            ? fullDetail.stock_transfer_items.map((it) => ({
                productVariantId: it.product_variant_id,
                qty: Number(it.qty || 1),
                unitCost: Number(it.unit_cost ?? 0),
                condition: it.condition || 'good',
                sourceLocationId: it.source_location_id || null,
                destinationLocationId: it.destination_location_id || null,
                batchId: it.batch_id || null,
                serialId: it.serial_id || null,
                notes: it.notes || null,
              }))
            : defaultValues.items,
      })
    } else if (!isEdit) {
      reset(defaultValues)
      setCustomReason(false)
      setSelectedVariantsMap(new Map())
    }
  }, [open, isEdit, fullDetail, reset])

  const selectedWarehouse = warehouses.find((w) => w.id === sourceWarehouseId)

  const isWarehouseMode =
    transferType === 'warehouse' ||
    transferType === 'inter_warehouse' ||
    transferType === 'internal'

  // Stock on hand lookups
  const { data: warehouseStockMap = {} } = useWarehouseOnHand(
    isWarehouseMode ? (sourceWarehouseId ?? undefined) : undefined
  )
  const { data: storeStockMap = {} } = useStoreOnHand(
    transferType === 'store' || transferType === 'inter_store'
      ? (fromStoreId ?? undefined)
      : undefined
  )

  // Location lookups for warehouses
  const { data: sourceLocations = [] } = useWarehouseLocationOptions(
    isWarehouseMode ? (sourceWarehouseId ?? undefined) : undefined
  )
  const { data: destLocations = [] } = useWarehouseLocationOptions(
    transferType === 'internal'
      ? (sourceWarehouseId ?? undefined)
      : isWarehouseMode
        ? (destinationWarehouseId ?? undefined)
        : undefined
  )

  const handleReset = () => {
    reset(defaultValues)
    setShowAdvanced(false)
    setCustomReason(false)
  }

  const handleTypeChange = (type: CreateTransferInput['transferType']) => {
    setValue('transferType', type)
    if (type === 'internal') {
      setValue('destinationWarehouseId', sourceWarehouseId)
    } else {
      setValue('sourceWarehouseId', null)
      setValue('destinationWarehouseId', null)
    }
    setValue('fromStoreId', null)
    setValue('toStoreId', null)
    setValue('fromBranchId', null)
    setValue('toBranchId', null)
  }

  // Calculate live financial & cargo summary
  const totals = useMemo(() => {
    const variantMap = new Map(allKnownVariants.map((v) => [v.id, v]))
    let totalQty = 0
    let totalCost = 0
    let totalPriceValuation = 0
    let totalWeight = 0

    for (const item of watchedItems || []) {
      const qty = Number(item?.qty) || 0
      const cost = Number(item?.unitCost) || 0
      const v = item?.productVariantId
        ? variantMap.get(item.productVariantId)
        : null
      const listPrice = v?.listPrice || cost

      totalQty += qty
      totalCost += qty * cost
      totalPriceValuation += qty * listPrice
      if (v?.weight) {
        totalWeight += qty * v.weight
      }
    }

    const potentialMarkup = totalPriceValuation - totalCost
    const markupPercent =
      totalCost > 0 ? (potentialMarkup / totalCost) * 100 : 0

    return {
      lineCount: watchedItems?.length || 0,
      totalQty,
      totalCost,
      totalPriceValuation,
      totalWeight,
      potentialMarkup,
      markupPercent,
    }
  }, [watchedItems, allKnownVariants])

  const onSubmit = async (data: CreateTransferInput) => {
    try {
      if (isEdit && transferToEdit) {
        await updateTransfer.mutateAsync({
          id: transferToEdit.id,
          referenceNo: data.referenceNo,
          priority: data.priority,
          reasonCode: data.reasonCode,
          expectedShipDate: data.expectedShipDate || null,
          expectedReceiveDate: data.expectedReceiveDate || null,
          notes: data.notes,
          items: data.items,
        })
      } else {
        // If internal transfer, ensure destination warehouse is set to source warehouse
        const payload: CreateTransferInput = {
          ...data,
          destinationWarehouseId:
            data.transferType === 'internal'
              ? data.sourceWarehouseId
              : data.destinationWarehouseId,
        }
        await createTransfer.mutateAsync(payload)
      }
      handleReset()
      onOpenChange(false)
    } catch {
      // Handled by mutation toast
    }
  }

  const onInvalid = (fieldErrors: FieldErrors<CreateTransferInput>) => {
    // eslint-disable-next-line no-console
    console.error('[CreateTransferDialog] Validation errors:', fieldErrors)
    toast.error(
      t('stockTransfers.createDialog.errors.validationFailed', {
        defaultValue: 'Please check the form for errors before submitting.',
      })
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) handleReset()
        onOpenChange(value)
      }}
    >
      <DialogContent className='flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl'>
        <DialogHeader className='shrink-0 border-b bg-muted/10 p-5 pb-4'>
          <div className='flex items-center justify-between pr-6'>
            <DialogTitle className='flex items-center gap-2.5 text-xl font-bold'>
              <div className='rounded-lg bg-primary/10 p-2 text-primary'>
                <Package className='h-5 w-5' />
              </div>
              <div>
                <span>
                  {isEdit
                    ? t('stockTransfers.editTransfer', {
                        defaultValue: 'Edit Stock Transfer',
                      })
                    : t('stockTransfers.createTransfer', {
                        defaultValue: 'New Stock Transfer',
                      })}
                </span>
                {isEdit && transferToEdit && (
                  <span className='ml-2 font-mono text-xs font-normal text-muted-foreground'>
                    {transferToEdit.reference_no ||
                      transferToEdit.id.slice(0, 8)}
                  </span>
                )}
              </div>
            </DialogTitle>
            <div className='flex items-center gap-2'>
              <Badge
                variant='outline'
                className={cn('text-xs font-medium capitalize', {
                  'border-rose-200 bg-rose-50 text-rose-700':
                    watchedPriority === 'urgent',
                  'border-amber-200 bg-amber-50 text-amber-700':
                    watchedPriority === 'high',
                  'border-blue-200 bg-blue-50 text-blue-700':
                    watchedPriority === 'normal',
                  'border-slate-200 bg-slate-50 text-slate-700':
                    watchedPriority === 'low',
                })}
              >
                {watchedPriority} Priority
              </Badge>
            </div>
          </div>
          <DialogDescription className='mt-1 text-xs'>
            {t('stockTransfers.description', {
              defaultValue:
                'Transfer stock between warehouses, internal locations, stores, or branches with tracked approval workflows.',
            })}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className='flex min-h-0 flex-1 flex-col overflow-hidden'
        >
          <ScrollArea className='min-h-0 flex-1'>
            <div className='space-y-6 p-5 sm:p-6'>
              {/* Transfer Type Selector */}
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                    {t(
                      'stockTransfers.createDialog.routingType',
                      'Transfer Routing Type'
                    )}
                  </Label>
                  <span className='text-[11px] text-muted-foreground'>
                    Select route topology for inventory movement
                  </span>
                </div>
                <Tabs
                  value={
                    transferType === 'warehouse'
                      ? 'inter_warehouse'
                      : transferType === 'store'
                        ? 'inter_store'
                        : transferType === 'branch'
                          ? 'inter_branch'
                          : transferType
                  }
                  onValueChange={(val) =>
                    handleTypeChange(val as CreateTransferInput['transferType'])
                  }
                  className='w-full'
                >
                  <TabsList className='grid h-auto w-full grid-cols-2 gap-1.5 bg-muted/40 p-1 sm:grid-cols-4'>
                    <TabsTrigger
                      value='inter_warehouse'
                      className='gap-2 py-2 text-xs font-medium sm:text-xs'
                    >
                      <Warehouse className='h-4 w-4 shrink-0 text-blue-500' />
                      <span className='truncate'>Inter-Warehouse</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value='internal'
                      className='gap-2 py-2 text-xs font-medium sm:text-xs'
                    >
                      <Layers className='h-4 w-4 shrink-0 text-purple-500' />
                      <span className='truncate'>Internal Bin Move</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value='inter_store'
                      className='gap-2 py-2 text-xs font-medium sm:text-xs'
                    >
                      <Store className='h-4 w-4 shrink-0 text-emerald-500' />
                      <span className='truncate'>Store → Store</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value='inter_branch'
                      className='gap-2 py-2 text-xs font-medium sm:text-xs'
                    >
                      <Building2 className='h-4 w-4 shrink-0 text-amber-500' />
                      <span className='truncate'>Branch → Branch</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Source & Destination Routing Box */}
              <div className='grid grid-cols-1 gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2'>
                {/* INTER-WAREHOUSE ROUTING */}
                {(transferType === 'warehouse' ||
                  transferType === 'inter_warehouse') && (
                  <>
                    <div className='space-y-1.5'>
                      <Label
                        htmlFor='sourceWarehouseId'
                        className='text-xs font-semibold'
                      >
                        {t(
                          'stockTransfers.createDialog.sourceWarehouse',
                          'Source Warehouse'
                        )}{' '}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <Controller
                        name='sourceWarehouseId'
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value ?? ''}
                            onValueChange={(val) => field.onChange(val || null)}
                          >
                            <SelectTrigger
                              id='sourceWarehouseId'
                              className={cn(
                                'h-9 text-xs',
                                errors.sourceWarehouseId && 'border-destructive'
                              )}
                            >
                              <SelectValue
                                placeholder={t(
                                  'stockTransfers.createDialog.selectSourceWarehouse',
                                  'Select origin warehouse'
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {warehouses.map((w) => (
                                <SelectItem
                                  key={w.id}
                                  value={w.id}
                                  className='text-xs'
                                >
                                  {w.name} {w.code ? `(${w.code})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.sourceWarehouseId && (
                        <p className='text-[11px] text-destructive'>
                          {errors.sourceWarehouseId.message}
                        </p>
                      )}
                    </div>

                    <div className='space-y-1.5'>
                      <Label
                        htmlFor='destinationWarehouseId'
                        className='text-xs font-semibold'
                      >
                        {t(
                          'stockTransfers.createDialog.destinationWarehouse',
                          'Destination Warehouse'
                        )}{' '}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <Controller
                        name='destinationWarehouseId'
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value ?? ''}
                            onValueChange={(val) => field.onChange(val || null)}
                          >
                            <SelectTrigger
                              id='destinationWarehouseId'
                              className={cn(
                                'h-9 text-xs',
                                errors.destinationWarehouseId &&
                                  'border-destructive'
                              )}
                            >
                              <SelectValue
                                placeholder={t(
                                  'stockTransfers.createDialog.selectDestinationWarehouse',
                                  'Select target warehouse'
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {warehouses
                                .filter((w) => w.id !== sourceWarehouseId)
                                .map((w) => (
                                  <SelectItem
                                    key={w.id}
                                    value={w.id}
                                    className='text-xs'
                                  >
                                    {w.name} {w.code ? `(${w.code})` : ''}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.destinationWarehouseId && (
                        <p className='text-[11px] text-destructive'>
                          {errors.destinationWarehouseId.message}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* INTERNAL WAREHOUSE ROUTING */}
                {transferType === 'internal' && (
                  <>
                    <div className='col-span-1 space-y-1.5 sm:col-span-2'>
                      <div className='flex items-center justify-between'>
                        <Label
                          htmlFor='internalWarehouseId'
                          className='text-xs font-semibold'
                        >
                          Operating Warehouse{' '}
                          <span className='text-destructive'>*</span>
                        </Label>
                        <span className='text-[11px] text-muted-foreground'>
                          Items will move between bins/locations inside this
                          single warehouse facility
                        </span>
                      </div>
                      <Controller
                        name='sourceWarehouseId'
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value ?? ''}
                            onValueChange={(val) => {
                              field.onChange(val || null)
                              setValue('destinationWarehouseId', val || null)
                            }}
                          >
                            <SelectTrigger
                              id='internalWarehouseId'
                              className={cn(
                                'h-9 text-xs',
                                errors.sourceWarehouseId && 'border-destructive'
                              )}
                            >
                              <SelectValue placeholder='Select warehouse facility for relocation' />
                            </SelectTrigger>
                            <SelectContent>
                              {warehouses.map((w) => (
                                <SelectItem
                                  key={w.id}
                                  value={w.id}
                                  className='text-xs'
                                >
                                  {w.name} {w.code ? `(${w.code})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.sourceWarehouseId && (
                        <p className='text-[11px] text-destructive'>
                          {errors.sourceWarehouseId.message}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* STORE ROUTING */}
                {(transferType === 'store' ||
                  transferType === 'inter_store') && (
                  <>
                    <div className='space-y-1.5'>
                      <Label
                        htmlFor='fromStoreId'
                        className='text-xs font-semibold'
                      >
                        {t(
                          'stockTransfers.createDialog.sourceStore',
                          'Source Store'
                        )}{' '}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <Controller
                        name='fromStoreId'
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value ?? ''}
                            onValueChange={(val) => field.onChange(val || null)}
                          >
                            <SelectTrigger
                              id='fromStoreId'
                              className={cn(
                                'h-9 text-xs',
                                errors.fromStoreId && 'border-destructive'
                              )}
                            >
                              <SelectValue
                                placeholder={t(
                                  'stockTransfers.createDialog.selectSourceStore',
                                  'Select origin store'
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {stores.map((s) => (
                                <SelectItem
                                  key={s.store_id}
                                  value={s.store_id}
                                  className='text-xs'
                                >
                                  {s.name || s.store_id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.fromStoreId && (
                        <p className='text-[11px] text-destructive'>
                          {errors.fromStoreId.message}
                        </p>
                      )}
                    </div>

                    <div className='space-y-1.5'>
                      <Label
                        htmlFor='toStoreId'
                        className='text-xs font-semibold'
                      >
                        {t(
                          'stockTransfers.createDialog.destinationStore',
                          'Destination Store'
                        )}{' '}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <Controller
                        name='toStoreId'
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value ?? ''}
                            onValueChange={(val) => field.onChange(val || null)}
                          >
                            <SelectTrigger
                              id='toStoreId'
                              className={cn(
                                'h-9 text-xs',
                                errors.toStoreId && 'border-destructive'
                              )}
                            >
                              <SelectValue
                                placeholder={t(
                                  'stockTransfers.createDialog.selectDestinationStore',
                                  'Select target store'
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {stores
                                .filter((s) => s.store_id !== fromStoreId)
                                .map((s) => (
                                  <SelectItem
                                    key={s.store_id}
                                    value={s.store_id}
                                    className='text-xs'
                                  >
                                    {s.name || s.store_id}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.toStoreId && (
                        <p className='text-[11px] text-destructive'>
                          {errors.toStoreId.message}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* BRANCH ROUTING */}
                {(transferType === 'branch' ||
                  transferType === 'inter_branch') && (
                  <>
                    <div className='space-y-1.5'>
                      <Label
                        htmlFor='fromBranchId'
                        className='text-xs font-semibold'
                      >
                        {t(
                          'stockTransfers.createDialog.sourceBranch',
                          'Source Branch'
                        )}{' '}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <Controller
                        name='fromBranchId'
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value ?? ''}
                            onValueChange={(val) => field.onChange(val || null)}
                          >
                            <SelectTrigger
                              id='fromBranchId'
                              className={cn(
                                'h-9 text-xs',
                                errors.fromBranchId && 'border-destructive'
                              )}
                            >
                              <SelectValue
                                placeholder={t(
                                  'stockTransfers.createDialog.selectSourceBranch',
                                  'Select origin branch'
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {branches.map((b) => (
                                <SelectItem
                                  key={b.id}
                                  value={b.id}
                                  className='text-xs'
                                >
                                  {b.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.fromBranchId && (
                        <p className='text-[11px] text-destructive'>
                          {errors.fromBranchId.message}
                        </p>
                      )}
                    </div>

                    <div className='space-y-1.5'>
                      <Label
                        htmlFor='toBranchId'
                        className='text-xs font-semibold'
                      >
                        {t(
                          'stockTransfers.createDialog.destinationBranch',
                          'Destination Branch'
                        )}{' '}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <Controller
                        name='toBranchId'
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value ?? ''}
                            onValueChange={(val) => field.onChange(val || null)}
                          >
                            <SelectTrigger
                              id='toBranchId'
                              className={cn(
                                'h-9 text-xs',
                                errors.toBranchId && 'border-destructive'
                              )}
                            >
                              <SelectValue
                                placeholder={t(
                                  'stockTransfers.createDialog.selectDestinationBranch',
                                  'Select target branch'
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {branches
                                .filter((b) => b.id !== fromBranchId)
                                .map((b) => (
                                  <SelectItem
                                    key={b.id}
                                    value={b.id}
                                    className='text-xs'
                                  >
                                    {b.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.toBranchId && (
                        <p className='text-[11px] text-destructive'>
                          {errors.toBranchId.message}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Workflow Attributes: Priority, Reason Code, Expected Dates */}
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                {/* Priority */}
                <div className='space-y-1.5'>
                  <Label htmlFor='priority' className='text-xs font-semibold'>
                    Transfer Priority
                  </Label>
                  <Controller
                    name='priority'
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? 'normal'}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id='priority' className='h-9 text-xs'>
                          <SelectValue placeholder='Select priority' />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map((p) => (
                            <SelectItem
                              key={p.value}
                              value={p.value}
                              className='text-xs'
                            >
                              <div className='flex items-center gap-2'>
                                <span
                                  className={cn('h-2 w-2 rounded-full', {
                                    'bg-slate-400': p.value === 'low',
                                    'bg-blue-500': p.value === 'normal',
                                    'bg-amber-500': p.value === 'high',
                                    'bg-rose-500': p.value === 'urgent',
                                  })}
                                />
                                <span>{p.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Reason Code */}
                <div className='space-y-1.5'>
                  <Label
                    htmlFor='reasonCode'
                    className='flex items-center justify-between text-xs font-semibold'
                  >
                    <span>Reason Code</span>
                    <button
                      type='button'
                      onClick={() => setCustomReason(!customReason)}
                      className='text-[10px] font-normal text-primary hover:underline'
                    >
                      {customReason ? 'Choose preset' : 'Custom'}
                    </button>
                  </Label>
                  {customReason ? (
                    <Input
                      id='reasonCode'
                      placeholder='e.g. seasonal_clearance'
                      className='h-9 font-mono text-xs'
                      {...register('reasonCode')}
                    />
                  ) : (
                    <Controller
                      name='reasonCode'
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value ?? 'replenishment'}
                          onValueChange={(val) => {
                            if (val === 'custom') {
                              setCustomReason(true)
                              field.onChange('')
                            } else {
                              field.onChange(val)
                            }
                          }}
                        >
                          <SelectTrigger
                            id='reasonCode'
                            className='h-9 text-xs'
                          >
                            <SelectValue placeholder='Select reason' />
                          </SelectTrigger>
                          <SelectContent>
                            {REASON_CODES.map((r) => (
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
                      )}
                    />
                  )}
                  {errors.reasonCode && (
                    <p className='text-[11px] text-destructive'>
                      {errors.reasonCode.message}
                    </p>
                  )}
                </div>

                {/* Expected Ship Date */}
                <div className='space-y-1.5'>
                  <Label
                    htmlFor='expectedShipDate'
                    className='flex items-center gap-1.5 text-xs font-semibold'
                  >
                    <Calendar className='h-3.5 w-3.5 text-muted-foreground' />
                    Expected Ship Date
                  </Label>
                  <Input
                    id='expectedShipDate'
                    type='date'
                    className={cn(
                      'h-9 text-xs',
                      errors.expectedShipDate && 'border-destructive'
                    )}
                    {...register('expectedShipDate')}
                  />
                  {errors.expectedShipDate && (
                    <p className='text-[11px] text-destructive'>
                      {errors.expectedShipDate.message}
                    </p>
                  )}
                </div>

                {/* Expected Receive Date */}
                <div className='space-y-1.5'>
                  <Label
                    htmlFor='expectedReceiveDate'
                    className='flex items-center gap-1.5 text-xs font-semibold'
                  >
                    <Calendar className='h-3.5 w-3.5 text-muted-foreground' />
                    Expected Receive Date
                  </Label>
                  <Input
                    id='expectedReceiveDate'
                    type='date'
                    min={watchedExpectedShip || undefined}
                    className={cn(
                      'h-9 text-xs',
                      errors.expectedReceiveDate && 'border-destructive'
                    )}
                    {...register('expectedReceiveDate')}
                  />
                  {errors.expectedReceiveDate && (
                    <p className='text-[11px] text-destructive'>
                      {errors.expectedReceiveDate.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Reference & Notes Row */}
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='space-y-1.5'>
                  <Label
                    htmlFor='referenceNo'
                    className='flex items-center gap-1.5 text-xs font-semibold'
                  >
                    <Tag className='h-3.5 w-3.5 text-muted-foreground' />
                    {t(
                      'stockTransfers.createDialog.referenceNo',
                      'Reference / Tracking Code (Optional)'
                    )}
                  </Label>
                  <Input
                    id='referenceNo'
                    placeholder={t(
                      'stockTransfers.createDialog.referencePlaceholder',
                      'Auto-generated (e.g. TRF-2026-XXXX) if empty'
                    )}
                    className={cn(
                      'h-9 font-mono text-xs',
                      errors.referenceNo && 'border-destructive'
                    )}
                    {...register('referenceNo')}
                  />
                  {errors.referenceNo && (
                    <p className='text-[11px] text-destructive'>
                      {errors.referenceNo.message}
                    </p>
                  )}
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='notes' className='text-xs font-semibold'>
                    {t(
                      'stockTransfers.createDialog.notes',
                      'Transfer Notes & Instructions'
                    )}
                  </Label>
                  <Textarea
                    id='notes'
                    placeholder={t(
                      'stockTransfers.createDialog.notesPlaceholder',
                      'Carrier, driver name, vehicle plate, delivery instructions...'
                    )}
                    rows={2}
                    className='min-h-[36px] resize-none text-xs'
                    {...register('notes')}
                  />
                </div>
              </div>

              {/* Line Items Section */}
              <div className='space-y-3.5'>
                <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-2.5'>
                  <div className='flex items-center gap-3'>
                    <h3 className='flex items-center gap-1.5 text-xs font-bold tracking-wider text-foreground uppercase'>
                      <Package className='h-4 w-4 text-primary' />
                      {t(
                        'stockTransfers.createDialog.itemsTitle',
                        'Transfer Line Items'
                      )}{' '}
                      ({fields.length})
                    </h3>
                    {errors.items?.root && (
                      <span className='text-xs text-destructive'>
                        {errors.items.root.message}
                      </span>
                    )}
                  </div>

                  {/* Toggle Advanced Fields */}
                  <div className='flex items-center gap-2'>
                    <SlidersHorizontal className='h-3.5 w-3.5 text-muted-foreground' />
                    <Label
                      htmlFor='advanced-toggle'
                      className='cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground'
                    >
                      {t(
                        'stockTransfers.createDialog.advancedToggle',
                        'Advanced (Condition, Bins, Batch, Serial, Notes)'
                      )}
                    </Label>
                    <Switch
                      id='advanced-toggle'
                      checked={showAdvanced}
                      onCheckedChange={setShowAdvanced}
                    />
                  </div>
                </div>

                {/* Items List */}
                <div className='space-y-3'>
                  {fields.map((field, index) => {
                    const selectedVariantId =
                      watchedItems?.[index]?.productVariantId
                    const _currentCondition =
                      watchedItems?.[index]?.condition || 'good'

                    return (
                      <div
                        key={field.id}
                        className='space-y-3 rounded-xl border bg-card/60 p-3.5 shadow-xs transition-colors hover:border-primary/40'
                      >
                        <div className='grid grid-cols-12 items-start gap-3'>
                          {/* Variant Selector */}
                          <div className='col-span-12 space-y-1 sm:col-span-6'>
                            <div className='flex items-center justify-between'>
                              <Label className='text-xs text-muted-foreground'>
                                {t(
                                  'stockTransfers.createDialog.productVariant',
                                  'Product Variant'
                                )}{' '}
                                <span className='text-destructive'>*</span>
                              </Label>
                              {selectedVariantId && (
                                <span className='text-[10px] text-muted-foreground'>
                                  {allKnownVariants.find(
                                    (v) => v.id === selectedVariantId
                                  )?.brand && (
                                    <span className='mr-1.5 font-medium text-foreground'>
                                      {
                                        allKnownVariants.find(
                                          (v) => v.id === selectedVariantId
                                        )?.brand
                                      }
                                    </span>
                                  )}
                                  {t('stockTransfers.createDialog.uom', 'UOM:')}{' '}
                                  <strong className='text-foreground'>
                                    {allKnownVariants.find(
                                      (v) => v.id === selectedVariantId
                                    )?.uom || 'PCS'}
                                  </strong>
                                </span>
                              )}
                            </div>
                            <Controller
                              name={`items.${index}.productVariantId`}
                              control={control}
                              render={({ field: variantField }) => (
                                <StockTransferProductVirtualCombobox
                                  value={variantField.value}
                                  variants={allKnownVariants}
                                  isLoading={isLoadingVariants}
                                  debounceMs={350}
                                  enableServerSearch={true}
                                  sourceWarehouseId={sourceWarehouseId}
                                  sourceWarehouseName={selectedWarehouse?.name}
                                  originStockMap={
                                    transferType === 'store' ||
                                    transferType === 'inter_store'
                                      ? storeStockMap
                                      : warehouseStockMap
                                  }
                                  onChange={(v) => {
                                    variantField.onChange(v?.id || '')
                                    if (v) {
                                      registerVariant(v)
                                      setValue(
                                        `items.${index}.unitCost`,
                                        v.costPrice || 0
                                      )
                                    }
                                  }}
                                />
                              )}
                            />
                            {errors.items?.[index]?.productVariantId && (
                              <p className='pt-0.5 text-xs text-destructive'>
                                {errors.items[index]?.productVariantId?.message}
                              </p>
                            )}

                            {/* Cross-Warehouse Stock Availability Sourcing */}
                            {isWarehouseMode && selectedVariantId && (
                              <CrossWarehouseStockBadge
                                productVariantId={selectedVariantId}
                                sourceWarehouseId={sourceWarehouseId}
                                sourceWarehouseName={selectedWarehouse?.name}
                                requestedQty={Number(
                                  watchedItems?.[index]?.qty || 1
                                )}
                                onSwitchSourceWarehouse={(newWhId) => {
                                  setValue('sourceWarehouseId', newWhId)
                                }}
                              />
                            )}
                          </div>

                          {/* Quantity */}
                          <div className='col-span-6 space-y-1 sm:col-span-3'>
                            <Label className='text-xs text-muted-foreground'>
                              {t(
                                'stockTransfers.createDialog.qty',
                                'Transfer Qty'
                              )}{' '}
                              <span className='text-destructive'>*</span>
                            </Label>
                            <Input
                              type='number'
                              step='any'
                              min='0.0001'
                              placeholder='1'
                              className={cn(
                                'h-9 text-xs font-semibold',
                                errors.items?.[index]?.qty &&
                                  'border-destructive'
                              )}
                              {...register(`items.${index}.qty`, {
                                valueAsNumber: true,
                              })}
                            />
                            {errors.items?.[index]?.qty && (
                              <p className='pt-0.5 text-xs text-destructive'>
                                {errors.items[index]?.qty?.message}
                              </p>
                            )}
                          </div>

                          {/* Unit Cost */}
                          <div className='col-span-5 space-y-1 sm:col-span-2'>
                            <Label className='text-xs text-muted-foreground'>
                              {t(
                                'stockTransfers.createDialog.unitCost',
                                'Unit Cost ($)'
                              )}
                            </Label>
                            <Input
                              type='number'
                              step='any'
                              min='0'
                              placeholder='0.00'
                              className={cn(
                                'h-9 font-mono text-xs',
                                errors.items?.[index]?.unitCost &&
                                  'border-destructive'
                              )}
                              {...register(`items.${index}.unitCost`, {
                                valueAsNumber: true,
                              })}
                            />
                            {errors.items?.[index]?.unitCost && (
                              <p className='pt-0.5 text-xs text-destructive'>
                                {errors.items[index]?.unitCost?.message}
                              </p>
                            )}
                          </div>

                          {/* Delete Item Button */}
                          <div className='col-span-1 flex justify-end pt-6 sm:col-span-1'>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              disabled={fields.length === 1}
                              onClick={() => remove(index)}
                              className='h-8 w-8 text-muted-foreground hover:text-destructive'
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </div>
                        </div>

                        {/* Collapsible Advanced Item Options */}
                        {showAdvanced && (
                          <div className='space-y-3 rounded-lg border-t bg-muted/15 p-3 pt-2.5'>
                            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4'>
                              {/* Condition */}
                              <div className='space-y-1'>
                                <Label className='text-[11px] text-muted-foreground'>
                                  {t(
                                    'stockTransfers.createDialog.condition',
                                    'Condition'
                                  )}
                                </Label>
                                <Controller
                                  name={`items.${index}.condition`}
                                  control={control}
                                  render={({ field: condField }) => (
                                    <Select
                                      value={condField.value ?? 'good'}
                                      onValueChange={condField.onChange}
                                    >
                                      <SelectTrigger className='h-8 text-xs'>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {CONDITIONS.map((c) => (
                                          <SelectItem
                                            key={c.value}
                                            value={c.value}
                                            className='text-xs'
                                          >
                                            {t(
                                              `stockTransfers.conditions.${c.value}`,
                                              c.label
                                            )}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                              </div>

                              {/* Source Location */}
                              {isWarehouseMode && (
                                <div className='space-y-1'>
                                  <Label className='text-[11px] text-muted-foreground'>
                                    {t(
                                      'stockTransfers.createDialog.sourceLocation',
                                      'Source Location (Bin)'
                                    )}
                                  </Label>
                                  <Controller
                                    name={`items.${index}.sourceLocationId`}
                                    control={control}
                                    render={({ field: locField }) => (
                                      <Select
                                        value={locField.value ?? 'none'}
                                        onValueChange={(val) =>
                                          locField.onChange(
                                            val === 'none' ? null : val
                                          )
                                        }
                                      >
                                        <SelectTrigger className='h-8 text-xs'>
                                          <SelectValue
                                            placeholder={t(
                                              'stockTransfers.createDialog.default',
                                              'Default Bin'
                                            )}
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem
                                            value='none'
                                            className='text-xs'
                                          >
                                            {t(
                                              'stockTransfers.createDialog.defaultLocation',
                                              'Default Location'
                                            )}
                                          </SelectItem>
                                          {sourceLocations.map((loc) => (
                                            <SelectItem
                                              key={loc.id}
                                              value={loc.id}
                                              className='text-xs'
                                            >
                                              {loc.code}{' '}
                                              {loc.name ? `(${loc.name})` : ''}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  />
                                </div>
                              )}

                              {/* Destination Location */}
                              {isWarehouseMode && (
                                <div className='space-y-1'>
                                  <Label className='text-[11px] text-muted-foreground'>
                                    {t(
                                      'stockTransfers.createDialog.targetLocation',
                                      'Target Location (Bin)'
                                    )}
                                  </Label>
                                  <Controller
                                    name={`items.${index}.destinationLocationId`}
                                    control={control}
                                    render={({ field: locField }) => (
                                      <Select
                                        value={locField.value ?? 'none'}
                                        onValueChange={(val) =>
                                          locField.onChange(
                                            val === 'none' ? null : val
                                          )
                                        }
                                      >
                                        <SelectTrigger
                                          className={cn(
                                            'h-8 text-xs',
                                            errors.items?.[index]
                                              ?.destinationLocationId &&
                                              'border-destructive'
                                          )}
                                        >
                                          <SelectValue
                                            placeholder={t(
                                              'stockTransfers.createDialog.default',
                                              'Default Bin'
                                            )}
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem
                                            value='none'
                                            className='text-xs'
                                          >
                                            {t(
                                              'stockTransfers.createDialog.defaultLocation',
                                              'Default Location'
                                            )}
                                          </SelectItem>
                                          {destLocations.map((loc) => (
                                            <SelectItem
                                              key={loc.id}
                                              value={loc.id}
                                              className='text-xs'
                                            >
                                              {loc.code}{' '}
                                              {loc.name ? `(${loc.name})` : ''}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  />
                                  {errors.items?.[index]
                                    ?.destinationLocationId && (
                                    <p className='text-[10px] text-destructive'>
                                      {
                                        errors.items[index]
                                          ?.destinationLocationId?.message
                                      }
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Batch ID */}
                              <div className='space-y-1'>
                                <Label className='text-[11px] text-muted-foreground'>
                                  {t(
                                    'stockTransfers.createDialog.batchNo',
                                    'Batch # (Optional)'
                                  )}
                                </Label>
                                <Input
                                  placeholder={t(
                                    'stockTransfers.createDialog.batchPlaceholder',
                                    'Batch ID'
                                  )}
                                  className={cn(
                                    'h-8 font-mono text-xs',
                                    errors.items?.[index]?.batchId &&
                                      'border-destructive'
                                  )}
                                  {...register(`items.${index}.batchId`)}
                                />
                              </div>

                              {/* Serial ID */}
                              <div className='space-y-1'>
                                <Label className='text-[11px] text-muted-foreground'>
                                  {t(
                                    'stockTransfers.createDialog.serialNo',
                                    'Serial # (Optional)'
                                  )}
                                </Label>
                                <Input
                                  placeholder={t(
                                    'stockTransfers.createDialog.serialPlaceholder',
                                    'Serial ID'
                                  )}
                                  className={cn(
                                    'h-8 font-mono text-xs',
                                    errors.items?.[index]?.serialId &&
                                      'border-destructive'
                                  )}
                                  {...register(`items.${index}.serialId`)}
                                />
                              </div>

                              {/* Line Item Notes */}
                              <div className='col-span-1 space-y-1 sm:col-span-2 md:col-span-3'>
                                <Label className='text-[11px] text-muted-foreground'>
                                  Line Item Instructions & Notes
                                </Label>
                                <Input
                                  placeholder='e.g. Fragile box, repackaged, or defect observation...'
                                  className='h-8 text-xs'
                                  {...register(`items.${index}.notes`)}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    append({
                      productVariantId: '',
                      qty: 1,
                      unitCost: 0,
                      condition: 'good',
                      sourceLocationId: null,
                      destinationLocationId: null,
                      batchId: null,
                      serialId: null,
                      notes: null,
                    })
                  }
                  className='gap-1.5'
                >
                  <Plus className='h-4 w-4' />
                  {t('stockTransfers.createDialog.addItem', 'Add Another Item')}
                </Button>
              </div>

              {/* Summary Totals Card */}
              <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3.5 text-xs'>
                <div className='flex flex-wrap items-center gap-4'>
                  <div>
                    <span className='text-muted-foreground'>
                      {t('stockTransfers.createDialog.lines', 'Lines:')}{' '}
                    </span>
                    <strong className='text-foreground'>
                      {totals.lineCount}
                    </strong>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>
                      {t(
                        'stockTransfers.createDialog.totalQty',
                        'Total Units:'
                      )}{' '}
                    </span>
                    <strong className='text-foreground'>
                      {totals.totalQty}
                    </strong>
                  </div>
                  {totals.totalWeight > 0 && (
                    <div className='flex items-center gap-1 text-muted-foreground'>
                      <Scale className='h-3 w-3' />
                      <span>{totals.totalWeight.toFixed(2)} kg</span>
                    </div>
                  )}
                </div>

                <div className='flex flex-wrap items-center gap-4 font-mono'>
                  <div>
                    <span className='text-muted-foreground'>
                      {t(
                        'stockTransfers.createDialog.costValuation',
                        'Cost:'
                      )}{' '}
                    </span>
                    <strong className='text-foreground'>
                      ${totals.totalCost.toFixed(2)}
                    </strong>
                  </div>
                  {totals.totalPriceValuation > 0 && (
                    <div>
                      <span className='text-muted-foreground'>
                        {t(
                          'stockTransfers.createDialog.retailValuation',
                          'Retail:'
                        )}{' '}
                      </span>
                      <strong className='text-foreground'>
                        ${totals.totalPriceValuation.toFixed(2)}
                      </strong>
                    </div>
                  )}
                  {totals.potentialMarkup > 0 && (
                    <div className='flex items-center gap-1 text-emerald-600'>
                      <TrendingUp className='h-3 w-3' />
                      <span>+{totals.markupPercent.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className='flex shrink-0 flex-row items-center justify-between border-t bg-muted/10 p-4 sm:justify-between'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={handleReset}
              disabled={isSubmitting}
            >
              {t('common.reset', 'Reset')}
            </Button>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type='submit' size='sm' disabled={isSubmitting}>
                {isSubmitting
                  ? t('common.saving', 'Saving...')
                  : isEdit
                    ? t('common.saveChanges', 'Save Changes')
                    : t(
                        'stockTransfers.createDialog.submit',
                        'Create Transfer'
                      )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
