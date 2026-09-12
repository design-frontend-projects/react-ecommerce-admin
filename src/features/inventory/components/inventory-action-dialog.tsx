'use client'

import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Loader2,
  Package,
  Layers,
  Warehouse,
  MapPin,
  Store,
  Boxes,
  ShieldCheck,
  Calendar,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
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
import { inventorySchema, type Inventory, type InventoryFormValues } from '../data/schema'
import {
  useCreateInventory,
  useUpdateInventory,
  useInventoryProducts,
  useProductVariants,
  useWarehouses,
  useWarehouseLocations,
  useStores,
  useStoreWarehouses,
} from '../hooks/use-inventory'

interface Props {
  currentRow?: Inventory | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InventoryActionDialog({
  currentRow,
  open,
  onOpenChange,
}: Props) {
  const { t } = useTranslation()
  const isEdit = !!currentRow
  const createMutation = useCreateInventory()
  const updateMutation = useUpdateInventory()

  const { data: products, isLoading: isLoadingProducts } = useInventoryProducts()
  const { data: stores, isLoading: isLoadingStores } = useStores()
  const { data: warehouses, isLoading: isLoadingWarehouses } = useWarehouses()

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventorySchema) as Resolver<InventoryFormValues>,
    defaultValues: {
      product_id: '',
      product_variant_id: null,
      store_id: null,
      warehouse_id: null,
      warehouse_location_id: null,
      reorder_point: 10,
      min_quantity: 10,
      max_quantity: 100,
      last_count_date: new Date().toISOString().slice(0, 10),
    },
  })

  const selectedProductId = form.watch('product_id')
  const selectedStoreId = form.watch('store_id')
  const selectedWarehouseId = form.watch('warehouse_id')

  const selectedProduct = products?.find((p) => p.id === selectedProductId)

  const {
    data: variants,
    isLoading: isLoadingVariants,
  } = useProductVariants(selectedProductId)

  const {
    data: storeWarehouses,
  } = useStoreWarehouses(selectedStoreId)

  const {
    data: locations,
    isLoading: isLoadingLocations,
  } = useWarehouseLocations(selectedWarehouseId)

  // Reset form when dialog opens or currentRow changes
  useEffect(() => {
    if (open) {
      if (currentRow) {
        form.reset({
          inventory_id: currentRow.inventory_id,
          product_id: currentRow.product_id,
          product_variant_id: currentRow.product_variant_id || null,
          store_id: currentRow.store_id || null,
          warehouse_id: currentRow.warehouse_id || null,
          warehouse_location_id: currentRow.warehouse_location_id || null,
          reorder_point: currentRow.reorder_point ?? currentRow.reorder_level ?? 0,
          min_quantity: currentRow.min_quantity ?? currentRow.reorder_level ?? 0,
          max_quantity: currentRow.max_quantity ?? currentRow.max_stock_level ?? null,
          last_count_date: currentRow.last_count_date
            ? currentRow.last_count_date.slice(0, 10)
            : new Date().toISOString().slice(0, 10),
        })
      } else {
        form.reset({
          product_id: '',
          product_variant_id: null,
          store_id: null,
          warehouse_id: null,
          warehouse_location_id: null,
          reorder_point: 10,
          min_quantity: 10,
          max_quantity: 100,
          last_count_date: new Date().toISOString().slice(0, 10),
        })
      }
    }
  }, [open, currentRow, form])

  const onSubmit = async (values: InventoryFormValues) => {
    try {
      const payload = {
        ...values,
        product_variant_id:
          values.product_variant_id === 'none' || !values.product_variant_id
            ? null
            : values.product_variant_id,
        store_id: values.store_id === 'none' || !values.store_id ? null : values.store_id,
        warehouse_id:
          values.warehouse_id === 'none' || !values.warehouse_id ? null : values.warehouse_id,
        warehouse_location_id:
          values.warehouse_location_id === 'none' || !values.warehouse_location_id
            ? null
            : values.warehouse_location_id,
      }

      if (isEdit && currentRow?.inventory_id) {
        await updateMutation.mutateAsync({
          ...payload,
          inventory_id: currentRow.inventory_id,
        })
        toast.success(t('inventory.toast.updated', 'Inventory settings updated successfully'))
      } else {
        await createMutation.mutateAsync(payload)
        toast.success(t('inventory.toast.created', 'Inventory item assigned successfully'))
      }

      onOpenChange(false)
      form.reset()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('inventory.toast.saveFailed', 'Failed to save inventory record'))
      }
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const hasVariants = Boolean(
    selectedProduct?.has_variants || (variants && variants.length > 0)
  )

  // Compute available warehouses list (prioritize store connected warehouses if store chosen)
  const connectedWarehouses =
    storeWarehouses?.map((sw) => sw.warehouses as { id: string; name: string; code: string; is_active: boolean }).filter(Boolean) || []
  const availableWarehouses =
    selectedStoreId && connectedWarehouses.length > 0
      ? connectedWarehouses
      : warehouses || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-xl'>
            <Boxes className='h-5 w-5 text-primary' />
            {isEdit
              ? t('inventory.editRecord', 'Edit Inventory Settings')
              : t('inventory.addRecord', 'Assign Product to Inventory')}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t(
                  'inventory.editRecordDesc',
                  'Update warehouse location, store assignment, and reorder safety thresholds.'
                )
              : t(
                  'inventory.addRecordDesc',
                  'Track safety thresholds and physical storage locations for catalog products.'
                )}
          </DialogDescription>
        </DialogHeader>

        {/* Live Stock Balances banner if editing */}
        {isEdit && currentRow && (
          <div className='rounded-lg border bg-muted/40 p-3.5 space-y-2'>
            <div className='flex items-center justify-between text-xs'>
              <span className='font-semibold flex items-center gap-1.5'>
                <Info className='h-3.5 w-3.5 text-primary' />
                {t('inventory.form.currentStockStatus', 'Live Balance (from Stock Balances)')}
              </span>
              <Badge variant='outline' className='text-[10px] uppercase font-mono'>
                {currentRow.condition || 'good'}
              </Badge>
            </div>
            <div className='grid grid-cols-3 gap-2 text-center text-xs'>
              <div className='bg-background rounded p-2 border'>
                <span className='text-muted-foreground'>{t('inventory.columns.onHand', 'On-Hand')}</span>
                <p className='text-base font-bold text-foreground'>
                  {Number(currentRow.qty_on_hand ?? currentRow.quantity ?? 0).toLocaleString()}
                </p>
              </div>
              <div className='bg-background rounded p-2 border'>
                <span className='text-muted-foreground'>{t('inventory.detail.available', 'Available')}</span>
                <p className='text-base font-bold text-emerald-600 dark:text-emerald-400'>
                  {Number(currentRow.qty_available ?? 0).toLocaleString()}
                </p>
              </div>
              <div className='bg-background rounded p-2 border'>
                <span className='text-muted-foreground'>{t('inventory.detail.reserved', 'Reserved')}</span>
                <p className='text-base font-bold text-amber-600 dark:text-amber-400'>
                  {Number(currentRow.qty_reserved ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
            <p className='text-[11px] text-muted-foreground'>
              {t(
                'inventory.form.stockNotice',
                'Stock quantities are maintained via Stock Adjustments & Transfers, not direct record edits.'
              )}
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-5'>
            {/* Product Section */}
            <div className='space-y-4 rounded-xl border p-4 bg-card/60'>
              <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                <Package className='h-3.5 w-3.5 text-primary' />
                {t('inventory.form.productSection', 'Product Selection')}
              </h4>

              <FormField
                control={form.control}
                name='product_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='flex items-center justify-between'>
                      <span>{t('inventory.form.product', 'Product')} *</span>
                      {selectedProduct?.has_variants && (
                        <Badge variant='outline' className='text-[10px]'>
                          {t('inventory.form.hasVariants', 'Has Variants')}
                        </Badge>
                      )}
                    </FormLabel>
                    <Select
                      disabled={isEdit || isLoadingProducts}
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val)
                        form.setValue('product_variant_id', null)
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingProducts
                                ? t('inventory.form.loadingProducts', 'Loading products...')
                                : t('inventory.form.selectProduct', 'Select a product')
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className='max-h-60'>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            <div className='flex items-center gap-2'>
                              <span className='font-medium'>{product.name}</span>
                              {product.sku && (
                                <span className='text-xs text-muted-foreground font-mono'>
                                  [{product.sku}]
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Variant Selector */}
              <FormField
                control={form.control}
                name='product_variant_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='flex items-center gap-2'>
                      <Layers className='h-3.5 w-3.5 text-muted-foreground' />
                      <span>{t('inventory.form.productVariant', 'Product Variant')}</span>
                    </FormLabel>
                    <Select
                      disabled={
                        !selectedProductId ||
                        isLoadingVariants ||
                        (!hasVariants && !isEdit)
                      }
                      value={field.value || 'none'}
                      onValueChange={(val) =>
                        field.onChange(val === 'none' ? null : val)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedProductId
                                ? t('inventory.form.selectProductFirst', 'Select a product first')
                                : isLoadingVariants
                                ? t('inventory.form.loadingVariants', 'Loading variants...')
                                : hasVariants
                                ? t('inventory.form.selectVariant', 'Select a variant')
                                : t('inventory.form.noVariantsStandard', 'No variants (Standard product)')
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className='max-h-60'>
                        <SelectItem value='none'>
                          <span className='text-muted-foreground'>
                            {t('inventory.form.noVariantOption', '-- Product Level (No Variant) --')}
                          </span>
                        </SelectItem>
                        {variants?.map((variant) => (
                          <SelectItem key={variant.id} value={variant.id}>
                            <div className='flex items-center gap-2'>
                              <span className='font-medium'>
                                {variant.name || t('common.default', 'Default')}
                              </span>
                              <span className='text-xs text-muted-foreground font-mono'>
                                [{variant.sku}]
                              </span>
                              {variant.price != null && (
                                <span className='text-xs text-emerald-600 dark:text-emerald-400 font-semibold ms-auto'>
                                  ${Number(variant.price).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Storage Location & Facility Assignment */}
            <div className='space-y-4 rounded-xl border p-4 bg-card/60'>
              <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                <Warehouse className='h-3.5 w-3.5 text-primary' />
                {t('inventory.form.locationSection', 'Storage Facility & Location')}
              </h4>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                {/* Store Selector */}
                <FormField
                  control={form.control}
                  name='store_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <Store className='h-3.5 w-3.5 text-muted-foreground' />
                        <span>{t('inventory.form.store', 'Assigned Store')}</span>
                      </FormLabel>
                      <Select
                        disabled={isLoadingStores}
                        value={field.value || 'none'}
                        onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                isLoadingStores
                                  ? t('common.loading', 'Loading...')
                                  : t('inventory.form.selectStore', 'Optional store assignment')
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className='max-h-60'>
                          <SelectItem value='none'>
                            <span className='text-muted-foreground'>
                              {t('inventory.form.noStore', '-- All Stores / General --')}
                            </span>
                          </SelectItem>
                          {stores?.map((store) => (
                            <SelectItem key={store.store_id} value={store.store_id}>
                              {store.name || store.store_id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Warehouse Selector */}
                <FormField
                  control={form.control}
                  name='warehouse_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <Warehouse className='h-3.5 w-3.5 text-muted-foreground' />
                        <span>{t('inventory.form.warehouse', 'Warehouse')}</span>
                      </FormLabel>
                      <Select
                        disabled={isLoadingWarehouses}
                        value={field.value || 'none'}
                        onValueChange={(val) => {
                          field.onChange(val === 'none' ? null : val)
                          form.setValue('warehouse_location_id', null)
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                isLoadingWarehouses
                                  ? t('common.loading', 'Loading...')
                                  : t('inventory.form.selectWarehouse', 'Select a warehouse')
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className='max-h-60'>
                          <SelectItem value='none'>
                            <span className='text-muted-foreground'>
                              {t('inventory.form.noWarehouseOption', '-- Unassigned Warehouse --')}
                            </span>
                          </SelectItem>
                          {availableWarehouses.map((wh) => (
                            <SelectItem key={wh.id} value={wh.id}>
                              <div className='flex items-center gap-2'>
                                <Badge variant='outline' className='font-mono text-xs'>
                                  {wh.code}
                                </Badge>
                                <span>{wh.name}</span>
                                {wh.is_default && (
                                  <Badge variant='secondary' className='text-[10px] ms-auto'>
                                    {t('common.default', 'Default')}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Warehouse Location Selector */}
              <FormField
                control={form.control}
                name='warehouse_location_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='flex items-center gap-1.5'>
                      <MapPin className='h-3.5 w-3.5 text-muted-foreground' />
                      <span>{t('inventory.form.location', 'Specific Bin / Rack / Location')}</span>
                    </FormLabel>
                    <Select
                      disabled={!selectedWarehouseId || isLoadingLocations}
                      value={field.value || 'none'}
                      onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedWarehouseId
                                ? t('inventory.form.selectWarehouseFirst', 'Select a warehouse first')
                                : isLoadingLocations
                                ? t('inventory.form.loadingLocations', 'Loading locations...')
                                : locations && locations.length > 0
                                ? t('inventory.form.selectLocation', 'Select location / bin')
                                : t('inventory.form.noLocationsFound', 'No locations defined in warehouse')
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className='max-h-60'>
                        <SelectItem value='none'>
                          <span className='text-muted-foreground'>
                            {t('inventory.form.noLocationOption', '-- Facility General / Receiving --')}
                          </span>
                        </SelectItem>
                        {locations?.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            <div className='flex items-center gap-2'>
                              <Badge variant='secondary' className='font-mono text-xs'>
                                {loc.code}
                              </Badge>
                              {loc.name && <span>{loc.name}</span>}
                              {loc.path && (
                                <span className='text-xs text-muted-foreground font-mono'>
                                  ({loc.path})
                                </span>
                              )}
                              {loc.location_type && (
                                <Badge variant='outline' className='text-[10px] uppercase ms-auto'>
                                  {loc.location_type}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className='text-xs'>
                      {t('inventory.form.locationDesc', 'Specific bin, shelf, rack or pallet location where this product is kept.')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Thresholds & Safety Limits */}
            <div className='space-y-4 rounded-xl border p-4 bg-card/60'>
              <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                <ShieldCheck className='h-3.5 w-3.5 text-primary' />
                {t('inventory.form.thresholdsSection', 'Safety Stock Thresholds')}
              </h4>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='reorder_point'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('inventory.form.reorderPoint', 'Reorder Point (Min Stock)')}</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          placeholder='e.g. 10'
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value
                            const num = val === '' ? null : Number(val)
                            field.onChange(num)
                            form.setValue('min_quantity', num)
                          }}
                        />
                      </FormControl>
                      <FormDescription className='text-[11px]'>
                        {t('inventory.form.reorderPointDesc', 'Triggers low stock alert.')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='max_quantity'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('inventory.form.maxCapacity', 'Max Stock Capacity')}</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          placeholder='e.g. 100'
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === '' ? null : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription className='text-[11px]'>
                        {t('inventory.form.maxCapacityDesc', 'Optional maximum ceiling.')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Last Verification / Count Date */}
              <FormField
                control={form.control}
                name='last_count_date'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='flex items-center gap-1.5'>
                      <Calendar className='h-3.5 w-3.5 text-muted-foreground' />
                      <span>{t('inventory.form.lastCountDate', 'Physical Count Verification Date')}</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='date'
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className='gap-2 sm:gap-0 pt-2'>
              <Button
                type='button'
                variant='outline'
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type='submit' disabled={isSubmitting} className='gap-2'>
                {isSubmitting && <Loader2 className='h-4 w-4 animate-spin' />}
                {isEdit
                  ? t('common.saveChanges', 'Save Changes')
                  : t('inventory.form.createInventory', 'Assign to Inventory')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
