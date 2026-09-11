import { useMemo, useState } from 'react'
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
  Package,
  Plus,
  SlidersHorizontal,
  Store,
  Trash2,
  Warehouse,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  useBranchOptions,
  useStoreOnHand,
  useStoreOptions,
  useVariantOptions,
  useWarehouseLocationOptions,
  useWarehouseOnHand,
  useWarehouseOptions,
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
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  createTransferInputSchema,
  type CreateTransferInput,
  type StockCondition,
} from '../data/schema'
import { useCreateTransfer } from '../hooks/use-stock-transfers'

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

const defaultValues: CreateTransferInput = {
  transferType: 'warehouse',
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
    },
  ],
}

export function TransferCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const createTransfer = useCreateTransfer()
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [search, setSearch] = useState('')

  const { data: warehouses = [] } = useWarehouseOptions()
  const { data: stores = [] } = useStoreOptions()
  const { data: branches = [] } = useBranchOptions()
  const { data: variants = [] } = useVariantOptions(search)

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
  const watchedItems = watch('items')

  // Stock on hand lookups
  const { data: warehouseStockMap = {} } = useWarehouseOnHand(
    transferType === 'warehouse' ? (sourceWarehouseId ?? undefined) : undefined
  )
  const { data: storeStockMap = {} } = useStoreOnHand(
    transferType === 'store' ? (fromStoreId ?? undefined) : undefined
  )

  // Location lookups for warehouses
  const { data: sourceLocations = [] } = useWarehouseLocationOptions(
    transferType === 'warehouse' ? (sourceWarehouseId ?? undefined) : undefined
  )
  const { data: destLocations = [] } = useWarehouseLocationOptions(
    transferType === 'warehouse'
      ? (destinationWarehouseId ?? undefined)
      : undefined
  )

  const handleReset = () => {
    reset(defaultValues)
    setShowAdvanced(false)
    setSearch('')
  }

  const handleTypeChange = (type: 'warehouse' | 'store' | 'branch') => {
    setValue('transferType', type)
    setValue('sourceWarehouseId', null)
    setValue('destinationWarehouseId', null)
    setValue('fromStoreId', null)
    setValue('toStoreId', null)
    setValue('fromBranchId', null)
    setValue('toBranchId', null)
  }

  // Calculate live summary
  const totals = useMemo(() => {
    const totalQty = (watchedItems || []).reduce(
      (acc, item) => acc + (Number(item?.qty) || 0),
      0
    )
    const totalCost = (watchedItems || []).reduce(
      (acc, item) =>
        acc + (Number(item?.qty) || 0) * (Number(item?.unitCost) || 0),
      0
    )
    return {
      lineCount: watchedItems?.length || 0,
      totalQty,
      totalCost,
    }
  }, [watchedItems])

  const onSubmit = async (data: CreateTransferInput) => {
    try {
      await createTransfer.mutateAsync(data)
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
      <DialogContent className='flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-3xl'>
        <DialogHeader className='border-b p-6 pb-4'>
          <DialogTitle className='flex items-center gap-2 text-xl font-bold'>
            <Package className='h-5 w-5 text-primary' />
            {t('stockTransfers.createTransfer', {
              defaultValue: 'New Stock Transfer',
            })}
          </DialogTitle>
          <DialogDescription>
            {t('stockTransfers.description', {
              defaultValue:
                'Transfer stock between warehouses, stores, or branches with tracked approval workflows.',
            })}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className='flex flex-1 flex-col overflow-hidden'
        >
          <ScrollArea className='flex-1 space-y-6 p-6'>
            <div className='space-y-6'>
              {/* Transfer Type Selector */}
              <div className='space-y-2'>
                <Label className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                  Transfer Routing Type
                </Label>
                <Tabs
                  value={transferType}
                  onValueChange={(val) =>
                    handleTypeChange(val as 'warehouse' | 'store' | 'branch')
                  }
                  className='w-full'
                >
                  <TabsList className='grid w-full grid-cols-3'>
                    <TabsTrigger value='warehouse' className='gap-2'>
                      <Warehouse className='h-4 w-4' />
                      Warehouse → Warehouse
                    </TabsTrigger>
                    <TabsTrigger value='store' className='gap-2'>
                      <Store className='h-4 w-4' />
                      Store → Store
                    </TabsTrigger>
                    <TabsTrigger value='branch' className='gap-2'>
                      <Building2 className='h-4 w-4' />
                      Branch → Branch
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Source & Destination Selectors */}
              <div className='grid grid-cols-1 gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2'>
                {/* WAREHOUSE ROUTING */}
                {transferType === 'warehouse' && (
                  <>
                    <div className='space-y-2'>
                      <Label
                        htmlFor='sourceWarehouseId'
                        className='text-sm font-medium'
                      >
                        Source Warehouse{' '}
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
                                errors.sourceWarehouseId && 'border-destructive'
                              )}
                            >
                              <SelectValue placeholder='Select origin warehouse' />
                            </SelectTrigger>
                            <SelectContent>
                              {warehouses.map((w) => (
                                <SelectItem key={w.id} value={w.id}>
                                  {w.name} ({w.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.sourceWarehouseId && (
                        <p className='text-xs text-destructive'>
                          {errors.sourceWarehouseId.message}
                        </p>
                      )}
                    </div>

                    <div className='space-y-2'>
                      <Label
                        htmlFor='destinationWarehouseId'
                        className='text-sm font-medium'
                      >
                        Destination Warehouse{' '}
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
                                errors.destinationWarehouseId &&
                                  'border-destructive'
                              )}
                            >
                              <SelectValue placeholder='Select target warehouse' />
                            </SelectTrigger>
                            <SelectContent>
                              {warehouses
                                .filter((w) => w.id !== sourceWarehouseId)
                                .map((w) => (
                                  <SelectItem key={w.id} value={w.id}>
                                    {w.name} ({w.code})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.destinationWarehouseId && (
                        <p className='text-xs text-destructive'>
                          {errors.destinationWarehouseId.message}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* STORE ROUTING */}
                {transferType === 'store' && (
                  <>
                    <div className='space-y-2'>
                      <Label
                        htmlFor='fromStoreId'
                        className='text-sm font-medium'
                      >
                        Source Store <span className='text-destructive'>*</span>
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
                                errors.fromStoreId && 'border-destructive'
                              )}
                            >
                              <SelectValue placeholder='Select origin store' />
                            </SelectTrigger>
                            <SelectContent>
                              {stores.map((s) => (
                                <SelectItem key={s.store_id} value={s.store_id}>
                                  {s.name || s.store_id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.fromStoreId && (
                        <p className='text-xs text-destructive'>
                          {errors.fromStoreId.message}
                        </p>
                      )}
                    </div>

                    <div className='space-y-2'>
                      <Label
                        htmlFor='toStoreId'
                        className='text-sm font-medium'
                      >
                        Destination Store{' '}
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
                                errors.toStoreId && 'border-destructive'
                              )}
                            >
                              <SelectValue placeholder='Select target store' />
                            </SelectTrigger>
                            <SelectContent>
                              {stores
                                .filter((s) => s.store_id !== fromStoreId)
                                .map((s) => (
                                  <SelectItem
                                    key={s.store_id}
                                    value={s.store_id}
                                  >
                                    {s.name || s.store_id}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.toStoreId && (
                        <p className='text-xs text-destructive'>
                          {errors.toStoreId.message}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* BRANCH ROUTING */}
                {transferType === 'branch' && (
                  <>
                    <div className='space-y-2'>
                      <Label
                        htmlFor='fromBranchId'
                        className='text-sm font-medium'
                      >
                        Source Branch{' '}
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
                                errors.fromBranchId && 'border-destructive'
                              )}
                            >
                              <SelectValue placeholder='Select origin branch' />
                            </SelectTrigger>
                            <SelectContent>
                              {branches.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.fromBranchId && (
                        <p className='text-xs text-destructive'>
                          {errors.fromBranchId.message}
                        </p>
                      )}
                    </div>

                    <div className='space-y-2'>
                      <Label
                        htmlFor='toBranchId'
                        className='text-sm font-medium'
                      >
                        Destination Branch{' '}
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
                                errors.toBranchId && 'border-destructive'
                              )}
                            >
                              <SelectValue placeholder='Select target branch' />
                            </SelectTrigger>
                            <SelectContent>
                              {branches
                                .filter((b) => b.id !== fromBranchId)
                                .map((b) => (
                                  <SelectItem key={b.id} value={b.id}>
                                    {b.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.toBranchId && (
                        <p className='text-xs text-destructive'>
                          {errors.toBranchId.message}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Reference & Notes */}
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='referenceNo' className='text-sm'>
                    Reference / PO # (Optional)
                  </Label>
                  <Input
                    id='referenceNo'
                    placeholder='e.g. TR-2026-001'
                    {...register('referenceNo')}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='notes' className='text-sm'>
                    Transfer Notes & Instructions
                  </Label>
                  <Textarea
                    id='notes'
                    placeholder='Reason, driver, or handling instructions...'
                    rows={2}
                    className='resize-none'
                    {...register('notes')}
                  />
                </div>
              </div>

              {/* Line Items Section */}
              <div className='space-y-4'>
                <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-2'>
                  <div className='flex items-center gap-3'>
                    <h3 className='text-sm font-bold tracking-wider text-foreground uppercase'>
                      Transfer Items ({fields.length})
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
                      className='cursor-pointer text-xs font-medium'
                    >
                      Advanced Fields (Condition, Locations, Batch, Serial)
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
                    const onHandStock =
                      transferType === 'warehouse'
                        ? warehouseStockMap[selectedVariantId]
                        : transferType === 'store'
                          ? storeStockMap[selectedVariantId]
                          : undefined

                    return (
                      <div
                        key={field.id}
                        className='space-y-3 rounded-xl border bg-card/60 p-3.5 shadow-xs transition-colors hover:border-primary/40'
                      >
                        <div className='grid grid-cols-12 items-start gap-3'>
                          {/* Variant Selector */}
                          <div className='col-span-12 space-y-1 sm:col-span-5'>
                            <Label className='text-xs text-muted-foreground'>
                              Product Variant{' '}
                              <span className='text-destructive'>*</span>
                            </Label>
                            <Controller
                              name={`items.${index}.productVariantId`}
                              control={control}
                              render={({ field: variantField }) => (
                                <Select
                                  value={variantField.value}
                                  onValueChange={(val) => {
                                    variantField.onChange(val)
                                    // Auto-populate cost if available
                                    const v = variants.find(
                                      (item) => item.id === val
                                    )
                                    if (v?.cost_price != null) {
                                      setValue(
                                        `items.${index}.unitCost`,
                                        Number(v.cost_price)
                                      )
                                    }
                                  }}
                                >
                                  <SelectTrigger
                                    className={cn(
                                      'w-full',
                                      errors.items?.[index]?.productVariantId &&
                                        'border-destructive'
                                    )}
                                  >
                                    <SelectValue placeholder='Select product / SKU' />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {variants.map((v) => (
                                      <SelectItem key={v.id} value={v.id}>
                                        {v.sku} — {v.products?.name ?? 'Item'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            {errors.items?.[index]?.productVariantId && (
                              <p className='pt-0.5 text-xs text-destructive'>
                                {errors.items[index]?.productVariantId?.message}
                              </p>
                            )}
                            {onHandStock !== undefined && (
                              <p className='pt-0.5 text-[11px] text-muted-foreground'>
                                Available on hand:{' '}
                                <span className='font-semibold text-foreground'>
                                  {onHandStock}
                                </span>
                              </p>
                            )}
                          </div>

                          {/* Quantity */}
                          <div className='col-span-6 space-y-1 sm:col-span-3'>
                            <Label className='text-xs text-muted-foreground'>
                              Qty <span className='text-destructive'>*</span>
                            </Label>
                            <Input
                              type='number'
                              step='any'
                              min='0.0001'
                              placeholder='1'
                              className={cn(
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
                          <div className='col-span-5 space-y-1 sm:col-span-3'>
                            <Label className='text-xs text-muted-foreground'>
                              Unit Cost ($)
                            </Label>
                            <Input
                              type='number'
                              step='any'
                              min='0'
                              placeholder='0.00'
                              className={cn(
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
                          <div className='grid grid-cols-1 gap-3 rounded-lg border-t bg-muted/10 p-2.5 pt-2 sm:grid-cols-4'>
                            {/* Condition */}
                            <div className='space-y-1'>
                              <Label className='text-[11px] text-muted-foreground'>
                                Condition
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
                                        >
                                          {c.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>

                            {/* Source Location */}
                            {transferType === 'warehouse' && (
                              <div className='space-y-1'>
                                <Label className='text-[11px] text-muted-foreground'>
                                  Source Location
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
                                        <SelectValue placeholder='Default' />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value='none'>
                                          Default Location
                                        </SelectItem>
                                        {sourceLocations.map((loc) => (
                                          <SelectItem
                                            key={loc.id}
                                            value={loc.id}
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
                            {transferType === 'warehouse' && (
                              <div className='space-y-1'>
                                <Label className='text-[11px] text-muted-foreground'>
                                  Target Location
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
                                      <SelectTrigger className='h-8 text-xs'>
                                        <SelectValue placeholder='Default' />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value='none'>
                                          Default Location
                                        </SelectItem>
                                        {destLocations.map((loc) => (
                                          <SelectItem
                                            key={loc.id}
                                            value={loc.id}
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

                            {/* Batch ID */}
                            <div className='space-y-1'>
                              <Label className='text-[11px] text-muted-foreground'>
                                Batch # (Optional)
                              </Label>
                              <Input
                                placeholder='Batch ID'
                                className={cn(
                                  'h-8 text-xs',
                                  errors.items?.[index]?.batchId &&
                                    'border-destructive'
                                )}
                                {...register(`items.${index}.batchId`)}
                              />
                              {errors.items?.[index]?.batchId && (
                                <p className='pt-0.5 text-xs text-destructive'>
                                  {errors.items[index]?.batchId?.message}
                                </p>
                              )}
                            </div>

                            {/* Serial ID */}
                            <div className='space-y-1'>
                              <Label className='text-[11px] text-muted-foreground'>
                                Serial # (Optional)
                              </Label>
                              <Input
                                placeholder='Serial ID'
                                className={cn(
                                  'h-8 text-xs',
                                  errors.items?.[index]?.serialId &&
                                    'border-destructive'
                                )}
                                {...register(`items.${index}.serialId`)}
                              />
                              {errors.items?.[index]?.serialId && (
                                <p className='pt-0.5 text-xs text-destructive'>
                                  {errors.items[index]?.serialId?.message}
                                </p>
                              )}
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
                    })
                  }
                  className='gap-1.5'
                >
                  <Plus className='h-4 w-4' />
                  Add Another Item
                </Button>
              </div>

              {/* Summary Totals Card */}
              <div className='flex flex-wrap items-center justify-between rounded-xl border bg-muted/30 p-3.5 text-xs'>
                <div className='flex items-center gap-4'>
                  <div>
                    <span className='text-muted-foreground'>Lines: </span>
                    <span className='font-bold text-foreground'>
                      {totals.lineCount}
                    </span>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>Total Units: </span>
                    <span className='font-bold text-foreground'>
                      {totals.totalQty}
                    </span>
                  </div>
                </div>
                <div>
                  <span className='text-muted-foreground'>
                    Estimated Value:{' '}
                  </span>
                  <span className='font-bold text-foreground'>
                    ${totals.totalCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className='flex-row justify-end gap-2 border-t bg-muted/10 p-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                handleReset()
                onOpenChange(false)
              }}
              disabled={isSubmitting || createTransfer.isPending}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={isSubmitting || createTransfer.isPending}
              className='min-w-30 bg-primary text-primary-foreground'
            >
              {isSubmitting || createTransfer.isPending
                ? 'Creating...'
                : 'Create Transfer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
