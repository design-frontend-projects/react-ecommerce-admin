import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, AlertCircle, Warehouse, Store, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import {
  useWarehouseOptions,
  useWarehouseLocationOptions,
  useStoreOptions,
  useVariantOptions,
} from '@/hooks/use-inventory-lookups'
import {
  adjustmentSchema,
  type AdjustmentFormData,
  stockAdjustmentReasonCodes,
} from '../data/adjustment-schema'
import type { StockBalanceRow } from '../data/schema'
import { useAdjustStock } from '../hooks/use-stock-balances'

interface Props {
  currentRow: StockBalanceRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const getReasonLabels = (t: TFunction): Record<string, string> => ({
  physical_audit: t('stockBalances.reasons.physical_audit', 'Physical Count Audit'),
  cycle_count: t('stockBalances.reasons.cycle_count', 'Routine Cycle Count'),
  damaged: t('stockBalances.reasons.damaged', 'Damaged Goods Write-off'),
  expired: t('stockBalances.reasons.expired', 'Expired Stock Disposal'),
  theft_loss: t('stockBalances.reasons.theft_loss', 'Theft or Shrinkage'),
  received_variance: t('stockBalances.reasons.received_variance', 'Receipt Discrepancy'),
  data_correction: t('stockBalances.reasons.data_correction', 'Data Entry Correction'),
  other: t('stockBalances.reasons.other', 'Other (Specify Below)'),
})

export function AdjustmentDialog({ currentRow, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const { getToken } = useAuth()
  const adjustMutation = useAdjustStock()
  const reasonLabels = useMemo(() => getReasonLabels(t), [t])

  const { data: warehouses = [] } = useWarehouseOptions()
  const { data: stores = [] } = useStoreOptions()
  const { data: variants = [] } = useVariantOptions()

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null)
  const { data: locations = [] } = useWarehouseLocationOptions(
    selectedWarehouseId || undefined
  )

  const defaultValues: AdjustmentFormData = useMemo(
    () => ({
      location_type: currentRow?.warehouse_id ? 'warehouse' : 'store',
      warehouse_id: currentRow?.warehouse_id || '',
      location_id: currentRow?.location_id || '',
      store_id: currentRow?.store_id || '',
      product_variant_id: currentRow?.product_variant_id || '',
      condition: (currentRow?.condition as AdjustmentFormData['condition']) || 'good',
      adjustment_type: 'set',
      quantity: currentRow ? Number(currentRow.qty_on_hand) : 0,
      unit_cost: currentRow ? Number(currentRow.avg_cost) : 0,
      reason_code: 'physical_audit',
      reason: '',
      batch_id: currentRow?.batch_id || null,
      serial_id: currentRow?.serial_id || null,
    }),
    [currentRow]
  )

  const form = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema) as Resolver<AdjustmentFormData>,
    defaultValues,
  })

  // Synchronize when currentRow changes
  useEffect(() => {
    if (open) {
      const isWh = Boolean(currentRow?.warehouse_id)
      setSelectedWarehouseId(currentRow?.warehouse_id || null)
      form.reset({
        location_type: isWh ? 'warehouse' : 'store',
        warehouse_id: currentRow?.warehouse_id || '',
        location_id: currentRow?.location_id || '',
        store_id: currentRow?.store_id || '',
        product_variant_id: currentRow?.product_variant_id || '',
        condition: (currentRow?.condition as AdjustmentFormData['condition']) || 'good',
        adjustment_type: 'set',
        quantity: currentRow ? Number(currentRow.qty_on_hand) : 0,
        unit_cost: currentRow ? Number(currentRow.avg_cost) : 0,
        reason_code: 'physical_audit',
        reason: '',
        batch_id: currentRow?.batch_id || null,
        serial_id: currentRow?.serial_id || null,
      })
    } else {
      form.reset()
    }
  }, [currentRow, open, form])

  const watchedType = form.watch('adjustment_type')
  const watchedQty = Number(form.watch('quantity') || 0)
  const watchedLocType = form.watch('location_type')
  const currentOnHand = currentRow ? Number(currentRow.qty_on_hand) : 0
  const currentReserved = currentRow ? Number(currentRow.qty_reserved) : 0

  // Calculate projected new balance
  const projectedOnHand =
    watchedType === 'set' ? watchedQty : currentOnHand + watchedQty
  const projectedDelta =
    watchedType === 'set' ? watchedQty - currentOnHand : watchedQty
  const projectedAvailable = Math.max(0, projectedOnHand - currentReserved)

  const onSubmit = (values: AdjustmentFormData) => {
    adjustMutation.mutate(
      { values, getToken },
      {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      }
    )
  }

  const productName =
    currentRow?.product_variants?.products?.name ||
    t('stockBalances.adjustmentDialog.newTitle', 'New Stock Adjustment')
  const sku = currentRow?.product_variants?.sku || ''

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) form.reset()
      }}
    >
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-xl font-bold'>
            <Package className='h-5 w-5 text-primary' />
            {currentRow
              ? t('stockBalances.adjustmentDialog.adjustTitle', 'Adjust Stock Balance')
              : t('stockBalances.adjustmentDialog.newTitle', 'New Stock Adjustment')}
          </DialogTitle>
          <DialogDescription>
            {currentRow
              ? `${productName} (${sku})`
              : t(
                  'stockBalances.adjustmentDialog.newDesc',
                  'Record a physical audit, write-off, or inventory adjustment.'
                )}
          </DialogDescription>
        </DialogHeader>

        {/* Live Calculation Preview Banner */}
        <div className='rounded-lg border bg-muted/40 p-4'>
          <div className='flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            <span>{t('stockBalances.adjustmentDialog.currentOnHand', 'Current On-Hand')}</span>
            <span>{t('stockBalances.adjustmentDialog.adjustment', 'Adjustment')}</span>
            <span>{t('stockBalances.adjustmentDialog.newOnHand', 'New On-Hand')}</span>
          </div>
          <div className='mt-2 flex items-center justify-between'>
            <div className='text-center'>
              <span className='font-mono text-2xl font-bold text-foreground'>
                {currentOnHand.toLocaleString()}
              </span>
              <p className='text-[11px] text-muted-foreground'>
                {t('stockBalances.adjustmentDialog.available', {
                  qty: Math.max(0, currentOnHand - currentReserved).toLocaleString(),
                  defaultValue: `Available: ${Math.max(0, currentOnHand - currentReserved).toLocaleString()}`,
                })}
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <ArrowRight className='h-4 w-4 text-muted-foreground' />
              <Badge
                variant={
                  projectedDelta > 0
                    ? 'default'
                    : projectedDelta < 0
                      ? 'destructive'
                      : 'secondary'
                }
                className='font-mono text-xs'
              >
                {projectedDelta > 0 ? `+${projectedDelta}` : projectedDelta}
              </Badge>
              <ArrowRight className='h-4 w-4 text-muted-foreground' />
            </div>
            <div className='text-center'>
              <span
                className={`font-mono text-2xl font-bold ${
                  projectedOnHand < 0 ? 'text-destructive' : 'text-primary'
                }`}
              >
                {projectedOnHand.toLocaleString()}
              </span>
              <p className='text-[11px] text-muted-foreground'>
                {t('stockBalances.adjustmentDialog.available', {
                  qty: projectedAvailable.toLocaleString(),
                  defaultValue: `Available: ${projectedAvailable.toLocaleString()}`,
                })}
              </p>
            </div>
          </div>
          {projectedOnHand < 0 && (
            <div className='mt-2 flex items-center gap-1.5 text-xs text-destructive'>
              <AlertCircle className='h-4 w-4' />
              {t(
                'stockBalances.adjustmentDialog.negativeWarning',
                'Warning: This adjustment will result in negative stock.'
              )}
            </div>
          )}
        </div>

        <Form {...form}>
          <form
            id='adjustment-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            {/* Location Type Selection */}
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='location_type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('stockBalances.adjustmentDialog.facilityType', 'Location Facility')}
                    </FormLabel>
                    <Select
                      disabled={!!currentRow}
                      onValueChange={(val: 'warehouse' | 'store') => {
                        field.onChange(val)
                        if (val === 'warehouse') {
                          form.setValue('store_id', '')
                        } else {
                          form.setValue('warehouse_id', '')
                          form.setValue('location_id', '')
                          setSelectedWarehouseId(null)
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              'stockBalances.adjustmentDialog.selectFacilityType',
                              'Select facility type'
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='warehouse'>
                          <div className='flex items-center gap-2'>
                            <Warehouse className='h-4 w-4 text-muted-foreground' />
                            {t('stockBalances.adjustmentDialog.warehouse', 'Warehouse')}
                          </div>
                        </SelectItem>
                        <SelectItem value='store'>
                          <div className='flex items-center gap-2'>
                            <Store className='h-4 w-4 text-muted-foreground' />
                            {t(
                              'stockBalances.adjustmentDialog.storeRetail',
                              'Store / Retail Unit'
                            )}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedLocType === 'warehouse' ? (
                <FormField
                  control={form.control}
                  name='warehouse_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('stockBalances.adjustmentDialog.warehouse', 'Warehouse')}
                      </FormLabel>
                      <Select
                        disabled={!!currentRow}
                        onValueChange={(val) => {
                          field.onChange(val)
                          setSelectedWarehouseId(val)
                          form.setValue('location_id', '')
                        }}
                        value={field.value ?? ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                'stockBalances.adjustmentDialog.selectWarehouse',
                                'Select warehouse'
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {warehouses.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.name} ({w.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name='store_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('stockBalances.adjustmentDialog.storeRetail', 'Store')}
                      </FormLabel>
                      <Select
                        disabled={!!currentRow}
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                'stockBalances.adjustmentDialog.selectStore',
                                'Select store'
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stores.map((s) => (
                            <SelectItem key={s.store_id} value={s.store_id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Warehouse Bin Location (if warehouse selected) */}
            {watchedLocType === 'warehouse' && (
              <FormField
                control={form.control}
                name='location_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t(
                        'stockBalances.adjustmentDialog.binLocation',
                        'Warehouse Location / Bin (Optional)'
                      )}
                    </FormLabel>
                    <Select
                      disabled={!!currentRow || !selectedWarehouseId}
                      onValueChange={field.onChange}
                      value={field.value ?? ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedWarehouseId
                                ? t(
                                    'stockBalances.adjustmentDialog.selectWarehouseFirst',
                                    'Select warehouse first'
                                  )
                                : locations.length === 0
                                  ? t(
                                      'stockBalances.adjustmentDialog.noBins',
                                      'No bin locations configured'
                                    )
                                  : t(
                                      'stockBalances.adjustmentDialog.selectBin',
                                      'Select bin location'
                                    )
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.code} {loc.name ? `— ${loc.name}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Product Variant Picker */}
            <FormField
              control={form.control}
              name='product_variant_id'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('stockBalances.adjustmentDialog.productVariant', 'Product Variant / SKU')}
                  </FormLabel>
                  <Select
                    disabled={!!currentRow}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            currentRow
                              ? `${currentRow.product_variants?.products?.name || ''} — SKU: ${currentRow.product_variants?.sku || ''}`
                              : t(
                                  'stockBalances.adjustmentDialog.selectVariant',
                                  'Select variant by SKU or name'
                                )
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className='max-h-60'>
                      {variants.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          <div className='flex items-center gap-2'>
                            <span className='font-mono font-medium'>{v.sku}</span>
                            <span className='text-muted-foreground'>
                              {v.products?.name ? `(${v.products.name})` : ''}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Condition & Unit Cost */}
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='condition'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('stockBalances.adjustmentDialog.condition', 'Stock Condition')}
                    </FormLabel>
                    <Select
                      disabled={!!currentRow}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              'stockBalances.adjustmentDialog.selectCondition',
                              'Select condition'
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='good'>
                          {t('stockBalances.conditions.goodDefault', 'Good (Default)')}
                        </SelectItem>
                        <SelectItem value='damaged'>
                          {t('stockBalances.conditions.damaged', 'Damaged')}
                        </SelectItem>
                        <SelectItem value='refurbished'>
                          {t('stockBalances.conditions.refurbished', 'Refurbished')}
                        </SelectItem>
                        <SelectItem value='returned'>
                          {t('stockBalances.conditions.returned', 'Returned')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='unit_cost'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('stockBalances.adjustmentDialog.unitCost', 'Unit Cost ($)')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.0001'
                        min={0}
                        placeholder='0.00'
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                    </FormControl>
                    <FormDescription className='text-[11px]'>
                      {t(
                        'stockBalances.adjustmentDialog.unitCostHelp',
                        'Used for inventory moving average cost calculation'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Adjustment Mode & Quantity */}
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='adjustment_type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('stockBalances.adjustmentDialog.mode', 'Adjustment Mode')}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              'stockBalances.adjustmentDialog.selectMode',
                              'Select mode'
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='set'>
                          {t('stockBalances.adjustmentDialog.modeSet', 'Set Exact New Quantity')}
                        </SelectItem>
                        <SelectItem value='offset'>
                          {t(
                            'stockBalances.adjustmentDialog.modeOffset',
                            'Add / Subtract Offset (+/-)'
                          )}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='quantity'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {watchedType === 'set'
                        ? t('stockBalances.adjustmentDialog.newQtyOnHand', 'New Quantity On Hand')
                        : t('stockBalances.adjustmentDialog.offsetQty', 'Offset (+ or -)')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='any'
                        placeholder={
                          watchedType === 'set'
                            ? t('stockBalances.adjustmentDialog.qtyPlaceholderSet', 'e.g. 100')
                            : t(
                                'stockBalances.adjustmentDialog.qtyPlaceholderOffset',
                                'e.g. -5 or +10'
                              )
                        }
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Reason Code & Detailed Notes */}
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='reason_code'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('stockBalances.adjustmentDialog.reasonCode', 'Audit Reason Code')}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              'stockBalances.adjustmentDialog.selectReason',
                              'Select reason'
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stockAdjustmentReasonCodes.map((code) => (
                          <SelectItem key={code} value={code}>
                            {reasonLabels[code] || code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='reason'
                render={({ field }) => (
                  <FormItem className='sm:col-span-2'>
                    <FormLabel>
                      {t('stockBalances.adjustmentDialog.remarks', 'Explanation & Remarks')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t(
                          'stockBalances.adjustmentDialog.remarksPlaceholder',
                          'Document reason for adjustment, ticket #, or stocktake verification note...'
                        )}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={adjustMutation.isPending}
          >
            {t('stockBalances.adjustmentDialog.cancel', 'Cancel')}
          </Button>
          <Button
            type='submit'
            form='adjustment-form'
            disabled={adjustMutation.isPending}
          >
            {adjustMutation.isPending
              ? t('stockBalances.adjustmentDialog.applying', 'Applying Adjustment...')
              : t('stockBalances.adjustmentDialog.apply', 'Apply Stock Adjustment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
