'use client'

import { useEffect, useMemo } from 'react'
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
  Star,
  Tag,
  Barcode,
  Clock,
  Compass,
  FileText,
  Hash,
  Sparkles,
  Phone,
  Mail,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  inventorySchema,
  type Inventory,
  type InventoryFormValues,
} from '../data/schema'
import {
  useCreateInventory,
  useUpdateInventory,
  useInventoryProducts,
  useProductVariants,
  useWarehouses,
  useWarehouseLocations,
  useStores,
  useStoreWarehouses,
  useStockBalancesForProduct,
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

  const { data: products, isLoading: isLoadingProducts } =
    useInventoryProducts()
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
      safety_stock: 5,
      reorder_quantity: 25,
      unit_cost: null,
      lead_time_days: 1,
      is_active: true,
      status: 'active',
      aisle: '',
      rack: '',
      shelf: '',
      bin: '',
      last_count_date: new Date().toISOString().slice(0, 10),
      last_restocked_date: null,
      notes: '',
    },
  })

  const selectedProductId = form.watch('product_id')
  const selectedVariantId = form.watch('product_variant_id')
  const selectedStoreId = form.watch('store_id')
  const selectedWarehouseId = form.watch('warehouse_id')
  const selectedLocationId = form.watch('warehouse_location_id')

  const selectedProduct = products?.find((p) => p.id === selectedProductId)

  const { data: variants, isLoading: isLoadingVariants } =
    useProductVariants(selectedProductId)

  const selectedVariant = variants?.find((v) => v.id === selectedVariantId)

  const { data: storeWarehouses, isLoading: isLoadingStoreWarehouses } =
    useStoreWarehouses(selectedStoreId)

  const { data: locations, isLoading: isLoadingLocations } =
    useWarehouseLocations(selectedWarehouseId)

  const selectedLocation = locations?.find(
    (loc) => loc.id === selectedLocationId
  )

  // Live stock balance specifically for the selected product variant, warehouse, and store
  const { data: variantLiveStock, isLoading: isLoadingVariantStock } =
    useStockBalancesForProduct(
      selectedVariantId,
      selectedWarehouseId,
      selectedStoreId
    )

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
          reorder_point:
            currentRow.reorder_point ?? currentRow.reorder_level ?? 0,
          min_quantity:
            currentRow.min_quantity ?? currentRow.reorder_level ?? 0,
          max_quantity:
            currentRow.max_quantity ?? currentRow.max_stock_level ?? null,
          safety_stock: currentRow.safety_stock ?? 0,
          reorder_quantity: currentRow.reorder_quantity ?? 0,
          unit_cost:
            currentRow.unit_cost != null ? Number(currentRow.unit_cost) : null,
          lead_time_days: currentRow.lead_time_days ?? 1,
          is_active: currentRow.is_active !== false,
          status: currentRow.status || 'active',
          aisle: currentRow.aisle || '',
          rack: currentRow.rack || '',
          shelf: currentRow.shelf || '',
          bin: currentRow.bin || '',
          last_count_date: currentRow.last_count_date
            ? currentRow.last_count_date.slice(0, 10)
            : new Date().toISOString().slice(0, 10),
          last_restocked_date: currentRow.last_restocked_date
            ? currentRow.last_restocked_date.slice(0, 10)
            : null,
          notes: currentRow.notes || '',
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
          safety_stock: 5,
          reorder_quantity: 25,
          unit_cost: null,
          lead_time_days: 1,
          is_active: true,
          status: 'active',
          aisle: '',
          rack: '',
          shelf: '',
          bin: '',
          last_count_date: new Date().toISOString().slice(0, 10),
          last_restocked_date: null,
          notes: '',
        })
      }
    }
  }, [open, currentRow, form])

  // Auto-select store's default warehouse when store changes if no warehouse selected in Add mode
  useEffect(() => {
    if (
      !isEdit &&
      selectedStoreId &&
      selectedStoreId !== 'none' &&
      storeWarehouses &&
      storeWarehouses.length > 0
    ) {
      const currentWh = form.getValues('warehouse_id')
      if (!currentWh || currentWh === 'none') {
        const defaultSw =
          storeWarehouses.find((sw: any) => sw.is_default) || storeWarehouses[0]
        const whId =
          defaultSw?.warehouses?.id || defaultSw?.warehouse_id || defaultSw?.id
        if (whId) {
          form.setValue('warehouse_id', whId)
        }
      }
    }
  }, [selectedStoreId, storeWarehouses, isEdit, form])

  // Auto-select default location when warehouse changes if no location selected in Add mode
  useEffect(() => {
    if (
      !isEdit &&
      selectedWarehouseId &&
      selectedWarehouseId !== 'none' &&
      locations &&
      locations.length > 0
    ) {
      const currentLoc = form.getValues('warehouse_location_id')
      if (!currentLoc || currentLoc === 'none') {
        const defaultLoc = locations.find((l) => l.is_default)
        if (defaultLoc) {
          form.setValue('warehouse_location_id', defaultLoc.id)
        }
      }
    }
  }, [selectedWarehouseId, locations, isEdit, form])

  const onSubmit = async (values: InventoryFormValues) => {
    try {
      const payload = {
        ...values,
        product_variant_id:
          values.product_variant_id === 'none' || !values.product_variant_id
            ? null
            : values.product_variant_id,
        store_id:
          values.store_id === 'none' || !values.store_id
            ? null
            : values.store_id,
        warehouse_id:
          values.warehouse_id === 'none' || !values.warehouse_id
            ? null
            : values.warehouse_id,
        warehouse_location_id:
          values.warehouse_location_id === 'none' ||
          !values.warehouse_location_id
            ? null
            : values.warehouse_location_id,
        aisle: values.aisle?.trim() || null,
        rack: values.rack?.trim() || null,
        shelf: values.shelf?.trim() || null,
        bin: values.bin?.trim() || null,
        notes: values.notes?.trim() || null,
        last_restocked_date: values.last_restocked_date || null,
      }

      if (isEdit && currentRow?.inventory_id) {
        await updateMutation.mutateAsync({
          ...payload,
          inventory_id: currentRow.inventory_id,
        })
        toast.success(
          t(
            'inventory.toast.updated',
            'Inventory settings updated successfully'
          )
        )
      } else {
        await createMutation.mutateAsync(payload)
        toast.success(
          t('inventory.toast.created', 'Inventory item assigned successfully')
        )
      }

      onOpenChange(false)
      form.reset()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(
          t('inventory.toast.saveFailed', 'Failed to save inventory record')
        )
      }
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const hasVariants = Boolean(
    selectedProduct?.has_variants || (variants && variants.length > 0)
  )

  // 1. All active warehouses from useWarehouses()
  const allWarehouses = useMemo(() => warehouses || [], [warehouses])

  // 2. Main warehouse(s) (where is_default is true or code is 'MAIN')
  const mainWarehouses = useMemo(() => {
    return allWarehouses.filter(
      (w) => w.is_default || w.code?.toUpperCase() === 'MAIN'
    )
  }, [allWarehouses])

  // 3. Warehouses connected to the selected store via store_warehouses
  const storeConnectedWarehouses = useMemo(() => {
    if (
      !selectedStoreId ||
      selectedStoreId === 'none' ||
      !storeWarehouses ||
      !Array.isArray(storeWarehouses)
    )
      return []
    return storeWarehouses
      .map((sw: any) => {
        const rawWh = sw.warehouses ?? sw
        const wh = Array.isArray(rawWh) ? rawWh[0] : rawWh
        const whId = wh?.id ?? sw.warehouse_id ?? sw.id
        if (!whId) return null
        const whActive = wh?.is_active ?? sw.is_active ?? true
        if (whActive === false) return null

        return {
          id: String(whId),
          name: String(wh?.name ?? sw.name ?? 'Warehouse'),
          code: String(wh?.code ?? sw.code ?? ''),
          is_default: Boolean(wh?.is_default ?? sw.is_default),
          is_store_default: Boolean(sw.is_default || sw.is_store_default),
          priority: Number(sw.priority ?? 1),
          allow_fulfillment: sw.allow_fulfillment !== false,
          allow_replenishment: sw.allow_replenishment !== false,
          lead_time_days: Number(sw.lead_time_days ?? 1),
          phone: wh?.phone ?? sw.phone,
          email: wh?.email ?? sw.email,
          address: wh?.address ?? sw.address,
          allow_negative_stock: Boolean(
            wh?.allow_negative_stock ?? sw.allow_negative_stock
          ),
          is_store_linked: true,
        }
      })
      .filter(Boolean) as Array<{
      id: string
      name: string
      code: string
      is_default: boolean
      is_store_default: boolean
      priority: number
      allow_fulfillment: boolean
      allow_replenishment: boolean
      lead_time_days: number
      phone?: string
      email?: string
      address?: string
      allow_negative_stock?: boolean
      is_store_linked: boolean
    }>
  }, [selectedStoreId, storeWarehouses])

  // 4. Combined warehouse options
  const availableWarehouseOptions = useMemo(() => {
    if (selectedStoreId && selectedStoreId !== 'none') {
      // Strictly show warehouses connected to this store via store_warehouses
      return storeConnectedWarehouses
    }

    // When no store selected (all stores / general):
    return allWarehouses.map((wh) => ({
      id: wh.id,
      name: wh.name,
      code: wh.code,
      is_default: Boolean(wh.is_default),
      is_main: Boolean(wh.is_default || wh.code?.toUpperCase() === 'MAIN'),
      is_store_linked: false,
      is_store_default: false,
      priority: 1,
      allow_fulfillment: true,
      allow_replenishment: true,
      lead_time_days: 1,
      phone: wh.phone,
      email: wh.email,
      address: wh.address,
      allow_negative_stock: wh.allow_negative_stock,
    }))
  }, [selectedStoreId, storeConnectedWarehouses, allWarehouses])

  // Partition for display when store is selected
  const storeWarehousesGroup = useMemo(
    () => availableWarehouseOptions,
    [availableWarehouseOptions]
  )

  // Selected store and warehouse entities for rich previews
  const selectedStore = useMemo(
    () => stores?.find((s) => s.store_id === selectedStoreId),
    [stores, selectedStoreId]
  )
  const selectedWarehouse = useMemo(
    () => availableWarehouseOptions.find((w) => w.id === selectedWarehouseId),
    [availableWarehouseOptions, selectedWarehouseId]
  )
  const selectedStoreWarehouseRel = useMemo(
    () => storeConnectedWarehouses.find((sw) => sw.id === selectedWarehouseId),
    [storeConnectedWarehouses, selectedWarehouseId]
  )

  // Auto-adjust selected warehouse if currently selected warehouse is not valid for newly selected store
  useEffect(() => {
    if (!selectedWarehouseId || selectedWarehouseId === 'none') return
    if (availableWarehouseOptions.length > 0) {
      const isValid = availableWarehouseOptions.some(
        (w) => w.id === selectedWarehouseId
      )
      if (!isValid) {
        const storeDefaultWh = availableWarehouseOptions.find(
          (w) => w.is_store_default
        )
        const mainWh = availableWarehouseOptions.find((w) => w.is_main)
        form.setValue('warehouse_id', storeDefaultWh?.id || mainWh?.id || null)
        form.setValue('warehouse_location_id', null)
      }
    }
  }, [selectedStoreId, availableWarehouseOptions, selectedWarehouseId, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='max-h-[92vh] max-w-3xl gap-0 overflow-y-auto p-0'
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Dialog Header with Gradient Banner */}
        <div className='border-b bg-gradient-to-r from-primary/15 via-primary/5 to-background p-6'>
          <DialogHeader className='space-y-1.5'>
            <div className='flex items-center gap-2.5'>
              <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20'>
                <Boxes className='h-5 w-5' />
              </div>
              <div>
                <DialogTitle className='text-xl font-bold tracking-tight'>
                  {isEdit
                    ? t('inventory.editRecord', 'Edit Inventory Settings')
                    : t('inventory.addRecord', 'Assign Product to Inventory')}
                </DialogTitle>
                <DialogDescription className='text-xs text-muted-foreground'>
                  {isEdit
                    ? t(
                        'inventory.editRecordDesc',
                        'Configure storage location, safety thresholds, and store fulfillment rules for this catalog item.'
                      )
                    : t(
                        'inventory.addRecordDesc',
                        'Assign catalog products and variants to warehouses and store bins with safety thresholds.'
                      )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Live Stock Balances banner if editing */}
          {isEdit && currentRow && (
            <div className='mt-4 space-y-2.5 rounded-xl border bg-card/80 p-3.5 shadow-2xs backdrop-blur-xs'>
              <div className='flex items-center justify-between text-xs'>
                <span className='flex items-center gap-1.5 font-semibold text-foreground'>
                  <Info className='h-3.5 w-3.5 text-primary' />
                  {t(
                    'inventory.form.currentStockStatus',
                    'Live Stock Balance (from stock_balances)'
                  )}
                </span>
                <Badge
                  variant='outline'
                  className='font-mono text-[10px] uppercase'
                >
                  {currentRow.condition || 'good'}
                </Badge>
              </div>
              <div className='grid grid-cols-3 gap-2.5 text-center text-xs'>
                <div className='rounded-lg border bg-background/90 p-2.5 shadow-2xs'>
                  <span className='text-[11px] text-muted-foreground'>
                    {t('inventory.columns.onHand', 'On-Hand')}
                  </span>
                  <p className='text-lg font-bold text-foreground'>
                    {Number(
                      currentRow.qty_on_hand ?? currentRow.quantity ?? 0
                    ).toLocaleString()}
                  </p>
                </div>
                <div className='rounded-lg border bg-background/90 p-2.5 shadow-2xs'>
                  <span className='text-[11px] text-muted-foreground'>
                    {t('inventory.detail.available', 'Available')}
                  </span>
                  <p className='text-lg font-bold text-emerald-600 dark:text-emerald-400'>
                    {Number(currentRow.qty_available ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className='rounded-lg border bg-background/90 p-2.5 shadow-2xs'>
                  <span className='text-[11px] text-muted-foreground'>
                    {t('inventory.detail.reserved', 'Reserved')}
                  </span>
                  <p className='text-lg font-bold text-amber-600 dark:text-amber-400'>
                    {Number(currentRow.qty_reserved ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <p className='flex items-center gap-1 text-[11px] text-muted-foreground'>
                <ShieldCheck className='h-3 w-3 shrink-0 text-primary' />
                {t(
                  'inventory.form.stockNotice',
                  'Physical stock movements are updated via Stock Adjustments & Transfers, not direct record edits.'
                )}
              </p>
            </div>
          )}
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-6 p-6'
          >
            {/* ─── 1. Product & Variant Section ──────────────────────────────── */}
            <div className='space-y-4 rounded-xl border bg-card/60 p-4 shadow-2xs'>
              <div className='flex items-center justify-between'>
                <h4 className='flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                  <Package className='h-3.5 w-3.5 text-primary' />
                  {t(
                    'inventory.form.productSection',
                    'Product & Variant Selection'
                  )}
                </h4>
                {selectedProduct && (
                  <div className='flex items-center gap-1.5'>
                    {hasVariants ? (
                      <Badge
                        variant='outline'
                        className='border-primary/30 bg-primary/5 text-[10px] text-primary'
                      >
                        <Sparkles className='me-1 h-3 w-3' />
                        {variants && variants.length > 0
                          ? `${variants.length} Variant(s) Available`
                          : 'Has Variants'}
                      </Badge>
                    ) : (
                      <Badge variant='secondary' className='text-[10px]'>
                        Standard Product
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Product Selector */}
              <FormField
                control={form.control}
                name='product_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('inventory.form.product', 'Product')} *
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
                                ? t(
                                    'inventory.form.loadingProducts',
                                    'Loading products...'
                                  )
                                : t(
                                    'inventory.form.selectProduct',
                                    'Select a product'
                                  )
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className='max-h-60'>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            <div className='flex w-full items-center gap-2'>
                              <span className='font-medium'>
                                {product.name}
                              </span>
                              {product.sku && (
                                <Badge
                                  variant='outline'
                                  className='px-1 py-0 font-mono text-xs'
                                >
                                  {product.sku}
                                </Badge>
                              )}
                              {product.has_variants && (
                                <Badge
                                  variant='secondary'
                                  className='ms-auto text-[9px]'
                                >
                                  Variants
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

              {/* Product Overview Card when selected */}
              {selectedProduct && (
                <div className='space-y-2 rounded-lg border bg-muted/25 p-3 text-xs'>
                  <div className='flex items-start justify-between gap-2'>
                    <div>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm font-semibold text-foreground'>
                          {selectedProduct.name}
                        </span>
                        {selectedProduct.sku && (
                          <Badge
                            variant='outline'
                            className='font-mono text-[10px]'
                          >
                            SKU: {selectedProduct.sku}
                          </Badge>
                        )}
                      </div>
                      <div className='mt-1 flex flex-wrap items-center gap-2 text-muted-foreground'>
                        {selectedProduct.brand && (
                          <span className='flex items-center gap-1'>
                            <Tag className='h-3 w-3 text-primary' />
                            Brand:{' '}
                            <strong className='text-foreground'>
                              {selectedProduct.brand}
                            </strong>
                          </span>
                        )}
                        {selectedProduct.category && (
                          <span className='flex items-center gap-1'>
                            <Compass className='h-3 w-3 text-primary' />
                            Category:{' '}
                            <strong className='text-foreground'>
                              {selectedProduct.category}
                            </strong>
                          </span>
                        )}
                        {selectedProduct.barcode && (
                          <span className='flex items-center gap-1 font-mono'>
                            <Barcode className='h-3 w-3' />
                            {selectedProduct.barcode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Variant Selector & Rich Preview */}
              {selectedProductId && (
                <>
                  {hasVariants ? (
                    <FormField
                      control={form.control}
                      name='product_variant_id'
                      render={({ field }) => (
                        <FormItem className='space-y-2.5'>
                          <FormLabel className='flex items-center justify-between'>
                            <span className='flex items-center gap-1.5'>
                              <Layers className='h-3.5 w-3.5 text-primary' />
                              <span>
                                {t(
                                  'inventory.form.productVariant',
                                  'Product Variant'
                                )}
                              </span>
                            </span>
                            {variants && variants.length > 0 && (
                              <span className='text-[11px] text-muted-foreground'>
                                {variants.length} variant options
                              </span>
                            )}
                          </FormLabel>

                          {/* Quick clickable variant pills */}
                          {variants && variants.length > 0 && (
                            <div className='flex flex-wrap gap-1.5 pb-1'>
                              <button
                                type='button'
                                onClick={() => field.onChange(null)}
                                className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                  !field.value || field.value === 'none'
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'bg-background text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                {t(
                                  'inventory.form.noVariantOption',
                                  'Product Level (All Variants)'
                                )}
                              </button>
                              {variants.map((v) => (
                                <button
                                  key={v.id}
                                  type='button'
                                  onClick={() => field.onChange(v.id)}
                                  className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                    field.value === v.id
                                      ? 'border-primary bg-primary text-primary-foreground shadow-2xs'
                                      : 'bg-background text-foreground hover:bg-muted'
                                  }`}
                                >
                                  <span>{v.name || v.sku}</span>
                                  {v.attributes_label && (
                                    <span className='text-[9px] opacity-70'>
                                      ({v.attributes_label})
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}

                          <Select
                            disabled={isLoadingVariants}
                            value={field.value || 'none'}
                            onValueChange={(val) =>
                              field.onChange(val === 'none' ? null : val)
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    isLoadingVariants
                                      ? t(
                                          'inventory.form.loadingVariants',
                                          'Loading variants...'
                                        )
                                      : t(
                                          'inventory.form.selectVariant',
                                          'Select a variant'
                                        )
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className='max-h-64'>
                              <SelectItem value='none'>
                                <span className='text-muted-foreground'>
                                  {t(
                                    'inventory.form.noVariantOption',
                                    '-- Product Level (No Variant) --'
                                  )}
                                </span>
                              </SelectItem>
                              {variants?.map((variant) => (
                                <SelectItem key={variant.id} value={variant.id}>
                                  <div className='flex w-full items-center gap-2'>
                                    <span className='font-medium'>
                                      {variant.name || variant.sku}
                                    </span>
                                    {variant.attributes_label && (
                                      <Badge
                                        variant='secondary'
                                        className='px-1 py-0 text-[9px]'
                                      >
                                        {variant.attributes_label}
                                      </Badge>
                                    )}
                                    <span className='font-mono text-xs text-muted-foreground'>
                                      [{variant.sku}]
                                    </span>
                                    {variant.price != null && (
                                      <span className='ms-auto text-xs font-semibold text-emerald-600 dark:text-emerald-400'>
                                        ${Number(variant.price).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />

                          {/* Selected Variant Rich Preview Card */}
                          {selectedVariant ? (
                            <div className='space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs shadow-2xs'>
                              <div className='flex items-start justify-between gap-3'>
                                <div className='space-y-1.5'>
                                  <div className='flex items-center gap-2'>
                                    <span className='text-sm font-bold text-foreground'>
                                      {selectedVariant.name ||
                                        selectedVariant.sku}
                                    </span>
                                    <Badge
                                      variant='outline'
                                      className='bg-background font-mono text-[10px]'
                                    >
                                      {selectedVariant.sku}
                                    </Badge>
                                    {selectedVariant.is_active === false ? (
                                      <Badge
                                        variant='destructive'
                                        className='text-[9px]'
                                      >
                                        Inactive
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant='secondary'
                                        className='bg-emerald-500/10 text-[9px] text-emerald-600 dark:text-emerald-400'
                                      >
                                        Active
                                      </Badge>
                                    )}
                                  </div>

                                  <div className='flex flex-wrap items-center gap-2 text-muted-foreground'>
                                    {selectedVariant.attributes_label && (
                                      <div className='flex items-center gap-1 font-medium text-foreground'>
                                        <Tag className='h-3 w-3 text-primary' />
                                        <span>
                                          {selectedVariant.attributes_label}
                                        </span>
                                      </div>
                                    )}
                                    {selectedVariant.barcode && (
                                      <div className='flex items-center gap-1 font-mono text-muted-foreground'>
                                        <Barcode className='h-3 w-3' />
                                        <span>{selectedVariant.barcode}</span>
                                      </div>
                                    )}
                                    {selectedVariant.weight != null && (
                                      <span className='text-muted-foreground'>
                                        Weight: {selectedVariant.weight} kg
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Pricing Breakdown */}
                                <div className='shrink-0 text-end'>
                                  {selectedVariant.price != null && (
                                    <div>
                                      <span className='block text-[10px] tracking-wider text-muted-foreground uppercase'>
                                        Selling Price
                                      </span>
                                      <span className='text-base font-bold text-emerald-600 dark:text-emerald-400'>
                                        $
                                        {Number(selectedVariant.price).toFixed(
                                          2
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {selectedVariant.cost_price != null && (
                                    <span className='block text-[11px] text-muted-foreground'>
                                      Cost: $
                                      {Number(
                                        selectedVariant.cost_price
                                      ).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Live Variant Stock Stats (Referred directly from stock_balances) */}
                              <div className='space-y-2 border-t border-border/50 pt-2'>
                                <div className='flex items-center justify-between text-[11px] text-muted-foreground'>
                                  <span className='flex items-center gap-1 font-medium text-foreground'>
                                    <Boxes className='h-3 w-3 shrink-0 text-primary' />
                                    {selectedWarehouse && selectedWarehouse.name
                                      ? t(
                                          'inventory.form.stockInWarehouse',
                                          'Facility Stock: {{name}}',
                                          { name: selectedWarehouse.name }
                                        )
                                      : selectedStore && selectedStore.name
                                        ? t(
                                            'inventory.form.stockInStore',
                                            'Store Stock: {{name}}',
                                            { name: selectedStore.name }
                                          )
                                        : t(
                                            'inventory.form.stockEnterprise',
                                            'Total Enterprise Stock (stock_balances)'
                                          )}
                                  </span>
                                  {variantLiveStock?.metrics && (
                                    <Badge
                                      variant='outline'
                                      className='bg-muted/60 font-mono text-[9px] text-muted-foreground'
                                    >
                                      Company Total:{' '}
                                      {variantLiveStock.metrics.totalOnHand.toLocaleString()}{' '}
                                      units
                                    </Badge>
                                  )}
                                </div>

                                <div className='grid grid-cols-3 gap-2 text-center'>
                                  <div className='rounded border bg-background/80 p-1.5'>
                                    <span className='text-[10px] text-muted-foreground'>
                                      Stock On-Hand
                                    </span>
                                    <p className='font-bold text-foreground'>
                                      {Number(
                                        variantLiveStock?.inSelectedLocation
                                          ?.onHand ?? 0
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className='rounded border bg-background/80 p-1.5'>
                                    <span className='text-[10px] text-muted-foreground'>
                                      Available
                                    </span>
                                    <p className='font-bold text-emerald-600 dark:text-emerald-400'>
                                      {Number(
                                        variantLiveStock?.inSelectedLocation
                                          ?.available ?? 0
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className='rounded border bg-background/80 p-1.5'>
                                    <span className='text-[10px] text-muted-foreground'>
                                      Reserved
                                    </span>
                                    <p className='font-bold text-amber-600 dark:text-amber-400'>
                                      {Number(
                                        variantLiveStock?.inSelectedLocation
                                          ?.reserved ?? 0
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                </div>

                                {/* Store Retail Stock callout when warehouse has 0 or store has retail units */}
                                {selectedStore &&
                                  selectedStoreId !== 'none' &&
                                  variantLiveStock?.storeStock &&
                                  variantLiveStock.storeStock.onHand > 0 &&
                                  selectedWarehouseId && (
                                    <div className='flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px] text-primary'>
                                      <span className='flex items-center gap-1.5 font-medium'>
                                        <Store className='h-3 w-3' />
                                        {selectedStore.name} Retail Stock:
                                      </span>
                                      <span className='font-mono font-semibold'>
                                        {variantLiveStock.storeStock.onHand.toLocaleString()}{' '}
                                        on-hand (
                                        {variantLiveStock.storeStock.available.toLocaleString()}{' '}
                                        available)
                                      </span>
                                    </div>
                                  )}
                              </div>
                            </div>
                          ) : (
                            <div className='flex items-center gap-2 rounded-lg border bg-muted/30 p-2.5 text-xs text-muted-foreground'>
                              <Info className='h-3.5 w-3.5 shrink-0 text-primary' />
                              <span>
                                {t(
                                  'inventory.form.productLevelInfo',
                                  'No specific variant chosen: Inventory policy will apply to the root catalog product.'
                                )}
                              </span>
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                  ) : (
                    !isLoadingVariants && (
                      <div className='flex items-center gap-2.5 rounded-xl border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground'>
                        <ShieldCheck className='h-4 w-4 shrink-0 text-primary' />
                        <div>
                          <p className='font-medium text-foreground'>
                            {t(
                              'inventory.form.standardProductTitle',
                              'Standard Catalog Product'
                            )}
                          </p>
                          <p className='text-[11px] text-muted-foreground'>
                            {t(
                              'inventory.form.standardProductBanner',
                              'This product has no variants. Inventory is tracked directly on the base SKU.'
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </>
              )}
            </div>

            {/* ─── 2. Storage Facility & Location Assignment ───────────────────── */}
            <div className='space-y-4 rounded-xl border bg-card/60 p-4 shadow-2xs'>
              <div className='flex items-center justify-between'>
                <h4 className='flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                  <Warehouse className='h-3.5 w-3.5 text-primary' />
                  {t(
                    'inventory.form.locationSection',
                    'Storage Facility & Warehouse Route'
                  )}
                </h4>
                {selectedWarehouseId &&
                  selectedWarehouseId !== 'none' &&
                  locations && (
                    <Badge variant='outline' className='text-[10px]'>
                      {locations.length} Sub-Location(s)
                    </Badge>
                  )}
              </div>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {/* Store Selector */}
                <FormField
                  control={form.control}
                  name='store_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <Store className='h-3.5 w-3.5 text-muted-foreground' />
                        <span>
                          {t('inventory.form.store', 'Assigned Store')}
                        </span>
                      </FormLabel>
                      <Select
                        disabled={isLoadingStores}
                        value={field.value || 'none'}
                        onValueChange={(val) => {
                          const nextVal = val === 'none' ? null : val
                          field.onChange(nextVal)
                          form.setValue('warehouse_id', null)
                          form.setValue('warehouse_location_id', null)
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                isLoadingStores
                                  ? t('common.loading', 'Loading...')
                                  : t(
                                      'inventory.form.selectStore',
                                      'Optional store assignment'
                                    )
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className='max-h-60'>
                          <SelectItem value='none'>
                            <span className='text-muted-foreground'>
                              {t(
                                'inventory.form.noStore',
                                '-- All Stores / General Enterprise --'
                              )}
                            </span>
                          </SelectItem>
                          {stores?.map((store) => (
                            <SelectItem
                              key={store.store_id}
                              value={store.store_id}
                            >
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
                      <FormLabel className='flex items-center justify-between'>
                        <span className='flex items-center gap-1.5'>
                          <Warehouse className='h-3.5 w-3.5 text-muted-foreground' />
                          <span>
                            {t(
                              'inventory.form.warehouse',
                              'Warehouse Facility'
                            )}
                          </span>
                        </span>
                        {selectedStoreId && selectedStoreId !== 'none' && (
                          <Badge
                            variant='outline'
                            className='text-[9px] text-muted-foreground'
                          >
                            {availableWarehouseOptions.length} linked to store
                          </Badge>
                        )}
                      </FormLabel>
                      <Select
                        disabled={
                          isLoadingWarehouses || isLoadingStoreWarehouses
                        }
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
                                  : t(
                                      'inventory.form.selectWarehouse',
                                      'Select a warehouse'
                                    )
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className='max-h-64'>
                          <SelectItem value='none'>
                            <span className='text-muted-foreground'>
                              {t(
                                'inventory.form.noWarehouseOption',
                                '-- Unassigned Warehouse --'
                              )}
                            </span>
                          </SelectItem>

                          {selectedStoreId && selectedStoreId !== 'none' ? (
                            <SelectGroup>
                              <SelectLabel className='flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase'>
                                <Store className='h-3 w-3 text-primary' />
                                <span>
                                  {t(
                                    'inventory.form.storeWarehousesGroup',
                                    'Store Connected Facilities'
                                  )}
                                </span>
                              </SelectLabel>
                              {availableWarehouseOptions.map((wh) => {
                                const whStock =
                                  variantLiveStock?.stockByWarehouse?.[wh.id]
                                return (
                                  <SelectItem key={wh.id} value={wh.id}>
                                    <div className='flex w-full items-center gap-2'>
                                      <Badge
                                        variant='outline'
                                        className='font-mono text-xs'
                                      >
                                        {wh.code}
                                      </Badge>
                                      <span className='font-medium'>
                                        {wh.name}
                                      </span>
                                      {wh.is_store_default && (
                                        <Badge
                                          variant='secondary'
                                          className='text-[10px]'
                                        >
                                          Store Default
                                        </Badge>
                                      )}
                                      {whStock != null && (
                                        <Badge
                                          variant={
                                            whStock.available > 0
                                              ? 'outline'
                                              : 'secondary'
                                          }
                                          className={`ms-auto font-mono text-[10px] ${
                                            whStock.available > 0
                                              ? 'border-emerald-500/30 text-emerald-600'
                                              : 'text-muted-foreground'
                                          }`}
                                        >
                                          {whStock.available.toLocaleString()}{' '}
                                          avail.
                                        </Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                )
                              })}
                            </SelectGroup>
                          ) : (
                            <SelectGroup>
                              <SelectLabel className='px-2 py-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase'>
                                {t(
                                  'inventory.form.allWarehousesGroup',
                                  'All Warehouse Facilities'
                                )}
                              </SelectLabel>
                              {availableWarehouseOptions.map((wh) => {
                                const whStock =
                                  variantLiveStock?.stockByWarehouse?.[wh.id]
                                return (
                                  <SelectItem key={wh.id} value={wh.id}>
                                    <div className='flex w-full items-center gap-2'>
                                      <Badge
                                        variant='outline'
                                        className='font-mono text-xs'
                                      >
                                        {wh.code}
                                      </Badge>
                                      <span className='font-medium'>
                                        {wh.name}
                                      </span>
                                      {wh.is_main && (
                                        <Badge
                                          variant='default'
                                          className='bg-amber-500 text-[10px] text-white hover:bg-amber-600'
                                        >
                                          <Star className='me-1 h-2.5 w-2.5 fill-white' />
                                          Main
                                        </Badge>
                                      )}
                                      {whStock != null && (
                                        <Badge
                                          variant={
                                            whStock.available > 0
                                              ? 'outline'
                                              : 'secondary'
                                          }
                                          className={`ms-auto font-mono text-[10px] ${
                                            whStock.available > 0
                                              ? 'border-emerald-500/30 text-emerald-600'
                                              : 'text-muted-foreground'
                                          }`}
                                        >
                                          {whStock.available.toLocaleString()}{' '}
                                          avail.
                                        </Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                )
                              })}
                            </SelectGroup>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Store Logistics Preview Banner when a Store is Selected */}
              {selectedStore && (
                <div className='space-y-2 rounded-lg border bg-muted/20 p-3 text-xs'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2 font-semibold text-foreground'>
                      <Store className='h-3.5 w-3.5 text-primary' />
                      <span>{selectedStore.name} Logistics Route</span>
                    </div>
                    <Badge variant='outline' className='text-[10px]'>
                      {storeConnectedWarehouses.length} Warehouse(s) linked
                    </Badge>
                  </div>
                  {storeConnectedWarehouses.length > 0 ? (
                    <div className='flex flex-wrap gap-2 text-muted-foreground'>
                      {storeConnectedWarehouses.map((sw) => (
                        <div
                          key={sw.id}
                          className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${
                            selectedWarehouseId === sw.id
                              ? 'border-primary bg-primary/10 font-medium text-foreground'
                              : 'bg-background'
                          }`}
                        >
                          <span>{sw.name}</span>
                          <span className='font-mono text-[9px] opacity-70'>
                            [{sw.code}]
                          </span>
                          {sw.is_store_default && (
                            <Badge
                              variant='secondary'
                              className='px-1 py-0 text-[8px]'
                            >
                              Default Hub
                            </Badge>
                          )}
                          <span className='text-[9px] opacity-60'>
                            P#{sw.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className='text-[11px] text-muted-foreground'>
                      No store-specific warehouses assigned yet. Central and
                      main facilities are accessible.
                    </p>
                  )}
                </div>
              )}

              {/* Warehouse Details Preview Card when Warehouse is Selected */}
              {selectedWarehouse && (
                <div className='space-y-2 rounded-lg border border-primary/20 bg-muted/30 p-3 text-xs'>
                  <div className='flex items-start justify-between gap-2'>
                    <div>
                      <div className='flex items-center gap-2'>
                        <span className='font-bold text-foreground'>
                          {selectedWarehouse.name}
                        </span>
                        <Badge
                          variant='outline'
                          className='font-mono text-[10px]'
                        >
                          {selectedWarehouse.code}
                        </Badge>
                        {selectedStoreWarehouseRel?.is_store_default && (
                          <Badge
                            variant='default'
                            className='bg-primary text-[9px]'
                          >
                            Store Primary Hub
                          </Badge>
                        )}
                        {selectedWarehouse.is_main && (
                          <Badge variant='secondary' className='text-[9px]'>
                            Main Hub
                          </Badge>
                        )}
                      </div>
                      <div className='mt-1.5 flex flex-wrap items-center gap-3 text-muted-foreground'>
                        {selectedWarehouse.address && (
                          <span className='flex items-center gap-1'>
                            <MapPin className='h-3 w-3 text-primary' />
                            {selectedWarehouse.address}
                          </span>
                        )}
                        {selectedWarehouse.phone && (
                          <span className='flex items-center gap-1'>
                            <Phone className='h-3 w-3' />
                            {selectedWarehouse.phone}
                          </span>
                        )}
                        {selectedWarehouse.email && (
                          <span className='flex items-center gap-1'>
                            <Mail className='h-3 w-3' />
                            {selectedWarehouse.email}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className='shrink-0 text-end'>
                      <Badge
                        variant='outline'
                        className={`text-[9px] ${
                          selectedWarehouse.allow_negative_stock
                            ? 'border-amber-300 text-amber-600'
                            : 'border-emerald-300 text-emerald-600'
                        }`}
                      >
                        {selectedWarehouse.allow_negative_stock
                          ? 'Allow Negative Stock'
                          : 'Strict Positive Stock'}
                      </Badge>
                    </div>
                  </div>

                  {selectedStoreWarehouseRel && (
                    <div className='flex flex-wrap items-center gap-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground'>
                      <span>
                        Fulfillment:{' '}
                        <strong className='text-foreground'>
                          {selectedStoreWarehouseRel.allow_fulfillment
                            ? 'Enabled'
                            : 'Disabled'}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Replenishment:{' '}
                        <strong className='text-foreground'>
                          {selectedStoreWarehouseRel.allow_replenishment
                            ? 'Enabled'
                            : 'Disabled'}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Transit Lead Time:{' '}
                        <strong className='text-foreground'>
                          {selectedStoreWarehouseRel.lead_time_days} day(s)
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Warehouse Location (Bin / Rack) Selector */}
              <FormField
                control={form.control}
                name='warehouse_location_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='flex items-center justify-between'>
                      <span className='flex items-center gap-1.5'>
                        <MapPin className='h-3.5 w-3.5 text-muted-foreground' />
                        <span>
                          {t(
                            'inventory.form.location',
                            'Specific Storage Location / Bin'
                          )}
                        </span>
                      </span>
                    </FormLabel>
                    <Select
                      disabled={
                        !selectedWarehouseId ||
                        selectedWarehouseId === 'none' ||
                        isLoadingLocations
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
                              !selectedWarehouseId ||
                              selectedWarehouseId === 'none'
                                ? t(
                                    'inventory.form.selectWarehouseFirst',
                                    'Select a warehouse facility first'
                                  )
                                : isLoadingLocations
                                  ? t(
                                      'inventory.form.loadingLocations',
                                      'Loading locations...'
                                    )
                                  : locations && locations.length > 0
                                    ? t(
                                        'inventory.form.selectLocation',
                                        'Select specific bin / shelf / rack'
                                      )
                                    : t(
                                        'inventory.form.noLocationsFound',
                                        'No sub-locations defined in warehouse'
                                      )
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className='max-h-60'>
                        <SelectItem value='none'>
                          <span className='text-muted-foreground'>
                            {t(
                              'inventory.form.noLocationOption',
                              '-- Facility General / Receiving Area --'
                            )}
                          </span>
                        </SelectItem>
                        {locations?.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            <div className='flex w-full items-center gap-2'>
                              <Badge
                                variant='secondary'
                                className='font-mono text-xs'
                              >
                                {loc.code}
                              </Badge>
                              {loc.name && (
                                <span className='font-medium'>{loc.name}</span>
                              )}
                              {loc.path && (
                                <span className='font-mono text-xs text-muted-foreground'>
                                  ({loc.path})
                                </span>
                              )}
                              {loc.location_type && (
                                <Badge
                                  variant='outline'
                                  className='ms-auto text-[10px] uppercase'
                                >
                                  {loc.location_type}
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

              {/* Location Preview Card */}
              {selectedLocation && (
                <div className='flex items-center justify-between rounded-lg border bg-muted/30 p-2.5 text-xs'>
                  <div className='space-y-0.5'>
                    <div className='flex items-center gap-2'>
                      <span className='font-semibold text-foreground'>
                        {selectedLocation.name || selectedLocation.code}
                      </span>
                      <Badge
                        variant='secondary'
                        className='font-mono text-[10px]'
                      >
                        {selectedLocation.code}
                      </Badge>
                      {selectedLocation.location_type && (
                        <Badge
                          variant='outline'
                          className='text-[9px] uppercase'
                        >
                          {selectedLocation.location_type}
                        </Badge>
                      )}
                    </div>
                    {selectedLocation.path && (
                      <p className='flex items-center gap-1 font-mono text-[11px] text-muted-foreground'>
                        <Compass className='h-3 w-3 text-primary' />
                        {selectedLocation.path}
                      </p>
                    )}
                  </div>
                  <div className='flex items-center gap-1.5'>
                    {selectedLocation.is_pickable && (
                      <Badge
                        variant='outline'
                        className='text-[9px] text-emerald-600 dark:text-emerald-400'
                      >
                        {t('inventory.form.pickable', 'Pickable')}
                      </Badge>
                    )}
                    {selectedLocation.is_receivable && (
                      <Badge
                        variant='outline'
                        className='text-[9px] text-blue-600 dark:text-blue-400'
                      >
                        {t('inventory.form.receivable', 'Receivable')}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Granular Physical Coordinate Fields (Aisle, Rack, Shelf, Bin) */}
              <div className='border-t border-border/50 pt-2'>
                <span className='mb-2.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground'>
                  <Hash className='h-3 w-3 text-primary' />
                  Physical Coordinate Mapping (Optional Bin / Shelf Detail)
                </span>
                <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                  <FormField
                    control={form.control}
                    name='aisle'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-[11px]'>Aisle</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='e.g. A-02'
                            value={field.value || ''}
                            onChange={field.onChange}
                            className='h-8 font-mono text-xs'
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='rack'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-[11px]'>Rack</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='e.g. R-04'
                            value={field.value || ''}
                            onChange={field.onChange}
                            className='h-8 font-mono text-xs'
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='shelf'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-[11px]'>Shelf</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='e.g. S-1'
                            value={field.value || ''}
                            onChange={field.onChange}
                            className='h-8 font-mono text-xs'
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='bin'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-[11px]'>Bin</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='e.g. B-12'
                            value={field.value || ''}
                            onChange={field.onChange}
                            className='h-8 font-mono text-xs'
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* ─── 3. Safety Thresholds & Replenishment Policy ─────────────────── */}
            <div className='space-y-4 rounded-xl border bg-card/60 p-4 shadow-2xs'>
              <h4 className='flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                <ShieldCheck className='h-3.5 w-3.5 text-primary' />
                {t(
                  'inventory.form.thresholdsSection',
                  'Safety Stock & Replenishment Policies'
                )}
              </h4>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                {/* Reorder Point */}
                <FormField
                  control={form.control}
                  name='reorder_point'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t(
                          'inventory.form.reorderPoint',
                          'Reorder Point (Min Stock)'
                        )}
                      </FormLabel>
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
                            form.setValue('reorder_level', num)
                          }}
                        />
                      </FormControl>
                      <FormDescription className='text-[11px]'>
                        Triggers replenishment alert.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Safety Stock */}
                <FormField
                  control={form.control}
                  name='safety_stock'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Safety Stock Buffer</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          placeholder='e.g. 5'
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? null
                                : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription className='text-[11px]'>
                        Stockout risk reserve buffer.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Reorder Quantity */}
                <FormField
                  control={form.control}
                  name='reorder_quantity'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reorder Quantity (Lot Size)</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          placeholder='e.g. 50'
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? null
                                : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription className='text-[11px]'>
                        Standard order batch size.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                {/* Max Quantity Capacity */}
                <FormField
                  control={form.control}
                  name='max_quantity'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('inventory.form.maxCapacity', 'Max Stock Capacity')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          placeholder='e.g. 200'
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? null
                                : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription className='text-[11px]'>
                        Storage capacity limit.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Replenishment Lead Time Days */}
                <FormField
                  control={form.control}
                  name='lead_time_days'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Time (Days)</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          placeholder='e.g. 2'
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? null
                                : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription className='text-[11px]'>
                        Estimated transit / receipt days.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Unit Cost */}
                <FormField
                  control={form.control}
                  name='unit_cost'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Standard Unit Cost ($)</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          step='0.01'
                          min={0}
                          placeholder='e.g. 15.50'
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? null
                                : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription className='text-[11px]'>
                        Unit cost valuation basis.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Physical Count & Last Restocked Dates */}
              <div className='grid grid-cols-1 gap-4 border-t border-border/50 pt-2 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='last_count_date'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <Calendar className='h-3.5 w-3.5 text-muted-foreground' />
                        <span>Physical Count Date</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='date'
                          value={field.value || ''}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='last_restocked_date'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <Clock className='h-3.5 w-3.5 text-muted-foreground' />
                        <span>Last Restocked Date</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='date'
                          value={field.value || ''}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Status & Active Flag */}
              <div className='grid grid-cols-1 items-center gap-4 border-t border-border/50 pt-2 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='status'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inventory Status</FormLabel>
                      <Select
                        value={field.value || 'active'}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='active'>Active</SelectItem>
                          <SelectItem value='quarantine'>
                            Quarantine / Inspection
                          </SelectItem>
                          <SelectItem value='seasonal'>
                            Seasonal Stock
                          </SelectItem>
                          <SelectItem value='discontinued'>
                            Discontinued
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='is_active'
                  render={({ field }) => (
                    <FormItem className='mt-4 flex flex-row items-center justify-between rounded-lg border p-3'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-xs font-semibold'>
                          Active Item
                        </FormLabel>
                        <FormDescription className='text-[11px]'>
                          Enable stock tracking and reorder suggestions.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value !== false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Handling Notes */}
              <FormField
                control={form.control}
                name='notes'
                render={({ field }) => (
                  <FormItem className='border-t border-border/50 pt-2'>
                    <FormLabel className='flex items-center gap-1.5'>
                      <FileText className='h-3.5 w-3.5 text-muted-foreground' />
                      <span>Handling & Storage Instructions</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='e.g. Keep refrigerated, handle with care, keep upright...'
                        rows={2}
                        value={field.value || ''}
                        onChange={field.onChange}
                        className='text-xs'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className='gap-2 pt-2 sm:gap-0'>
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
export default InventoryActionDialog
