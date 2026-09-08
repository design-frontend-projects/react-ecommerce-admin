import { useState, useEffect, useMemo } from 'react'
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

const REASON_LABELS: Record<string, string> = {
  physical_audit: 'Physical Count Audit',
  cycle_count: 'Routine Cycle Count',
  damaged: 'Damaged Goods Write-off',
  expired: 'Expired Stock Disposal',
  theft_loss: 'Theft or Shrinkage',
  received_variance: 'Receipt Discrepancy',
  data_correction: 'Data Entry Correction',
  other: 'Other (Specify Below)',
}

export function AdjustmentDialog({ currentRow, open, onOpenChange }: Props) {
  const { getToken } = useAuth()
  const adjustMutation = useAdjustStock()

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
    currentRow?.product_variants?.products?.name || 'Manual Stock Adjustment'
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
            {currentRow ? 'Adjust Stock Balance' : 'New Stock Adjustment'}
          </DialogTitle>
          <DialogDescription>
            {currentRow
              ? `${productName} (${sku})`
              : 'Record a physical audit, write-off, or inventory adjustment.'}
          </DialogDescription>
        </DialogHeader>

        {/* Live Calculation Preview Banner */}
        <div className='rounded-lg border bg-muted/40 p-4'>
          <div className='flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            <span>Current On-Hand</span>
            <span>Adjustment</span>
            <span>New On-Hand</span>
          </div>
          <div className='mt-2 flex items-center justify-between'>
            <div className='text-center'>
              <span className='font-mono text-2xl font-bold text-foreground'>
                {currentOnHand.toLocaleString()}
              </span>
              <p className='text-[11px] text-muted-foreground'>
                Available: {Math.max(0, currentOnHand - currentReserved).toLocaleString()}
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
                Available: {projectedAvailable.toLocaleString()}
              </p>
            </div>
          </div>
          {projectedOnHand < 0 && (
            <div className='mt-2 flex items-center gap-1.5 text-xs text-destructive'>
              <AlertCircle className='h-4 w-4' />
              Warning: This adjustment will result in negative stock.
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
                    <FormLabel>Location Facility</FormLabel>
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
                          <SelectValue placeholder='Select facility type' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='warehouse'>
                          <div className='flex items-center gap-2'>
                            <Warehouse className='h-4 w-4 text-muted-foreground' />
                            Warehouse
                          </div>
                        </SelectItem>
                        <SelectItem value='store'>
                          <div className='flex items-center gap-2'>
                            <Store className='h-4 w-4 text-muted-foreground' />
                            Store / Retail Unit
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
                      <FormLabel>Warehouse</FormLabel>
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
                            <SelectValue placeholder='Select warehouse' />
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
                      <FormLabel>Store</FormLabel>
                      <Select
                        disabled={!!currentRow}
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select store' />
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
                    <FormLabel>Warehouse Location / Bin (Optional)</FormLabel>
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
                                ? 'Select warehouse first'
                                : locations.length === 0
                                  ? 'No bin locations configured'
                                  : 'Select bin location'
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
                  <FormLabel>Product Variant / SKU</FormLabel>
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
                              : 'Select variant by SKU or name'
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
                    <FormLabel>Stock Condition</FormLabel>
                    <Select
                      disabled={!!currentRow}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select condition' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='good'>Good (Default)</SelectItem>
                        <SelectItem value='damaged'>Damaged</SelectItem>
                        <SelectItem value='refurbished'>Refurbished</SelectItem>
                        <SelectItem value='returned'>Returned</SelectItem>
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
                    <FormLabel>Unit Cost ($)</FormLabel>
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
                      Used for inventory moving average cost calculation
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
                    <FormLabel>Adjustment Mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select mode' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='set'>Set Exact New Quantity</SelectItem>
                        <SelectItem value='offset'>Add / Subtract Offset (+/-)</SelectItem>
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
                      {watchedType === 'set' ? 'New Quantity On Hand' : 'Offset (+ or -)'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='any'
                        placeholder={watchedType === 'set' ? 'e.g. 100' : 'e.g. -5 or +10'}
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
                    <FormLabel>Audit Reason Code</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select reason' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stockAdjustmentReasonCodes.map((code) => (
                          <SelectItem key={code} value={code}>
                            {REASON_LABELS[code] || code}
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
                    <FormLabel>Explanation & Remarks</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Document reason for adjustment, ticket #, or stocktake verification note...'
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
            Cancel
          </Button>
          <Button
            type='submit'
            form='adjustment-form'
            disabled={adjustMutation.isPending}
          >
            {adjustMutation.isPending ? 'Applying Adjustment...' : 'Apply Stock Adjustment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
