'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Loader2,
  Package,
  Warehouse,
  MapPin,
  Store,
  Boxes,
  ShieldCheck,
  Tag,
  Barcode,
  Hash,
  Scale,
  SlidersHorizontal,
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { InventoryVariantTablePicker } from './inventory-variant-table-picker'
import {
  inventorySchema,
  type Inventory,
  type InventoryFormValues,
  type ProductVariantItem,
} from '../data/schema'
import {
  useCreateInventory,
  useUpdateInventory,
  useWarehouses,
  useWarehouseLocations,
  useStores,
  useStoreWarehouses,
  useUomList,
} from '../hooks/use-inventory'

interface WarehouseOption {
  id: string
  name: string
  code: string
  is_default: boolean
  is_store_default: boolean
  is_main: boolean
  priority: number
  allow_fulfillment: boolean
  allow_replenishment: boolean
  lead_time_days: number
  phone?: string | null
  email?: string | null
  address?: string | null
  allow_negative_stock?: boolean
  is_store_linked: boolean
}

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

  const { data: stores, isLoading: isLoadingStores } = useStores()
  const { data: warehouses, isLoading: isLoadingWarehouses } = useWarehouses()
  const { data: uoms, isLoading: isLoadingUoms } = useUomList()

  const [selectedVariantInfo, setSelectedVariantInfo] = useState<ProductVariantItem | null>(null)

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventorySchema) as Resolver<InventoryFormValues>,
    defaultValues: {
      product_variant_id: '',
      product_id: '',
      sku: '',
      barcode: '',
      is_stockable: true,
      is_sellable: true,
      is_purchasable: true,
      tracking_type: 'NONE',
      unit_of_measure_id: null,
      status: 'ACTIVE',
      is_active: true,
      notes: '',
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
      aisle: '',
      rack: '',
      shelf: '',
      bin: '',
      last_count_date: new Date().toISOString().slice(0, 10),
      last_restocked_date: null,
    },
  })

  const selectedStoreId = form.watch('store_id')
  const selectedWarehouseId = form.watch('warehouse_id')

  const { data: storeWarehouses, isLoading: isLoadingStoreWarehouses } =
    useStoreWarehouses(selectedStoreId)

  const { data: locations, isLoading: isLoadingLocations } =
    useWarehouseLocations(selectedWarehouseId)

  // Reset form when dialog opens or currentRow changes
  useEffect(() => {
    if (open) {
      if (currentRow) {
        setSelectedVariantInfo(
          currentRow.product_variants
            ? ({
                id: currentRow.product_variants.id,
                sku: currentRow.product_variants.sku,
                name: currentRow.product_variants.name,
                barcode: currentRow.product_variants.barcode,
                product_name: currentRow.products?.name ?? '',
                brand_name: currentRow.products?.brand ?? null,
                category_name: currentRow.products?.category ?? null,
                uom_id: currentRow.unit_of_measure_id || null,
                price: currentRow.product_variants.price ?? 0,
                cost_price: currentRow.product_variants.cost_price ?? null,
                qty_on_hand: currentRow.qty_on_hand ?? 0,
                qty_available: currentRow.qty_available ?? 0,
                qty_reserved: currentRow.qty_reserved ?? 0,
              } as ProductVariantItem)
            : null
        )

        form.reset({
          id: currentRow.id,
          inventory_id: currentRow.id || currentRow.inventory_id,
          product_variant_id: currentRow.product_variant_id || '',
          product_id: currentRow.product_id || currentRow.product_variants?.product_id || '',
          sku: currentRow.sku || currentRow.product_variants?.sku || '',
          barcode: currentRow.barcode || currentRow.product_variants?.barcode || '',
          is_stockable: currentRow.is_stockable !== false,
          is_sellable: currentRow.is_sellable !== false,
          is_purchasable: currentRow.is_purchasable !== false,
          tracking_type:
            (currentRow.tracking_type as
              | 'NONE'
              | 'LOT'
              | 'SERIAL'
              | 'LOT_AND_SERIAL') || 'NONE',
          unit_of_measure_id: currentRow.unit_of_measure_id || null,
          status: currentRow.status || 'ACTIVE',
          is_active: currentRow.is_active !== false,
          notes: currentRow.notes || '',
          store_id: currentRow.store_id || null,
          warehouse_id: currentRow.warehouse_id || null,
          warehouse_location_id: currentRow.warehouse_location_id || null,
          reorder_point: currentRow.reorder_point ?? currentRow.reorder_level ?? 10,
          min_quantity: currentRow.min_quantity ?? currentRow.reorder_level ?? 10,
          max_quantity: currentRow.max_quantity ?? currentRow.max_stock_level ?? 100,
          safety_stock: currentRow.safety_stock ?? 5,
          reorder_quantity: currentRow.reorder_quantity ?? 25,
          unit_cost: currentRow.unit_cost != null ? Number(currentRow.unit_cost) : null,
          lead_time_days: currentRow.lead_time_days ?? 1,
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
        })
      } else {
        setSelectedVariantInfo(null)
        form.reset({
          product_variant_id: '',
          product_id: '',
          sku: '',
          barcode: '',
          is_stockable: true,
          is_sellable: true,
          is_purchasable: true,
          tracking_type: 'NONE',
          unit_of_measure_id: null,
          status: 'ACTIVE',
          is_active: true,
          notes: '',
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
          aisle: '',
          rack: '',
          shelf: '',
          bin: '',
          last_count_date: new Date().toISOString().slice(0, 10),
          last_restocked_date: null,
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
          storeWarehouses.find((sw: { is_default?: boolean }) => sw.is_default) ||
          storeWarehouses[0]
        const rawSw = defaultSw as
          | {
              warehouses?: { id?: string }
              warehouse_id?: string
              id?: string
            }
          | undefined
        const whId = rawSw?.warehouses?.id || rawSw?.warehouse_id || rawSw?.id
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
        product_variant_id: values.product_variant_id,
        sku: values.sku.trim(),
        barcode: values.barcode?.trim() || null,
        is_stockable: values.is_stockable !== false,
        is_sellable: values.is_sellable !== false,
        is_purchasable: values.is_purchasable !== false,
        tracking_type: values.tracking_type || 'NONE',
        unit_of_measure_id:
          values.unit_of_measure_id === 'none' || !values.unit_of_measure_id
            ? null
            : values.unit_of_measure_id,
        status: values.status || 'ACTIVE',
        is_active: values.is_active !== false,
        store_id:
          values.store_id === 'none' || !values.store_id ? null : values.store_id,
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

      if (isEdit && (currentRow?.id || currentRow?.inventory_id)) {
        await updateMutation.mutateAsync({
          ...payload,
          id: currentRow.id,
          inventory_id: currentRow.id || currentRow.inventory_id,
        })
        toast.success(
          t('inventory.toast.updated', 'Inventory item updated successfully')
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

  // Combined warehouse options
  const allWarehouses = useMemo(() => warehouses || [], [warehouses])

  const storeConnectedWarehouses = useMemo(() => {
    if (
      !selectedStoreId ||
      selectedStoreId === 'none' ||
      !storeWarehouses ||
      !Array.isArray(storeWarehouses)
    )
      return []
    return storeWarehouses
      .map((item: unknown) => {
        const sw = item as Record<string, unknown>
        const rawWh = (sw.warehouses ?? sw) as
          | Record<string, unknown>
          | Record<string, unknown>[]
        const wh = Array.isArray(rawWh) ? rawWh[0] : rawWh
        const whId = wh?.id ?? sw.warehouse_id ?? sw.id
        if (!whId) return null
        const whActive = (wh?.is_active ?? sw.is_active ?? true) as boolean
        if (whActive === false) return null
        const isDefault = Boolean(wh?.is_default ?? sw.is_default)
        const isMain = Boolean(
          isDefault ||
            String(wh?.code ?? sw.code ?? '')
              .toUpperCase()
              .includes('MAIN')
        )

        return {
          id: String(whId),
          name: String(wh?.name ?? sw.name ?? 'Warehouse'),
          code: String(wh?.code ?? sw.code ?? ''),
          is_default: isDefault,
          is_store_default: Boolean(sw.is_default || sw.is_store_default),
          is_main: isMain,
          priority: Number(sw.priority ?? 1),
          allow_fulfillment: sw.allow_fulfillment !== false,
          allow_replenishment: sw.allow_replenishment !== false,
          lead_time_days: Number(sw.lead_time_days ?? 1),
          phone: (wh?.phone ?? sw.phone) as string | undefined,
          email: (wh?.email ?? sw.email) as string | undefined,
          address: (wh?.address ?? sw.address) as string | undefined,
          allow_negative_stock: Boolean(
            wh?.allow_negative_stock ?? sw.allow_negative_stock
          ),
          is_store_linked: true,
        }
      })
      .filter(Boolean) as WarehouseOption[]
  }, [selectedStoreId, storeWarehouses])

  const availableWarehouseOptions = useMemo<WarehouseOption[]>(() => {
    if (selectedStoreId && selectedStoreId !== 'none') {
      return storeConnectedWarehouses
    }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='w-[95vw] md:w-[80vw] lg:w-[75vw] max-w-7xl max-h-[92vh] flex flex-col p-0 overflow-hidden'
        aria-describedby='inventory-action-dialog-description'
      >
        <div className='p-6 pb-4 border-b bg-card'>
          <DialogHeader className='space-y-1.5'>
            <div className='flex items-center gap-2.5'>
              <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs'>
                <Boxes className='h-5 w-5' />
              </div>
              <div>
                <DialogTitle className='text-lg sm:text-xl font-bold text-foreground'>
                  {isEdit
                    ? t('inventory.form.editTitle', 'Edit Inventory Item')
                    : t('inventory.form.addTitle', 'Assign Product Variant to Inventory')}
                </DialogTitle>
                <DialogDescription
                  id='inventory-action-dialog-description'
                  className='text-xs text-muted-foreground'
                >
                  {isEdit
                    ? t(
                        'inventory.form.editDesc',
                        'Update SKU, operational tracking policies, and replenishment thresholds.'
                      )
                    : t(
                        'inventory.form.addDesc',
                        'Select a product variant from the database table and configure inventory tracking.'
                      )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Edit Mode Current Stock Indicator */}
          {isEdit && currentRow && (
            <div className='mt-3.5 rounded-lg border bg-muted/40 p-3 space-y-2'>
              <div className='flex items-center justify-between text-xs'>
                <span className='font-semibold text-foreground flex items-center gap-1.5'>
                  <Boxes className='h-3.5 w-3.5 text-primary' />
                  {t('inventory.form.currentStatus', 'Live Stock Status')}
                </span>
                <Badge variant='outline' className='font-mono text-[10px] uppercase'>
                  {currentRow.status || 'ACTIVE'}
                </Badge>
              </div>
              <div className='grid grid-cols-3 gap-2 text-center text-xs'>
                <div className='rounded border bg-background/90 p-2'>
                  <span className='text-[10px] text-muted-foreground block'>
                    {t('inventory.columns.onHand', 'On-Hand')}
                  </span>
                  <p className='text-base font-bold text-foreground'>
                    {Number(currentRow.qty_on_hand ?? currentRow.quantity ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className='rounded border bg-background/90 p-2'>
                  <span className='text-[10px] text-muted-foreground block'>
                    {t('inventory.detail.available', 'Available')}
                  </span>
                  <p className='text-base font-bold text-emerald-600 dark:text-emerald-400'>
                    {Number(currentRow.qty_available ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className='rounded border bg-background/90 p-2'>
                  <span className='text-[10px] text-muted-foreground block'>
                    {t('inventory.detail.reserved', 'Reserved')}
                  </span>
                  <p className='text-base font-bold text-amber-600 dark:text-amber-400'>
                    {Number(currentRow.qty_reserved ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex flex-col flex-1 min-h-0 overflow-hidden'
          >
            <div className='flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:p-6 space-y-5 sm:space-y-6'>
              {/* ─── 1. Product Variant Selection (Database Table with Server-Side Search & Pagination) ─── */}
              <div className='space-y-4 rounded-xl border bg-card/60 p-4 shadow-2xs'>
                <div className='flex items-center justify-between'>
                  <h4 className='flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                    <Package className='h-3.5 w-3.5 text-primary' />
                    {t('inventory.form.productSection', 'Product Variant (Database Catalog)')} *
                  </h4>
                  {isEdit && (
                    <Badge variant='outline' className='text-[10px] text-muted-foreground font-normal'>
                      {t('inventory.form.lockedInEdit', 'Locked in Edit Mode')}
                    </Badge>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name='product_variant_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <InventoryVariantTablePicker
                          value={field.value}
                          disabled={isEdit}
                          currentVariantInfo={
                            currentRow?.product_variants
                              ? {
                                  id: currentRow.product_variants.id,
                                  sku: currentRow.product_variants.sku,
                                  name: currentRow.product_variants.name,
                                  barcode: currentRow.product_variants.barcode,
                                  product_name: currentRow.products?.name ?? '',
                                }
                              : null
                          }
                          onSelect={(variant) => {
                            field.onChange(variant.id)
                            form.setValue('product_id', variant.product_id || '')
                            setSelectedVariantInfo(variant)

                            // Auto-fill SKU if empty
                            const curSku = form.getValues('sku')
                            if (!curSku || curSku.startsWith('SKU-')) {
                              form.setValue('sku', variant.sku)
                            }

                            // Auto-fill barcode if empty
                            if (!form.getValues('barcode') && variant.barcode) {
                              form.setValue('barcode', variant.barcode)
                            }

                            // Auto-fill UOM if variant has one
                            if (variant.uom_id && !form.getValues('unit_of_measure_id')) {
                              form.setValue('unit_of_measure_id', variant.uom_id)
                            }

                            // Auto-fill standard unit cost if available
                            if (variant.cost_price != null && form.getValues('unit_cost') == null) {
                              form.setValue('unit_cost', variant.cost_price)
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Selected Variant Summary Card */}
                {selectedVariantInfo && (
                  <div className='rounded-lg border bg-muted/25 p-3 text-xs space-y-2'>
                    <div className='flex items-start justify-between gap-2'>
                      <div>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <span className='font-bold text-foreground text-sm'>
                            {selectedVariantInfo.product_name}
                          </span>
                          <Badge variant='outline' className='font-mono text-[10px]'>
                            SKU: {selectedVariantInfo.sku}
                          </Badge>
                          {selectedVariantInfo.name && (
                            <Badge variant='secondary' className='text-[10px]'>
                              {selectedVariantInfo.name}
                            </Badge>
                          )}
                        </div>

                        <div className='mt-1 flex flex-wrap items-center gap-3 text-muted-foreground'>
                          {selectedVariantInfo.brand_name && (
                            <span className='flex items-center gap-1'>
                              <Tag className='h-3 w-3 text-primary' />
                              Brand: <strong className='text-foreground'>{selectedVariantInfo.brand_name}</strong>
                            </span>
                          )}
                          {selectedVariantInfo.category_name && (
                            <span className='flex items-center gap-1'>
                              <Tag className='h-3 w-3 text-primary' />
                              Category: <strong className='text-foreground'>{selectedVariantInfo.category_name}</strong>
                            </span>
                          )}
                          {selectedVariantInfo.barcode && (
                            <span className='flex items-center gap-1 font-mono'>
                              <Barcode className='h-3 w-3' />
                              {selectedVariantInfo.barcode}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pricing preview */}
                      <div className='text-end shrink-0'>
                        {selectedVariantInfo.price != null && (
                          <div className='font-mono font-bold text-foreground'>
                            ${Number(selectedVariantInfo.price).toFixed(2)}
                          </div>
                        )}
                        {selectedVariantInfo.cost_price != null && (
                          <div className='font-mono text-[10px] text-muted-foreground'>
                            Cost: ${Number(selectedVariantInfo.cost_price).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ─── 2. Inventory Item Master Attributes & Policies (model inventory_items) ─── */}
              <div className='space-y-4 rounded-xl border bg-card/60 p-4 shadow-2xs'>
                <h4 className='flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                  <SlidersHorizontal className='h-3.5 w-3.5 text-primary' />
                  {t('inventory.form.policiesSection', 'Inventory Item Tracking & Policies')}
                </h4>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {/* SKU */}
                  <FormField
                    control={form.control}
                    name='sku'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='flex items-center gap-1.5'>
                          <Hash className='h-3.5 w-3.5 text-muted-foreground' />
                          <span>{t('inventory.columns.sku', 'Inventory Item SKU')} *</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='e.g. INV-TSHIRT-01'
                            {...field}
                            className='font-mono text-xs'
                          />
                        </FormControl>
                        <FormDescription className='text-[11px]'>
                          Unique identifier in inventory_items.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Barcode */}
                  <FormField
                    control={form.control}
                    name='barcode'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='flex items-center gap-1.5'>
                          <Barcode className='h-3.5 w-3.5 text-muted-foreground' />
                          <span>{t('inventory.columns.barcode', 'Barcode / UPC')}</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='e.g. 123456789012'
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            className='font-mono text-xs'
                          />
                        </FormControl>
                        <FormDescription className='text-[11px]'>
                          Scannable product barcode.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {/* Tracking Type */}
                  <FormField
                    control={form.control}
                    name='tracking_type'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='flex items-center gap-1.5'>
                          <ShieldCheck className='h-3.5 w-3.5 text-muted-foreground' />
                          <span>{t('inventory.form.trackingType', 'Tracking Method')}</span>
                        </FormLabel>
                        <Select
                          value={field.value || 'NONE'}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className='text-xs'>
                              <SelectValue placeholder='Select tracking method' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='NONE'>
                              <div className='flex flex-col text-start'>
                                <span className='font-medium'>None (Standard Stock)</span>
                                <span className='text-[10px] text-muted-foreground'>Simple quantity counts without lot or serial numbers</span>
                              </div>
                            </SelectItem>
                            <SelectItem value='LOT'>
                              <div className='flex flex-col text-start'>
                                <span className='font-medium'>Lot / Batch Tracking</span>
                                <span className='text-[10px] text-muted-foreground'>Track batches with expiration and lot codes</span>
                              </div>
                            </SelectItem>
                            <SelectItem value='SERIAL'>
                              <div className='flex flex-col text-start'>
                                <span className='font-medium'>Serial Number Tracking</span>
                                <span className='text-[10px] text-muted-foreground'>Individual serial number for each unique item unit</span>
                              </div>
                            </SelectItem>
                            <SelectItem value='LOT_AND_SERIAL'>
                              <div className='flex flex-col text-start'>
                                <span className='font-medium'>Lot & Serial Tracking</span>
                                <span className='text-[10px] text-muted-foreground'>Combined batch and serialized traceability</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Unit of Measure (UOM) */}
                  <FormField
                    control={form.control}
                    name='unit_of_measure_id'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='flex items-center gap-1.5'>
                          <Scale className='h-3.5 w-3.5 text-muted-foreground' />
                          <span>{t('inventory.form.uom', 'Unit of Measure')}</span>
                        </FormLabel>
                        <Select
                          disabled={isLoadingUoms}
                          value={field.value || 'none'}
                          onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                        >
                          <FormControl>
                            <SelectTrigger className='text-xs'>
                              <SelectValue
                                placeholder={
                                  isLoadingUoms ? t('common.loading', 'Loading...') : 'Default / Base UOM'
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className='max-h-60'>
                            <SelectItem value='none'>
                              <span className='text-muted-foreground'>-- Default Base UOM --</span>
                            </SelectItem>
                            {uoms?.map((uom) => (
                              <SelectItem key={uom.id} value={uom.id} className='text-xs'>
                                <div className='flex items-center gap-2'>
                                  <Badge variant='outline' className='font-mono text-[10px] px-1 py-0'>
                                    {uom.code}
                                  </Badge>
                                  <span>{uom.name}</span>
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

                {/* Item Operational Policies Grid */}
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1'>
                  <FormField
                    control={form.control}
                    name='is_stockable'
                    render={({ field }) => (
                      <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 bg-background/60'>
                        <div className='space-y-0.5 pe-2'>
                          <FormLabel className='text-xs font-semibold cursor-pointer'>
                            Stockable
                          </FormLabel>
                          <FormDescription className='text-[10px]'>
                            Maintain physical stock counts
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

                  <FormField
                    control={form.control}
                    name='is_sellable'
                    render={({ field }) => (
                      <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 bg-background/60'>
                        <div className='space-y-0.5 pe-2'>
                          <FormLabel className='text-xs font-semibold cursor-pointer'>
                            Sellable
                          </FormLabel>
                          <FormDescription className='text-[10px]'>
                            Available for checkout & POS
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

                  <FormField
                    control={form.control}
                    name='is_purchasable'
                    render={({ field }) => (
                      <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 bg-background/60'>
                        <div className='space-y-0.5 pe-2'>
                          <FormLabel className='text-xs font-semibold cursor-pointer'>
                            Purchasable
                          </FormLabel>
                          <FormDescription className='text-[10px]'>
                            Can be ordered on POs
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

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1'>
                  {/* Status */}
                  <FormField
                    control={form.control}
                    name='status'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lifecycle Status</FormLabel>
                        <Select value={field.value || 'ACTIVE'} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className='text-xs'>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='ACTIVE'>Active</SelectItem>
                            <SelectItem value='INACTIVE'>Inactive</SelectItem>
                            <SelectItem value='DISCONTINUED'>Discontinued</SelectItem>
                            <SelectItem value='ARCHIVED'>Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Active Toggle */}
                  <FormField
                    control={form.control}
                    name='is_active'
                    render={({ field }) => (
                      <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 bg-background/60 mt-auto'>
                        <div className='space-y-0.5'>
                          <FormLabel className='text-xs font-semibold cursor-pointer'>
                            Item Active
                          </FormLabel>
                          <FormDescription className='text-[11px]'>
                            Allow transaction processing
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

                {/* Notes */}
                <FormField
                  control={form.control}
                  name='notes'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Handling & Storage Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='e.g. Fragile, store in temperature controlled area...'
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          rows={2}
                          className='text-xs resize-none'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ─── 3. Storage Facility & Warehouse Route (reorder_rules & facility assignment) ─── */}
              <div className='space-y-4 rounded-xl border bg-card/60 p-4 shadow-2xs'>
                <div className='flex items-center justify-between'>
                  <h4 className='flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                    <Warehouse className='h-3.5 w-3.5 text-primary' />
                    {t('inventory.form.locationSection', 'Storage Facility & Warehouse Route')}
                  </h4>
                  {selectedWarehouseId && selectedWarehouseId !== 'none' && locations && (
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
                          <span>{t('inventory.form.store', 'Assigned Store')}</span>
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
                            <SelectTrigger className='text-xs'>
                              <SelectValue placeholder='All Stores / General Enterprise' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className='max-h-60'>
                            <SelectItem value='none'>
                              <span className='text-muted-foreground'>-- All Stores / General Enterprise --</span>
                            </SelectItem>
                            {stores?.map((store) => (
                              <SelectItem key={store.store_id} value={store.store_id} className='text-xs'>
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
                          <span>{t('inventory.form.warehouse', 'Warehouse Facility')}</span>
                        </FormLabel>
                        <Select
                          disabled={isLoadingWarehouses || isLoadingStoreWarehouses}
                          value={field.value || 'none'}
                          onValueChange={(val) => {
                            const nextVal = val === 'none' ? null : val
                            field.onChange(nextVal)
                            form.setValue('warehouse_location_id', null)
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className='text-xs'>
                              <SelectValue placeholder='Select warehouse facility' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className='max-h-60'>
                            <SelectItem value='none'>
                              <span className='text-muted-foreground'>-- No Warehouse Specified --</span>
                            </SelectItem>
                            {availableWarehouseOptions.map((wh) => (
                              <SelectItem key={wh.id} value={wh.id} className='text-xs'>
                                <div className='flex items-center gap-2'>
                                  <Badge variant='outline' className='font-mono text-[10px] px-1 py-0'>
                                    {wh.code}
                                  </Badge>
                                  <span>{wh.name}</span>
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

                {/* Warehouse Location / Bin */}
                {selectedWarehouseId && selectedWarehouseId !== 'none' && (
                  <FormField
                    control={form.control}
                    name='warehouse_location_id'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='flex items-center gap-1.5'>
                          <MapPin className='h-3.5 w-3.5 text-muted-foreground' />
                          <span>{t('inventory.form.location', 'Specific Bin / Storage Rack')}</span>
                        </FormLabel>
                        <Select
                          disabled={isLoadingLocations}
                          value={field.value || 'none'}
                          onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                        >
                          <FormControl>
                            <SelectTrigger className='text-xs'>
                              <SelectValue placeholder='General Warehouse Area' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className='max-h-60'>
                            <SelectItem value='none'>
                              <span className='text-muted-foreground'>-- General Warehouse Area --</span>
                            </SelectItem>
                            {locations?.map((loc) => (
                              <SelectItem key={loc.id} value={loc.id} className='text-xs'>
                                <div className='flex items-center gap-2'>
                                  <Badge variant='secondary' className='font-mono text-[10px] px-1 py-0'>
                                    {loc.code}
                                  </Badge>
                                  <span>{loc.name || loc.path || loc.code}</span>
                                </div>
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

              {/* ─── 4. Safety Stock & Replenishment Policies ─── */}
              <div className='space-y-4 rounded-xl border bg-card/60 p-4 shadow-2xs'>
                <h4 className='flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                  <ShieldCheck className='h-3.5 w-3.5 text-primary' />
                  {t('inventory.form.policySection', 'Safety Stock & Replenishment Policies')}
                </h4>

                <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                  <FormField
                    control={form.control}
                    name='reorder_point'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs'>Reorder Point</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min={0}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? null : Number(e.target.value))
                            }
                            className='text-xs'
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='safety_stock'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs'>Safety Stock</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min={0}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? null : Number(e.target.value))
                            }
                            className='text-xs'
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='reorder_quantity'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs'>Reorder Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min={0}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? null : Number(e.target.value))
                            }
                            className='text-xs'
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                  <FormField
                    control={form.control}
                    name='max_quantity'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs'>Max Stock Capacity</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min={0}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? null : Number(e.target.value))
                            }
                            className='text-xs'
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='lead_time_days'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs'>Lead Time (Days)</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min={0}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? null : Number(e.target.value))
                            }
                            className='text-xs'
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='unit_cost'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs'>Standard Unit Cost ($)</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            step='0.01'
                            min={0}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? null : Number(e.target.value))
                            }
                            className='text-xs'
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className='p-4 border-t bg-card/60 flex items-center justify-between gap-2 mt-auto'>
              <Button
                type='button'
                variant='outline'
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}
                className='text-xs'
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type='submit' disabled={isSubmitting} className='gap-2 text-xs'>
                {isSubmitting && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
                {isEdit
                  ? t('inventory.form.saveChanges', 'Save Changes')
                  : t('inventory.form.createItem', 'Register in Inventory')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
