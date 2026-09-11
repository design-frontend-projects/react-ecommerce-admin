import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWarehouses } from '@/features/warehouses/hooks/use-warehouses'
import {
  useAssignStoreWarehouse,
  useUpdateStoreWarehouse,
} from '../hooks/use-store-warehouses'
import {
  storeWarehouseInputSchema,
  type StoreWarehouseInput,
  type StoreWarehouseItem,
} from '../data/store-warehouses-schema'
import {
  Warehouse,
  Star,
  Truck,
  RefreshCw,
  Undo2,
  Clock,
  MapPin,
  CircleDollarSign,
} from 'lucide-react'

interface StoreWarehouseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  storeName?: string
  existingItem?: StoreWarehouseItem | null
  existingWarehouses?: StoreWarehouseItem[]
}

export function StoreWarehouseDialog({
  open,
  onOpenChange,
  storeId,
  storeName,
  existingItem,
  existingWarehouses = [],
}: StoreWarehouseDialogProps) {
  const { t } = useTranslation()
  const { data: allWarehouses = [] } = useWarehouses()
  const assignMutation = useAssignStoreWarehouse()
  const updateMutation = useUpdateStoreWarehouse()

  const isEditing = Boolean(existingItem)

  // Filter out warehouses already linked to this store (unless currently editing that one)
  const availableWarehouses = allWarehouses.filter((w) => {
    if (isEditing && existingItem?.warehouse_id === w.id) return true
    return !existingWarehouses.some((ew) => ew.warehouse_id === w.id)
  })

  // Calculate default next priority
  const defaultPriority =
    existingItem?.priority ??
    (existingWarehouses.length > 0
      ? Math.max(...existingWarehouses.map((w) => w.priority)) + 1
      : 1)

  const form = useForm<StoreWarehouseInput>({
    resolver: zodResolver(storeWarehouseInputSchema) as Resolver<StoreWarehouseInput>,
    defaultValues: {
      storeId,
      warehouseId: existingItem?.warehouse_id ?? '',
      isDefault: existingItem?.is_default ?? existingWarehouses.length === 0,
      priority: defaultPriority,
      allowFulfillment: existingItem?.allow_fulfillment ?? true,
      allowReplenishment: existingItem?.allow_replenishment ?? true,
      allowReturns: existingItem?.allow_returns ?? true,
      leadTimeDays: existingItem?.lead_time_days ?? 1,
      distanceKm: existingItem?.distance_km ? Number(existingItem.distance_km) : null,
      transitCost: existingItem?.transit_cost ? Number(existingItem.transit_cost) : null,
      isActive: existingItem?.is_active ?? true,
      notes: existingItem?.notes ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        storeId,
        warehouseId: existingItem?.warehouse_id ?? '',
        isDefault: existingItem?.is_default ?? existingWarehouses.length === 0,
        priority: defaultPriority,
        allowFulfillment: existingItem?.allow_fulfillment ?? true,
        allowReplenishment: existingItem?.allow_replenishment ?? true,
        allowReturns: existingItem?.allow_returns ?? true,
        leadTimeDays: existingItem?.lead_time_days ?? 1,
        distanceKm: existingItem?.distance_km ? Number(existingItem.distance_km) : null,
        transitCost: existingItem?.transit_cost ? Number(existingItem.transit_cost) : null,
        isActive: existingItem?.is_active ?? true,
        notes: existingItem?.notes ?? '',
      })
    }
  }, [open, existingItem, storeId, existingWarehouses, form, defaultPriority])

  const onSubmit = async (values: StoreWarehouseInput) => {
    if (isEditing && existingItem) {
      await updateMutation.mutateAsync({
        id: existingItem.id,
        storeId,
        warehouseId: existingItem.warehouse_id,
        input: {
          isDefault: values.isDefault,
          priority: values.priority,
          allowFulfillment: values.allowFulfillment,
          allowReplenishment: values.allowReplenishment,
          allowReturns: values.allowReturns,
          leadTimeDays: values.leadTimeDays,
          distanceKm: values.distanceKm,
          transitCost: values.transitCost,
          isActive: values.isActive,
          notes: values.notes,
        },
      })
    } else {
      await assignMutation.mutateAsync({
        ...values,
        storeId,
      })
    }
    onOpenChange(false)
  }

  const isPending = assignMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Warehouse className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle>
                {isEditing
                  ? t('stores.warehouses.dialog.editTitle', 'Edit Warehouse Link')
                  : t('stores.warehouses.dialog.linkTitle', 'Link Warehouse to Store')}
              </DialogTitle>
              <DialogDescription>
                {storeName
                  ? t('stores.warehouses.dialog.subtitleWithStore', {
                      store: storeName,
                      defaultValue: `Configuring fulfillment & replenishment route for ${storeName}`,
                    })
                  : t(
                      'stores.warehouses.dialog.subtitle',
                      'Configure fulfillment & replenishment connection'
                    )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 py-2'>
          {/* Warehouse Selection */}
          <div className='space-y-1.5'>
            <Label htmlFor='warehouseId' className='text-xs font-semibold'>
              {t('stores.warehouses.dialog.selectWarehouse', 'Warehouse facility *')}
            </Label>
            <Controller
              control={form.control}
              name='warehouseId'
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isEditing || availableWarehouses.length === 0}
                >
                  <SelectTrigger id='warehouseId'>
                    <SelectValue
                      placeholder={
                        availableWarehouses.length === 0
                          ? t(
                              'stores.warehouses.dialog.noWarehousesAvailable',
                              'All warehouses are already linked'
                            )
                          : t(
                              'stores.warehouses.dialog.chooseWarehouse',
                              'Select warehouse...'
                            )
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWarehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        <div className='flex items-center gap-2'>
                          <span className='font-mono font-bold text-xs'>[{w.code}]</span>
                          <span>{w.name}</span>
                          {w.cities?.name && (
                            <span className='text-xs text-muted-foreground'>
                              ({w.cities.name})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.warehouseId && (
              <p className='text-xs text-destructive'>
                {form.formState.errors.warehouseId.message}
              </p>
            )}
          </div>

          {/* Priority & Default Hub Settings */}
          <div className='grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='priority' className='text-xs font-semibold'>
                {t('stores.warehouses.dialog.priority', 'Fulfillment Priority')}
              </Label>
              <Input
                id='priority'
                type='number'
                min={1}
                {...form.register('priority', { valueAsNumber: true })}
              />
              <p className='text-[11px] text-muted-foreground'>
                {t('stores.warehouses.dialog.priorityHint', '1 = Primary, 2 = Secondary fallback')}
              </p>
            </div>

            <div className='flex flex-col justify-between py-1'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='isDefault' className='text-xs font-semibold cursor-pointer flex items-center gap-1.5'>
                  <Star className='h-3.5 w-3.5 text-amber-500 fill-amber-500/30' />
                  {t('stores.warehouses.dialog.isDefault', 'Default Hub')}
                </Label>
                <Controller
                  control={form.control}
                  name='isDefault'
                  render={({ field }) => (
                    <Switch
                      id='isDefault'
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
              <p className='text-[11px] text-muted-foreground'>
                {t('stores.warehouses.dialog.isDefaultHint', 'Main supply source for this store')}
              </p>
            </div>
          </div>

          {/* Operational Capabilities */}
          <div className='space-y-2 rounded-lg border p-3'>
            <Label className='text-xs font-semibold text-foreground uppercase tracking-wider'>
              {t('stores.warehouses.dialog.capabilities', 'Operational Capabilities')}
            </Label>
            <div className='space-y-2.5 pt-1'>
              <div className='flex items-start gap-2.5'>
                <Controller
                  control={form.control}
                  name='allowFulfillment'
                  render={({ field }) => (
                    <Checkbox
                      id='allowFulfillment'
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className='mt-0.5'
                    />
                  )}
                />
                <div className='grid gap-0.5'>
                  <Label htmlFor='allowFulfillment' className='text-xs font-medium cursor-pointer flex items-center gap-1.5'>
                    <Truck className='h-3.5 w-3.5 text-emerald-500' />
                    {t('stores.warehouses.dialog.allowFulfillment', 'Order Fulfillment')}
                  </Label>
                  <p className='text-[11px] text-muted-foreground'>
                    {t(
                      'stores.warehouses.dialog.allowFulfillmentDesc',
                      'Can fulfill customer POS / pickup / eCommerce delivery orders'
                    )}
                  </p>
                </div>
              </div>

              <div className='flex items-start gap-2.5'>
                <Controller
                  control={form.control}
                  name='allowReplenishment'
                  render={({ field }) => (
                    <Checkbox
                      id='allowReplenishment'
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className='mt-0.5'
                    />
                  )}
                />
                <div className='grid gap-0.5'>
                  <Label htmlFor='allowReplenishment' className='text-xs font-medium cursor-pointer flex items-center gap-1.5'>
                    <RefreshCw className='h-3.5 w-3.5 text-blue-500' />
                    {t('stores.warehouses.dialog.allowReplenishment', 'Store Replenishment')}
                  </Label>
                  <p className='text-[11px] text-muted-foreground'>
                    {t(
                      'stores.warehouses.dialog.allowReplenishmentDesc',
                      'Can supply internal stock transfer requests and purchase orders'
                    )}
                  </p>
                </div>
              </div>

              <div className='flex items-start gap-2.5'>
                <Controller
                  control={form.control}
                  name='allowReturns'
                  render={({ field }) => (
                    <Checkbox
                      id='allowReturns'
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className='mt-0.5'
                    />
                  )}
                />
                <div className='grid gap-0.5'>
                  <Label htmlFor='allowReturns' className='text-xs font-medium cursor-pointer flex items-center gap-1.5'>
                    <Undo2 className='h-3.5 w-3.5 text-purple-500' />
                    {t('stores.warehouses.dialog.allowReturns', 'Return Handling')}
                  </Label>
                  <p className='text-[11px] text-muted-foreground'>
                    {t(
                      'stores.warehouses.dialog.allowReturnsDesc',
                      'Can accept customer returns and damaged store stock transfers'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Logistics SLAs & Cost */}
          <div className='grid grid-cols-3 gap-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='leadTimeDays' className='text-xs font-semibold flex items-center gap-1'>
                <Clock className='h-3 w-3 text-muted-foreground' />
                {t('stores.warehouses.dialog.leadTime', 'Lead Time (Days)')}
              </Label>
              <Input
                id='leadTimeDays'
                type='number'
                min={0}
                placeholder='1'
                {...form.register('leadTimeDays', { valueAsNumber: true })}
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='distanceKm' className='text-xs font-semibold flex items-center gap-1'>
                <MapPin className='h-3 w-3 text-muted-foreground' />
                {t('stores.warehouses.dialog.distance', 'Distance (km)')}
              </Label>
              <Input
                id='distanceKm'
                type='number'
                step='0.1'
                min={0}
                placeholder='10.5'
                {...form.register('distanceKm', { valueAsNumber: true })}
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='transitCost' className='text-xs font-semibold flex items-center gap-1'>
                <CircleDollarSign className='h-3 w-3 text-muted-foreground' />
                {t('stores.warehouses.dialog.transitCost', 'Transit Cost')}
              </Label>
              <Input
                id='transitCost'
                type='number'
                step='0.01'
                min={0}
                placeholder='0.00'
                {...form.register('transitCost', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Active Status & Notes */}
          <div className='flex items-center justify-between rounded-lg border p-3'>
            <div>
              <Label htmlFor='isActive' className='text-xs font-semibold cursor-pointer'>
                {t('stores.warehouses.dialog.isActive', 'Link Active')}
              </Label>
              <p className='text-[11px] text-muted-foreground'>
                {t('stores.warehouses.dialog.isActiveHint', 'Temporarily pause routing without unlinking')}
              </p>
            </div>
            <Controller
              control={form.control}
              name='isActive'
              render={({ field }) => (
                <Switch
                  id='isActive'
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='notes' className='text-xs font-semibold'>
              {t('stores.warehouses.dialog.notes', 'Operational Notes')}
            </Label>
            <Textarea
              id='notes'
              rows={2}
              placeholder={t(
                'stores.warehouses.dialog.notesPlaceholder',
                'Docking bay instructions, scheduled delivery windows, route caveats...'
              )}
              {...form.register('notes')}
            />
          </div>

          <DialogFooter className='pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type='submit' disabled={isPending}>
              {isPending
                ? t('common.saving', 'Saving...')
                : isEditing
                ? t('common.saveChanges', 'Save Changes')
                : t('stores.warehouses.dialog.linkButton', 'Link Warehouse')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
