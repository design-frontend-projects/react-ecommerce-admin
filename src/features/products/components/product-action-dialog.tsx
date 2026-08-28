import { useState, useEffect } from 'react'
import { useForm, useFieldArray, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import {
  Scan as LucideScan,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Layers,
  Package,
  DollarSign,
  Truck,
  Sliders,
  FolderTree,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QRCodeScanner } from '@/components/custom-ui/qr-code-scanner'
import { LookupSelect } from '@/features/lookups/components/lookup-select'
import {
  useBrandOptions,
  useCategoryOptions,
  useSupplierOptions,
  useUomOptions,
  useProductTypeOptions,
} from '../hooks/use-product-options'
import {
  productActionFormSchema,
  type ProductActionFormData,
  type Product,
  type ProductType,
  type TrackingMode,
} from '../data/schema'
import {
  useCreateProductWithVariants,
  useUpdateProductWithVariants,
} from '../hooks/use-products'
import { BarcodeDisplay } from './barcode-display'

interface Props {
  currentRow?: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductActionDialog({ currentRow, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const isEdit = Boolean(currentRow)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  const { mutateAsync: createProduct, isPending: isCreating } =
    useCreateProductWithVariants()
  const { mutateAsync: updateProduct, isPending: isUpdating } =
    useUpdateProductWithVariants()
  const isPending = isCreating || isUpdating

  // Options queries
  const { data: categories = [] } = useCategoryOptions()
  const { data: brands = [] } = useBrandOptions()
  const { data: uoms = [] } = useUomOptions()
  const { data: suppliers = [] } = useSupplierOptions()
  const { data: productTypes = [] } = useProductTypeOptions()

  const getInitialVariants = (product?: Product | null) => {
    if (!product || !product.product_variants || product.product_variants.length === 0) {
      return []
    }
    return product.product_variants.map((v) => {
      let dimLabel = ''
      if (typeof v.dimensions === 'string') {
        dimLabel = v.dimensions
      } else if (v.dimensions && typeof v.dimensions === 'object' && 'label' in (v.dimensions as Record<string, unknown>)) {
        dimLabel = String((v.dimensions as Record<string, unknown>).label || '')
      }

      return {
        id: v.id,
        sku: v.sku,
        barcode: v.barcode || '',
        name: v.name || '',
        price: Number(v.price) || 0,
        cost_price: v.cost_price ? Number(v.cost_price) : 0,
        stock_quantity: v.stock_quantity || 0,
        min_stock: v.min_stock || 0,
        weight: v.weight ? Number(v.weight) : null,
        dimensions: dimLabel,
        is_active: v.is_active ?? true,
        uom_id: v.uom_id || null,
        attributes_label: dimLabel || v.name || '',
      }
    })
  }

  const form = useForm<ProductActionFormData>({
    resolver: zodResolver(productActionFormSchema) as Resolver<ProductActionFormData>,
    defaultValues: {
      name: '',
      description: '',
      sku: '',
      barcode: '',
      category_id: null,
      brand_id: null,
      base_uom_id: null,
      supplier_id: null,
      product_type: 'simple',
      product_type_id: null,
      tracking_mode: 'none',
      base_price: 0,
      tax_code: '',
      tax_classification_id: null,
      reorder_level: 0,
      weight: null,
      dimensions: '',
      is_active: true,
      is_stock_item: true,
      reorderable: true,
      is_batch_tracked: false,
      is_serial_tracked: false,
      has_variants: false,
      has_expiration: false,
      expiration_date: null,
      is_marketplace: false,
      variants: [],
    },
  })

  // Reset form when currentRow or open changes
  useEffect(() => {
    if (open) {
      if (currentRow) {
        const firstVariant = currentRow.product_variants?.[0]
        form.reset({
          name: currentRow.name || '',
          description: currentRow.description || '',
          sku: currentRow.sku || '',
          barcode: currentRow.barcode || '',
          category_id: currentRow.category_id || null,
          brand_id: currentRow.brand_id || null,
          base_uom_id: currentRow.base_uom_id || null,
          supplier_id: currentRow.supplier_id || null,
          product_type: (currentRow.product_type as ProductType) || 'simple',
          product_type_id: currentRow.product_type_id || null,
          tracking_mode: (currentRow.tracking_mode as TrackingMode) || 'none',
          base_price: currentRow.base_price ? Number(currentRow.base_price) : (firstVariant ? Number(firstVariant.price) : 0),
          tax_code: currentRow.tax_code || '',
          tax_classification_id: currentRow.tax_classification_id || null,
          reorder_level: currentRow.reorder_level ? Number(currentRow.reorder_level) : 0,
          weight: currentRow.weight ? Number(currentRow.weight) : null,
          dimensions: currentRow.dimensions || '',
          is_active: currentRow.is_active ?? true,
          is_stock_item: currentRow.is_stock_item ?? true,
          reorderable: currentRow.reorderable ?? true,
          is_batch_tracked: currentRow.is_batch_tracked ?? false,
          is_serial_tracked: currentRow.is_serial_tracked ?? false,
          has_variants: currentRow.has_variants ?? (currentRow.product_variants && currentRow.product_variants.length > 1),
          has_expiration: currentRow.has_expiration ?? false,
          expiration_date: currentRow.expiration_date ? new Date(currentRow.expiration_date) : null,
          is_marketplace: currentRow.is_marketplace ?? false,
          variants: getInitialVariants(currentRow),
        })
      } else {
        form.reset({
          name: '',
          description: '',
          sku: '',
          barcode: '',
          category_id: null,
          brand_id: null,
          base_uom_id: null,
          supplier_id: null,
          product_type: 'simple',
          product_type_id: null,
          tracking_mode: 'none',
          base_price: 0,
          tax_code: '',
          tax_classification_id: null,
          reorder_level: 0,
          weight: null,
          dimensions: '',
          is_active: true,
          is_stock_item: true,
          reorderable: true,
          is_batch_tracked: false,
          is_serial_tracked: false,
          has_variants: false,
          has_expiration: false,
          expiration_date: null,
          is_marketplace: false,
          variants: [],
        })
      }
      setActiveTab('basic')
    }
  }, [open, currentRow, form])

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'variants',
  })

  const hasVariants = form.watch('has_variants')
  const hasExpiration = form.watch('has_expiration')
  const productType = form.watch('product_type')

  useEffect(() => {
    if ((hasVariants || productType === 'variant') && fields.length === 0 && open) {
      const currentValues = form.getValues()
      append({
        sku: currentValues.sku ? `${currentValues.sku}-V1` : '',
        barcode: '',
        name: 'Default',
        price: currentValues.base_price || 0,
        cost_price: 0,
        stock_quantity: 0,
        min_stock: currentValues.reorder_level || 0,
        weight: currentValues.weight || null,
        dimensions: currentValues.dimensions || '',
        is_active: true,
        uom_id: currentValues.base_uom_id || null,
        attributes_label: 'Default',
      })
    }
  }, [hasVariants, productType, fields.length, open, append, form])

  const onSubmit = async (values: ProductActionFormData) => {
    try {
      const { variants, ...baseData } = values

      const targetId = currentRow?.id || (currentRow?.product_id ? String(currentRow.product_id) : null)

      const expirationIso = baseData.expiration_date
        ? typeof baseData.expiration_date === 'string'
          ? baseData.expiration_date
          : baseData.expiration_date.toISOString()
        : null

      const cleanedBase: Partial<Product> = {
        ...baseData,
        expiration_date: expirationIso,
        has_variants: Boolean(hasVariants || productType === 'variant' || (variants && variants.length > 1)),
      }

      // Default single variant fallback if no variants array
      const defaultVariant = {
        sku: values.sku,
        barcode: values.barcode || null,
        name: values.name,
        price: values.base_price || 0,
        cost_price: null,
        is_active: values.is_active,
        weight: values.weight,
        dimensions: values.dimensions,
        stock_quantity: 0,
        min_stock: values.reorder_level || 0,
        uom_id: values.base_uom_id,
        attributes_label: 'Default',
      }

      const finalVariants =
        variants && variants.length > 0 ? variants : [defaultVariant]

      if (isEdit && targetId) {
        await updateProduct({
          id: targetId,
          base: cleanedBase,
          variants: finalVariants,
        })
        toast.success(t('products.toast.updated'))
      } else {
        await createProduct({
          base: cleanedBase,
          variants: finalVariants,
        })
        toast.success(t('products.toast.created'))
      }

      onOpenChange(false)
      form.reset()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('products.toast.error'))
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) form.reset()
      }}
    >
      <DialogContent className='flex max-h-[92vh] max-w-4xl flex-col p-0'>
        <DialogHeader className='border-b px-6 py-4'>
          <DialogTitle className='text-xl font-bold'>
            {isEdit ? t('products.editProduct') : t('products.createProduct')}
          </DialogTitle>
          <DialogDescription>
            {t('products.description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='product-main-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex flex-1 flex-col overflow-hidden'
          >
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className='flex flex-1 flex-col overflow-hidden'
            >
              <div className='border-b bg-muted/30 px-6'>
                <TabsList className='h-11 w-full justify-start gap-2 bg-transparent p-0'>
                  <TabsTrigger
                    value='basic'
                    className='gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs'
                  >
                    <Package className='h-4 w-4' />
                    {t('products.formTabs.basic')}
                  </TabsTrigger>
                  <TabsTrigger
                    value='organization'
                    className='gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs'
                  >
                    <FolderTree className='h-4 w-4' />
                    {t('products.formTabs.organization')}
                  </TabsTrigger>
                  <TabsTrigger
                    value='inventory'
                    className='gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs'
                  >
                    <Sliders className='h-4 w-4' />
                    {t('products.formTabs.inventory')}
                  </TabsTrigger>
                  <TabsTrigger
                    value='pricing'
                    className='gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs'
                  >
                    <DollarSign className='h-4 w-4' />
                    {t('products.formTabs.pricing')}
                  </TabsTrigger>
                  <TabsTrigger
                    value='logistics'
                    className='gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs'
                  >
                    <Truck className='h-4 w-4' />
                    {t('products.formTabs.logistics')}
                  </TabsTrigger>
                  {(hasVariants || productType === 'variant') && (
                    <TabsTrigger
                      value='variants'
                      className='gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs'
                    >
                      <Layers className='h-4 w-4' />
                      {t('products.formTabs.variants')} ({fields.length})
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <div className='flex-1 overflow-y-auto px-6 py-4'>
                {/* ── TAB 1: BASIC INFORMATION ──────────────────────── */}
                <TabsContent value='basic' className='m-0 space-y-4'>
                  <FormField
                    control={form.control}
                    name='name'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('products.form.name')} *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('products.form.namePlaceholder')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <FormField
                      control={form.control}
                      name='sku'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('products.form.sku')} *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('products.form.skuPlaceholder')}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='barcode'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('products.form.barcode')}</FormLabel>
                          <div className='flex gap-2'>
                            <FormControl>
                              <Input
                                placeholder={t('products.form.barcodePlaceholder')}
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              title='Scan Barcode'
                              onClick={() => setIsScannerOpen(true)}
                            >
                              <LucideScan className='h-4 w-4' />
                            </Button>
                          </div>

                          <QRCodeScanner
                            open={isScannerOpen}
                            onOpenChange={setIsScannerOpen}
                            onScan={(data: string) => {
                              field.onChange(data)
                              setIsScannerOpen(false)
                            }}
                          />
                          {field.value && (
                            <div className='mt-2'>
                              <BarcodeDisplay
                                value={field.value}
                                type={
                                  field.value.length > 20 ? 'qrcode' : 'barcode'
                                }
                              />
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name='description'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('products.form.description')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('products.form.descriptionPlaceholder')}
                            className='resize-y min-h-[100px]'
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2'>
                    <FormField
                      control={form.control}
                      name='is_active'
                      render={({ field }) => (
                        <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs'>
                          <div className='space-y-0.5'>
                            <FormLabel>{t('products.form.status')}</FormLabel>
                            <FormDescription>
                              {field.value ? t('products.form.active') : t('products.form.inactive')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='is_marketplace'
                      render={({ field }) => (
                        <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs'>
                          <div className='space-y-0.5'>
                            <FormLabel>{t('products.form.isMarketplace')}</FormLabel>
                            <FormDescription>
                              {t('products.form.isMarketplaceDesc')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* ── TAB 2: CLASSIFICATION & ORGANIZATION ──────────── */}
                <TabsContent value='organization' className='m-0 space-y-4'>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    {/* Category Select */}
                    <FormField
                      control={form.control}
                      name='category_id'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('products.form.category')}</FormLabel>
                          <Select
                            onValueChange={(val) => field.onChange(val || null)}
                            value={field.value || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('products.form.selectCategory')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Brand Select */}
                    <FormField
                      control={form.control}
                      name='brand_id'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('products.form.brand')}</FormLabel>
                          <Select
                            onValueChange={(val) => field.onChange(val || null)}
                            value={field.value || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('products.form.selectBrand')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {brands.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.name} {b.code ? `(${b.code})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Base UOM Select */}
                    <FormField
                      control={form.control}
                      name='base_uom_id'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('products.form.unit')}</FormLabel>
                          <Select
                            onValueChange={(val) => field.onChange(val || null)}
                            value={field.value || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('products.form.selectUnit')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {uoms.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.name} ({u.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Supplier Select */}
                    <FormField
                      control={form.control}
                      name='supplier_id'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('products.form.supplier')}</FormLabel>
                          <Select
                            onValueChange={(val) => field.onChange(val || null)}
                            value={field.value || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('products.form.selectSupplier')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {suppliers.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name} {s.code ? `(${s.code})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2'>
                    {/* Product Type Enum */}
                    <FormField
                      control={form.control}
                      name='product_type'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('products.form.productType')}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || 'simple'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('products.form.selectProductType')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value='simple'>
                                {t('products.enums.productType.simple')}
                              </SelectItem>
                              <SelectItem value='variant'>
                                {t('products.enums.productType.variant')}
                              </SelectItem>
                              <SelectItem value='bundle'>
                                {t('products.enums.productType.bundle')}
                              </SelectItem>
                              <SelectItem value='service'>
                                {t('products.enums.productType.service')}
                              </SelectItem>
                              <SelectItem value='composite'>
                                {t('products.enums.productType.composite')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Select for Product Type Classification (Global Product Types) */}
                    <FormField
                      control={form.control}
                      name='product_type_id'
                      render={({ field }) => {
                        const selectedType = productTypes.find((pt) => pt.id === field.value)
                        return (
                          <FormItem>
                            <FormLabel>{t('products.form.productTypeClassification')}</FormLabel>
                            <Select
                              onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                              value={field.value || 'none'}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('products.form.selectProductType')}>
                                    {selectedType ? (
                                      <div className='flex items-center gap-2 truncate'>
                                        {selectedType.color && (
                                          <span
                                            className='h-2.5 w-2.5 rounded-full shrink-0'
                                            style={{ backgroundColor: selectedType.color }}
                                          />
                                        )}
                                        <span className='font-medium'>{selectedType.name}</span>
                                        {selectedType.name_ar && (
                                          <span className='text-xs text-muted-foreground'>
                                            ({selectedType.name_ar})
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className='text-muted-foreground'>
                                        {t('products.form.selectProductType')}
                                      </span>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value='none' className='text-muted-foreground italic'>
                                  -- {t('common.none', 'None / Unclassified')} --
                                </SelectItem>
                                {productTypes.map((pt) => (
                                  <SelectItem key={pt.id} value={pt.id}>
                                    <div className='flex flex-col py-0.5 text-left'>
                                      <div className='flex items-center gap-2'>
                                        {pt.color && (
                                          <span
                                            className='h-2.5 w-2.5 rounded-full shrink-0'
                                            style={{ backgroundColor: pt.color }}
                                          />
                                        )}
                                        <span className='font-medium text-foreground'>{pt.name}</span>
                                        {pt.name_ar && (
                                          <span className='text-xs text-muted-foreground'>
                                            ({pt.name_ar})
                                          </span>
                                        )}
                                      </div>
                                      {pt.description && (
                                        <span className='text-[11px] text-muted-foreground line-clamp-1'>
                                          {pt.description}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription className='text-xs'>
                              {selectedType?.description ||
                                t(
                                  'products.form.productTypeClassificationDesc',
                                  'Macro-level product classification (e.g., Non-durable goods, Durable goods, Service)'
                                )}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />
                  </div>
                </TabsContent>

                {/* ── TAB 3: INVENTORY & TRACKING ────────────────────── */}
                <TabsContent value='inventory' className='m-0 space-y-4'>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    {/* Tracking Mode Enum */}
                    <FormField
                      control={form.control}
                      name='tracking_mode'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('products.form.trackingMode')}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || 'none'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('products.form.selectTrackingMode')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value='none'>
                                {t('products.enums.trackingMode.none')}
                              </SelectItem>
                              <SelectItem value='batch'>
                                {t('products.enums.trackingMode.batch')}
                              </SelectItem>
                              <SelectItem value='serial'>
                                {t('products.enums.trackingMode.serial')}
                              </SelectItem>
                              <SelectItem value='batch_and_serial'>
                                {t('products.enums.trackingMode.batch_and_serial')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Reorder Level */}
                    <FormField
                      control={form.control}
                      name='reorder_level'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('products.form.reorderLevel')}</FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              min='0'
                              placeholder={t('products.form.reorderLevelPlaceholder')}
                              value={(field.value as number) ?? ''}
                              onChange={(e) =>
                                field.onChange(e.target.valueAsNumber || 0)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2'>
                    <FormField
                      control={form.control}
                      name='is_stock_item'
                      render={({ field }) => (
                        <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs'>
                          <div className='space-y-0.5'>
                            <FormLabel>{t('products.form.isStockItem')}</FormLabel>
                            <FormDescription className='text-xs'>
                              {t('products.form.isStockItemDesc')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='reorderable'
                      render={({ field }) => (
                        <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs'>
                          <div className='space-y-0.5'>
                            <FormLabel>{t('products.form.reorderable')}</FormLabel>
                            <FormDescription className='text-xs'>
                              {t('products.form.reorderableDesc')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='is_batch_tracked'
                      render={({ field }) => (
                        <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs'>
                          <div className='space-y-0.5'>
                            <FormLabel>{t('products.form.isBatchTracked')}</FormLabel>
                            <FormDescription className='text-xs'>
                              {t('products.form.isBatchTrackedDesc')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='is_serial_tracked'
                      render={({ field }) => (
                        <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs'>
                          <div className='space-y-0.5'>
                            <FormLabel>{t('products.form.isSerialTracked')}</FormLabel>
                            <FormDescription className='text-xs'>
                              {t('products.form.isSerialTrackedDesc')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='has_variants'
                      render={({ field }) => (
                        <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs'>
                          <div className='space-y-0.5'>
                            <FormLabel>{t('products.form.hasVariants')}</FormLabel>
                            <FormDescription className='text-xs'>
                              {t('products.form.hasVariantsDesc')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='has_expiration'
                      render={({ field }) => (
                        <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs'>
                          <div className='space-y-0.5'>
                            <FormLabel>{t('products.form.hasExpiration')}</FormLabel>
                            <FormDescription className='text-xs'>
                              {t('products.form.hasExpirationDesc')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {hasExpiration && (
                    <FormField
                      control={form.control}
                      name='expiration_date'
                      render={({ field }) => (
                        <FormItem className='flex flex-col pt-2'>
                          <FormLabel>{t('products.form.expirationDate')}</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant='outline'
                                  className={cn(
                                    'w-full pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? (
                                    format(new Date(field.value), 'PPP')
                                  ) : (
                                    <span>{t('products.form.pickExpirationDate')}</span>
                                  )}
                                  <CalendarIcon className='ms-auto h-4 w-4 opacity-50' />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className='w-auto p-0' align='start'>
                              <Calendar
                                mode='single'
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date(new Date().setHours(0, 0, 0, 0))
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </TabsContent>

                {/* ── TAB 4: PRICING & TAX ────────────────────────────── */}
                <TabsContent value='pricing' className='m-0 space-y-4'>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <FormField
                      control={form.control}
                      name='base_price'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('products.form.price')} *</FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              step='0.01'
                              min='0'
                              placeholder='0.00'
                              value={(field.value as number) ?? ''}
                              onChange={(e) =>
                                field.onChange(e.target.valueAsNumber || 0)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='tax_code'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('products.form.taxCode')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('products.form.taxCodePlaceholder')}
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='tax_classification_id'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('products.form.taxClassification')}</FormLabel>
                          <FormControl>
                            <LookupSelect
                              lookupType='tax_classification'
                              value={field.value}
                              onChange={(val) => field.onChange(val)}
                              placeholder={t('products.form.selectTaxClassification')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* ── TAB 5: LOGISTICS & PHYSICAL ATTRIBUTES ──────────── */}
                <TabsContent value='logistics' className='m-0 space-y-4'>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <FormField
                      control={form.control}
                      name='weight'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('products.form.weight')}</FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              step='0.01'
                              min='0'
                              placeholder='0.00'
                              value={(field.value as number) ?? ''}
                              onChange={(e) =>
                                field.onChange(
                                  isNaN(e.target.valueAsNumber)
                                    ? null
                                    : e.target.valueAsNumber
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='dimensions'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('products.form.dimensions')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('products.form.dimensionsPlaceholder')}
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* ── TAB 6: VARIANTS ─────────────────────────────────── */}
                {(hasVariants || productType === 'variant') && (
                  <TabsContent value='variants' className='m-0 space-y-4'>
                    <div className='flex items-center justify-between border-b pb-2'>
                      <div>
                        <h3 className='text-base font-semibold'>
                          {t('products.form.variantTitle')}
                        </h3>
                        <p className='text-xs text-muted-foreground'>
                          {t('products.form.hasVariantsDesc')}
                        </p>
                      </div>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          append({
                            sku: form.getValues('sku')
                              ? `${form.getValues('sku')}-V${fields.length + 1}`
                              : '',
                            barcode: '',
                            name: `Variant ${fields.length + 1}`,
                            price: form.getValues('base_price') || 0,
                            cost_price: 0,
                            stock_quantity: 0,
                            min_stock: form.getValues('reorder_level') || 0,
                            weight: form.getValues('weight') || null,
                            dimensions: form.getValues('dimensions') || '',
                            is_active: true,
                            uom_id: form.getValues('base_uom_id') || null,
                            attributes_label: `Variant ${fields.length + 1}`,
                          })
                        }
                      >
                        <Plus className='me-1.5 h-4 w-4' />
                        {t('products.form.addVariant')}
                      </Button>
                    </div>

                    <div className='space-y-4 pr-1'>
                      {fields.map((field, index) => (
                        <Card key={field.id} className='relative shadow-xs'>
                          <CardContent className='flex flex-col gap-3 pt-4'>
                            {fields.length > 1 && (
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive'
                                onClick={() => remove(index)}
                              >
                                <Trash2 className='h-4 w-4' />
                              </Button>
                            )}

                            {/* Variant Row 1 */}
                            <div className='grid grid-cols-1 gap-3 sm:grid-cols-4'>
                              <FormField
                                control={form.control}
                                name={`variants.${index}.attributes_label`}
                                render={({ field: vField }) => (
                                  <FormItem>
                                    <FormLabel className='text-xs'>
                                      {t('products.form.variantLabel')}
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder={t('products.form.variantLabelPlaceholder')}
                                        {...vField}
                                        value={vField.value || ''}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`variants.${index}.sku`}
                                render={({ field: vField }) => (
                                  <FormItem>
                                    <FormLabel className='text-xs'>
                                      {t('products.form.variantSku')} *
                                    </FormLabel>
                                    <FormControl>
                                      <Input placeholder='SKU' {...vField} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`variants.${index}.barcode`}
                                render={({ field: vField }) => (
                                  <FormItem>
                                    <FormLabel className='text-xs'>
                                      {t('products.form.variantBarcode')}
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder='Barcode'
                                        {...vField}
                                        value={vField.value || ''}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`variants.${index}.is_active`}
                                render={({ field: vField }) => (
                                  <FormItem className='flex h-[36px] flex-row items-center justify-between rounded-lg border px-3 sm:mt-[22px]'>
                                    <FormLabel className='text-xs'>
                                      {t('products.form.active')}
                                    </FormLabel>
                                    <FormControl>
                                      <Switch
                                        checked={vField.value}
                                        onCheckedChange={vField.onChange}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Variant Row 2 */}
                            <div className='grid grid-cols-1 gap-3 sm:grid-cols-4'>
                              <FormField
                                control={form.control}
                                name={`variants.${index}.price`}
                                render={({ field: vField }) => (
                                  <FormItem>
                                    <FormLabel className='text-xs'>
                                      {t('products.form.variantPrice')} *
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type='number'
                                        step='0.01'
                                        min='0'
                                        value={(vField.value as number) ?? ''}
                                        onChange={(e) =>
                                          vField.onChange(
                                            e.target.valueAsNumber || 0
                                          )
                                        }
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`variants.${index}.cost_price`}
                                render={({ field: vField }) => (
                                  <FormItem>
                                    <FormLabel className='text-xs'>
                                      {t('products.form.variantCost')}
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type='number'
                                        step='0.01'
                                        min='0'
                                        value={(vField.value as number) ?? ''}
                                        onChange={(e) =>
                                          vField.onChange(
                                            e.target.valueAsNumber || 0
                                          )
                                        }
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`variants.${index}.stock_quantity`}
                                render={({ field: vField }) => (
                                  <FormItem>
                                    <FormLabel className='text-xs'>
                                      {t('products.form.variantInitialStock')}
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type='number'
                                        min='0'
                                        value={(vField.value as number) ?? ''}
                                        onChange={(e) =>
                                          vField.onChange(
                                            e.target.valueAsNumber || 0
                                          )
                                        }
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`variants.${index}.min_stock`}
                                render={({ field: vField }) => (
                                  <FormItem>
                                    <FormLabel className='text-xs'>
                                      {t('products.form.variantMinStock')}
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type='number'
                                        min='0'
                                        value={(vField.value as number) ?? ''}
                                        onChange={(e) =>
                                          vField.onChange(
                                            e.target.valueAsNumber || 0
                                          )
                                        }
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {fields.length === 0 && (
                        <div className='rounded-lg border border-dashed bg-muted/20 p-8 text-center'>
                          <p className='text-sm text-muted-foreground'>
                            {t('products.form.noVariantsPrompt')}
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </form>
        </Form>

        <DialogFooter className='border-t bg-muted/20 px-6 py-3'>
          <Button
            variant='outline'
            type='button'
            onClick={() => onOpenChange(false)}
          >
            {t('products.form.cancel')}
          </Button>
          <Button type='submit' form='product-main-form' disabled={isPending}>
            {isPending
              ? t('products.form.saving')
              : isEdit
                ? t('products.form.save')
                : t('products.form.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
