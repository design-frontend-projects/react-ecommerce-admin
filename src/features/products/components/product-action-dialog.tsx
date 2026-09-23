import { useState, useEffect, useMemo } from 'react'
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
  Table as TableIcon,
  LayoutGrid,
  Copy,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { QRCodeScanner } from '@/components/custom-ui/qr-code-scanner'
import { SearchableSelect } from '@/components/custom-ui/searchable-select'
import { TaxClassificationSelect } from './tax-classification-select'
import {
  useBrandOptions,
  useCategoryOptions,
  formatCategorySearchableOptions,
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
  type VariantRowFormData,
} from '../data/schema'
import {
  useProduct,
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
  const [isBaseScannerOpen, setIsBaseScannerOpen] = useState(false)
  const [scanningVariantIndex, setScanningVariantIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState('basic')
  const [variantViewMode, setVariantViewMode] = useState<'table' | 'cards'>('table')

  const targetProductId = currentRow?.id || (currentRow?.product_id ? String(currentRow.product_id) : null)

  // Fetch fresh product with all variants and relationships when editing
  const { data: freshProduct, isLoading: isFreshLoading } = useProduct(
    open && targetProductId ? targetProductId : null
  )

  const activeProduct = freshProduct || currentRow

  const { mutateAsync: createProduct, isPending: isCreating } =
    useCreateProductWithVariants()
  const { mutateAsync: updateProduct, isPending: isUpdating } =
    useUpdateProductWithVariants()
  const isPending = isCreating || isUpdating

  // Options queries
  const { data: categories = [], isLoading: isCategoriesLoading } =
    useCategoryOptions()
  const categoryOptions = useMemo(
    () => formatCategorySearchableOptions(categories),
    [categories]
  )
  const { data: brands = [], isLoading: isBrandsLoading } = useBrandOptions()
  const { data: uoms = [] } = useUomOptions()
  const { data: suppliers = [] } = useSupplierOptions()
  const { data: productTypes = [] } = useProductTypeOptions()

  const getInitialVariants = (product?: Product | null): VariantRowFormData[] => {
    if (!product || !product.product_variants || product.product_variants.length === 0) {
      return []
    }
    return product.product_variants.map((v) => {
      let dimLabel = ''
      if (typeof v.dimensions === 'string') {
        dimLabel = v.dimensions
      } else if (
        v.dimensions &&
        typeof v.dimensions === 'object' &&
        'label' in (v.dimensions as Record<string, unknown>)
      ) {
        dimLabel = String((v.dimensions as Record<string, unknown>).label || '')
      }

      return {
        id: v.id,
        sku: v.sku,
        barcode: v.barcode || '',
        name: v.name || '',
        weight: v.weight ? Number(v.weight) : null,
        dimensions: dimLabel,
        is_active: v.is_active ?? true,
        expiration_date: (v as any).expiration_date || null,
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
      tax_code: '',
      tax_classification_id: null,
      weight: null,
      dimensions: '',
      is_active: true,
      is_stock_item: true,
      reorderable: true,
      is_batch_tracked: false,
      is_serial_tracked: false,
      has_variants: false,
      has_expiration: false,
      is_marketplace: false,
      variants: [],
    },
  })

  // Reset form when activeProduct or open changes
  useEffect(() => {
    if (open) {
      if (activeProduct) {
        const existingVariants = getInitialVariants(activeProduct)
        const hasExistingVariants = Boolean(
          activeProduct.has_variants === true ||
            existingVariants.length > 0 ||
            activeProduct.product_type === 'variant'
        )

        form.reset({
          name: activeProduct.name || '',
          description: activeProduct.description || '',
          sku: activeProduct.sku || '',
          barcode: activeProduct.barcode || '',
          category_id: activeProduct.category_id || null,
          brand_id: activeProduct.brand_id || null,
          base_uom_id: activeProduct.base_uom_id || null,
          supplier_id: activeProduct.supplier_id || null,
          product_type: (activeProduct.product_type as ProductType) || 'simple',
          product_type_id: activeProduct.product_type_id || null,
          tracking_mode: (activeProduct.tracking_mode as TrackingMode) || 'none',
          tax_code: activeProduct.tax_code || '',
          tax_classification_id: activeProduct.tax_classification_id || null,
          weight: activeProduct.weight ? Number(activeProduct.weight) : null,
          dimensions: activeProduct.dimensions || '',
          is_active: activeProduct.is_active ?? true,
          is_stock_item: activeProduct.is_stock_item ?? true,
          reorderable: activeProduct.reorderable ?? true,
          is_batch_tracked: activeProduct.is_batch_tracked ?? false,
          is_serial_tracked: activeProduct.is_serial_tracked ?? false,
          has_variants: hasExistingVariants,
          has_expiration: activeProduct.has_expiration ?? false,
          is_marketplace: activeProduct.is_marketplace ?? false,
          variants: existingVariants,
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
          tax_code: '',
          tax_classification_id: null,
          weight: null,
          dimensions: '',
          is_active: true,
          is_stock_item: true,
          reorderable: true,
          is_batch_tracked: false,
          is_serial_tracked: false,
          has_variants: false,
          has_expiration: false,
          is_marketplace: false,
          variants: [],
        })
      }
      setActiveTab('basic')
    }
  }, [open, activeProduct, form])

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'variants',
  })

  const hasVariants = form.watch('has_variants')
  const hasExpiration = form.watch('has_expiration')
  const productType = form.watch('product_type')
  const rawVariants = form.watch('variants')
  const watchedVariants = useMemo(() => rawVariants || [], [rawVariants])

  // Auto-seed first variant if variants enabled and list is empty
  useEffect(() => {
    if ((hasVariants || productType === 'variant') && fields.length === 0 && open) {
      const currentValues = form.getValues()
      append({
        sku: currentValues.sku ? `${currentValues.sku}-V1` : '',
        barcode: '',
        name: 'Default',
        weight: currentValues.weight || null,
        dimensions: currentValues.dimensions || '',
        is_active: true,
        uom_id: currentValues.base_uom_id || null,
        attributes_label: 'Default',
        expiration_date: null,
      })
    }
  }, [hasVariants, productType, fields.length, open, append, form])

  // Calculated metrics for variants summary
  const variantMetrics = useMemo(() => {
    const total = watchedVariants.length
    const activeCount = watchedVariants.filter((v) => v.is_active !== false).length

    return {
      total,
      activeCount,
    }
  }, [watchedVariants])

  const handleAddVariant = () => {
    const currentValues = form.getValues()
    const nextIdx = fields.length + 1
    append({
      sku: currentValues.sku
        ? `${currentValues.sku}-V${nextIdx}`
        : `SKU-V${nextIdx}`,
      barcode: '',
      name: `Variant ${nextIdx}`,
      weight: currentValues.weight || null,
      dimensions: currentValues.dimensions || '',
      is_active: true,
      uom_id: currentValues.base_uom_id || null,
      attributes_label: `Variant ${nextIdx}`,
      expiration_date: null,
    })
  }

  const handleDuplicateVariant = (index: number) => {
    const item = form.getValues(`variants.${index}`)
    if (!item) return
    const nextIdx = fields.length + 1
    append({
      sku: item.sku ? `${item.sku}-COPY` : `SKU-V${nextIdx}`,
      barcode: '',
      name: item.name ? `${item.name} (Copy)` : `Variant ${nextIdx}`,
      weight: item.weight || null,
      dimensions: item.dimensions || '',
      is_active: item.is_active ?? true,
      uom_id: item.uom_id || null,
      attributes_label: item.attributes_label
        ? `${item.attributes_label} (Copy)`
        : `Variant ${nextIdx}`,
      expiration_date: item.expiration_date || null,
    })
    toast.success(t('products.form.duplicateVariant') + ' OK')
  }

  const handleGenerateSkuForVariant = (index: number) => {
    const baseSku = form.getValues('sku') || 'PRD'
    const label = form.getValues(`variants.${index}.attributes_label`) || `V${index + 1}`
    const sanitized = label.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase()
    form.setValue(`variants.${index}.sku`, `${baseSku}-${sanitized}`)
  }

  const onSubmit = async (values: ProductActionFormData) => {
    try {
      const { variants, ...baseData } = values

      const targetId =
        currentRow?.id ||
        (currentRow?.product_id ? String(currentRow.product_id) : null)

      const isVariantsConfigured = Boolean(
        hasVariants || productType === 'variant' || (variants && variants.length > 0)
      )

      const cleanedBase: Partial<Product> = {
        ...baseData,
        has_variants: isVariantsConfigured,
      }

      // Default single variant fallback if no variants configured
      const defaultVariant: VariantRowFormData = {
        sku: values.sku,
        barcode: values.barcode || null,
        name: values.name,
        is_active: values.is_active,
        weight: values.weight,
        dimensions: values.dimensions,
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

  const showVariantsTab = Boolean(
    hasVariants ||
      productType === 'variant' ||
      fields.length > 0 ||
      (activeProduct?.product_variants && activeProduct.product_variants.length > 0)
  )

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
          <div className='flex items-center justify-between'>
            <div>
              <DialogTitle className='text-xl font-bold'>
                {isEdit ? t('products.editProduct') : t('products.createProduct')}
              </DialogTitle>
              <DialogDescription>
                {t('products.description')}
              </DialogDescription>
            </div>
            {isFreshLoading && (
              <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                <span>Loading latest data...</span>
              </div>
            )}
          </div>
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
                <TabsList className='h-11 w-full justify-start gap-2 bg-transparent p-0 overflow-x-auto'>
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
                  {showVariantsTab && (
                    <TabsTrigger
                      value='variants'
                      className='gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs'
                    >
                      <Layers className='h-4 w-4' />
                      {t('products.formTabs.variants')}
                      <Badge
                        variant='secondary'
                        className='ms-1 h-5 px-1.5 text-[11px] font-semibold'
                      >
                        {fields.length}
                      </Badge>
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
                              onClick={() => setIsBaseScannerOpen(true)}
                            >
                              <LucideScan className='h-4 w-4' />
                            </Button>
                          </div>

                          <QRCodeScanner
                            open={isBaseScannerOpen}
                            onOpenChange={setIsBaseScannerOpen}
                            onScan={(data: string) => {
                              field.onChange(data)
                              setIsBaseScannerOpen(false)
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
                        <FormItem className='flex flex-col'>
                          <FormLabel>{t('products.form.category')}</FormLabel>
                          <FormControl>
                            <SearchableSelect
                              value={field.value}
                              onChange={(val) => field.onChange(val)}
                              options={categoryOptions}
                              placeholder={t('products.form.selectCategory')}
                              searchPlaceholder={t('products.form.searchCategory', {
                                defaultValue: 'Search category (English or العربية)...',
                              })}
                              emptyText={t('products.form.noCategoryFound', {
                                defaultValue: 'No category found.',
                              })}
                              allowNone={true}
                              noneLabel={`-- ${t('common.none', 'None')} --`}
                              isLoading={isCategoriesLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Brand Select */}
                    <FormField
                      control={form.control}
                      name='brand_id'
                      render={({ field }) => (
                        <FormItem className='flex flex-col'>
                          <FormLabel>{t('products.form.brand')}</FormLabel>
                          <FormControl>
                            <SearchableSelect
                              value={field.value}
                              onChange={(val) => field.onChange(val)}
                              options={brands}
                              placeholder={t('products.form.selectBrand')}
                              searchPlaceholder={t('products.form.searchBrand', {
                                defaultValue: 'Search brand...',
                              })}
                              emptyText={t('products.form.noBrandFound', {
                                defaultValue: 'No brand found.',
                              })}
                              allowNone={true}
                              noneLabel={`-- ${t('common.none', 'None')} --`}
                              isLoading={isBrandsLoading}
                            />
                          </FormControl>
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
                            onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                            value={field.value || 'none'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('products.form.selectUnit')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value='none' className='text-muted-foreground italic'>
                                -- {t('common.none', 'None')} --
                              </SelectItem>
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
                        <FormItem className='flex flex-col'>
                          <FormLabel>{t('products.form.supplier')}</FormLabel>
                          <FormControl>
                            <SearchableSelect
                              value={field.value}
                              onChange={(val) => field.onChange(val)}
                              options={suppliers}
                              placeholder={t('products.form.selectSupplier')}
                              searchPlaceholder={t('products.form.searchSupplier', {
                                defaultValue: 'Search supplier...',
                              })}
                              emptyText={t('products.form.noSupplierFound', {
                                defaultValue: 'No supplier found.',
                              })}
                            />
                          </FormControl>
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
                            onValueChange={(val) => {
                              field.onChange(val)
                              if (val === 'variant' && !form.getValues('has_variants')) {
                                form.setValue('has_variants', true)
                              }
                            }}
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
                              onCheckedChange={(checked) => {
                                field.onChange(checked)
                                if (checked && fields.length === 0) {
                                  handleAddVariant()
                                }
                              }}
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
                    <div className='rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'>
                      {t('products.form.expirationTrackedOnVariants', 'Expiration dates are tracked per variant in the Variants tab.')}
                    </div>
                  )}
                </TabsContent>

                {/* ── TAB 4: PRICING & TAX ────────────────────────────── */}
                <TabsContent value='pricing' className='m-0 space-y-4'>
                  <div className='rounded-md border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300'>
                    {t('products.form.pricingNotice', 'Product pricing is managed independently through the Price List module.')}
                  </div>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
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
                          <FormLabel>{t('products.form.taxClassification', 'Tax Classification')}</FormLabel>
                          <FormControl>
                            <TaxClassificationSelect
                              value={field.value}
                              onChange={(val) => field.onChange(val)}
                              placeholder={t('products.form.selectTaxClassification', 'Select tax classification')}
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
                {showVariantsTab && (
                  <TabsContent value='variants' className='m-0 space-y-4'>
                    {/* Header with stats and mode switcher */}
                    <div className='flex flex-wrap items-center justify-between gap-3 border-b pb-3'>
                      <div>
                        <h3 className='text-base font-semibold'>
                          {t('products.form.variantTitle')}
                        </h3>
                        <p className='text-xs text-muted-foreground'>
                          {t('products.form.hasVariantsDesc')}
                        </p>
                      </div>

                      <div className='flex items-center gap-2'>
                        {/* View Switcher: Table vs Cards */}
                        <div className='flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs'>
                          <Button
                            type='button'
                            variant={variantViewMode === 'table' ? 'secondary' : 'ghost'}
                            size='sm'
                            className='h-7 gap-1 px-2.5 text-xs shadow-none'
                            onClick={() => setVariantViewMode('table')}
                          >
                            <TableIcon className='h-3.5 w-3.5' />
                            <span>{t('products.form.tablePreview')}</span>
                          </Button>
                          <Button
                            type='button'
                            variant={variantViewMode === 'cards' ? 'secondary' : 'ghost'}
                            size='sm'
                            className='h-7 gap-1 px-2.5 text-xs shadow-none'
                            onClick={() => setVariantViewMode('cards')}
                          >
                            <LayoutGrid className='h-3.5 w-3.5' />
                            <span>{t('products.form.cardEditor')}</span>
                          </Button>
                        </div>

                        <Button
                          type='button'
                          variant='default'
                          size='sm'
                          className='h-7 gap-1 px-2.5 text-xs'
                          onClick={handleAddVariant}
                        >
                          <Plus className='h-3.5 w-3.5' />
                          {t('products.form.addVariant')}
                        </Button>
                      </div>
                    </div>

                    {/* Quick Stats Metric Strip */}
                    <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                      <div className='rounded-lg border bg-card p-2.5 shadow-2xs'>
                        <span className='text-[11px] font-medium text-muted-foreground'>
                          {t('products.form.totalVariants')}
                        </span>
                        <div className='mt-0.5 flex items-baseline gap-1.5'>
                          <span className='text-lg font-bold'>{variantMetrics.total}</span>
                          <span className='text-[11px] text-muted-foreground'>items</span>
                        </div>
                      </div>

                      <div className='rounded-lg border bg-card p-2.5 shadow-2xs'>
                        <span className='text-[11px] font-medium text-muted-foreground'>
                          {t('products.form.activeVariants')}
                        </span>
                        <div className='mt-0.5 flex items-center gap-1.5'>
                          <span className='text-lg font-bold text-emerald-600 dark:text-emerald-400'>
                            {variantMetrics.activeCount}
                          </span>
                          <span className='text-[11px] text-muted-foreground'>
                            / {variantMetrics.total}
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* MODE 1: Table Preview Matrix */}
                    {variantViewMode === 'table' && (
                      <div className='rounded-md border bg-card overflow-hidden'>
                        <Table>
                          <TableHeader className='bg-muted/50'>
                            <TableRow>
                              <TableHead className='w-[60px] text-center'>
                                {t('products.columns.status')}
                              </TableHead>
                              <TableHead>{t('products.form.variantLabel')}</TableHead>
                              <TableHead>{t('products.form.variantSku')}</TableHead>
                              <TableHead>{t('products.form.variantBarcode')}</TableHead>
                              <TableHead>{t('products.form.variantUom')}</TableHead>
                              <TableHead className='min-w-[130px]'>{t('products.form.expirationDate', 'Expiry Date')}</TableHead>
                              <TableHead className='w-[80px] text-right'>
                                {t('products.columns.actions')}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fields.map((field, index) => {
                              const v = watchedVariants[index] || {}
                              const uomObj = uoms.find((u) => u.id === v.uom_id)

                              return (
                                <TableRow key={field.id} className='hover:bg-muted/30'>
                                  <TableCell className='text-center'>
                                    <FormField
                                      control={form.control}
                                      name={`variants.${index}.is_active`}
                                      render={({ field: vField }) => (
                                        <Switch
                                          checked={vField.value}
                                          onCheckedChange={vField.onChange}
                                          className='scale-75'
                                        />
                                      )}
                                    />
                                  </TableCell>

                                  <TableCell className='font-medium'>
                                    <FormField
                                      control={form.control}
                                      name={`variants.${index}.attributes_label`}
                                      render={({ field: vField }) => (
                                        <Input
                                          className='h-8 text-xs'
                                          placeholder='Label/Size/Color'
                                          {...vField}
                                          value={vField.value || ''}
                                        />
                                      )}
                                    />
                                  </TableCell>

                                  <TableCell>
                                    <FormField
                                      control={form.control}
                                      name={`variants.${index}.sku`}
                                      render={({ field: vField }) => (
                                        <Input
                                          className='h-8 text-xs font-mono'
                                          placeholder='SKU'
                                          {...vField}
                                        />
                                      )}
                                    />
                                  </TableCell>

                                  <TableCell>
                                    <FormField
                                      control={form.control}
                                      name={`variants.${index}.barcode`}
                                      render={({ field: vField }) => (
                                        <Input
                                          className='h-8 text-xs font-mono'
                                          placeholder='Barcode'
                                          {...vField}
                                          value={vField.value || ''}
                                        />
                                      )}
                                    />
                                  </TableCell>

                                  <TableCell className='text-xs text-muted-foreground whitespace-nowrap'>
                                    {uomObj ? `${uomObj.code}` : '—'}
                                  </TableCell>

                                  <TableCell>
                                    <FormField
                                      control={form.control}
                                      name={`variants.${index}.expiration_date`}
                                      render={({ field: vField }) => (
                                        <Input
                                          type='date'
                                          className='h-8 text-xs'
                                          {...vField}
                                          value={vField.value ? String(vField.value).slice(0, 10) : ''}
                                          onChange={(e) => vField.onChange(e.target.value || null)}
                                        />
                                      )}
                                    />
                                  </TableCell>

                                  <TableCell className='text-right whitespace-nowrap'>
                                    <div className='flex items-center justify-end gap-1'>
                                      <Button
                                        type='button'
                                        variant='ghost'
                                        size='icon'
                                        className='h-7 w-7 text-muted-foreground hover:text-foreground'
                                        title={t('products.form.duplicateVariant')}
                                        onClick={() => handleDuplicateVariant(index)}
                                      >
                                        <Copy className='h-3.5 w-3.5' />
                                      </Button>
                                      {fields.length > 1 && (
                                        <Button
                                          type='button'
                                          variant='ghost'
                                          size='icon'
                                          className='h-7 w-7 text-muted-foreground hover:text-destructive'
                                          title='Delete'
                                          onClick={() => remove(index)}
                                        >
                                          <Trash2 className='h-3.5 w-3.5' />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* MODE 2: Detailed Card Editor */}
                    {variantViewMode === 'cards' && (
                      <div className='space-y-4 pr-1'>
                        {fields.map((field, index) => (
                          <Card key={field.id} className='relative shadow-xs border-muted-foreground/20'>
                            <CardHeader className='flex flex-row items-center justify-between border-b bg-muted/20 px-4 py-2.5'>
                              <div className='flex items-center gap-2'>
                                <Badge variant='outline' className='font-mono text-xs'>
                                  #{index + 1}
                                </Badge>
                                <CardTitle className='text-sm font-semibold'>
                                  {form.watch(`variants.${index}.attributes_label`) ||
                                    `Variant ${index + 1}`}
                                </CardTitle>
                                {form.watch(`variants.${index}.is_active`) ? (
                                  <Badge variant='default' className='h-5 px-1.5 text-[10px] gap-1'>
                                    <CheckCircle2 className='h-3 w-3' />
                                    {t('products.form.active')}
                                  </Badge>
                                ) : (
                                  <Badge variant='secondary' className='h-5 px-1.5 text-[10px] gap-1'>
                                    <XCircle className='h-3 w-3' />
                                    {t('products.form.inactive')}
                                  </Badge>
                                )}
                              </div>

                              <div className='flex items-center gap-1.5'>
                                <Button
                                  type='button'
                                  variant='outline'
                                  size='sm'
                                  className='h-7 gap-1 px-2 text-xs'
                                  onClick={() => handleDuplicateVariant(index)}
                                >
                                  <Copy className='h-3.5 w-3.5' />
                                  {t('products.form.duplicateVariant')}
                                </Button>
                                {fields.length > 1 && (
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    className='h-7 w-7 text-muted-foreground hover:text-destructive'
                                    onClick={() => remove(index)}
                                  >
                                    <Trash2 className='h-4 w-4' />
                                  </Button>
                                )}
                              </div>
                            </CardHeader>

                            <CardContent className='flex flex-col gap-3 p-4'>
                              {/* Row 1: Option Label, SKU, Barcode, Active Switch */}
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
                                      <div className='flex items-center justify-between'>
                                        <FormLabel className='text-xs'>
                                          {t('products.form.variantSku')} *
                                        </FormLabel>
                                        <Button
                                          type='button'
                                          variant='ghost'
                                          size='sm'
                                          className='h-4 px-1 text-[10px] text-primary hover:bg-transparent'
                                          onClick={() => handleGenerateSkuForVariant(index)}
                                        >
                                          <Sparkles className='me-0.5 h-3 w-3' />
                                          {t('products.form.generateSku')}
                                        </Button>
                                      </div>
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
                                      <div className='flex gap-1.5'>
                                        <FormControl>
                                          <Input
                                            placeholder='Barcode / UPC'
                                            {...vField}
                                            value={vField.value || ''}
                                          />
                                        </FormControl>
                                        <Button
                                          type='button'
                                          variant='outline'
                                          size='icon'
                                          className='h-9 w-9 shrink-0'
                                          title='Scan Barcode'
                                          onClick={() => setScanningVariantIndex(index)}
                                        >
                                          <LucideScan className='h-3.5 w-3.5' />
                                        </Button>
                                      </div>
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

                              {/* Row 2: Unit of Measure, Weight, Dimensions, Expiration Date */}
                              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                                <FormField
                                  control={form.control}
                                  name={`variants.${index}.uom_id`}
                                  render={({ field: vField }) => (
                                    <FormItem>
                                      <FormLabel className='text-xs'>
                                        {t('products.form.variantUom')}
                                      </FormLabel>
                                      <Select
                                        onValueChange={(val) =>
                                          vField.onChange(val === 'none' ? null : val)
                                        }
                                        value={vField.value || 'none'}
                                      >
                                        <FormControl>
                                          <SelectTrigger className='h-9 text-xs'>
                                            <SelectValue
                                              placeholder={t('products.form.selectVariantUom')}
                                            />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem
                                            value='none'
                                            className='text-muted-foreground italic'
                                          >
                                            -- {t('common.none', 'Inherit Base Unit')} --
                                          </SelectItem>
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

                                <FormField
                                  control={form.control}
                                  name={`variants.${index}.weight`}
                                  render={({ field: vField }) => (
                                    <FormItem>
                                      <FormLabel className='text-xs'>
                                        {t('products.form.variantWeight')}
                                      </FormLabel>
                                      <FormControl>
                                        <Input
                                          type='number'
                                          step='0.01'
                                          min='0'
                                          placeholder='0.00'
                                          className='h-9 text-xs'
                                          value={(vField.value as number) ?? ''}
                                          onChange={(e) =>
                                            vField.onChange(
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
                                  name={`variants.${index}.dimensions`}
                                  render={({ field: vField }) => (
                                    <FormItem>
                                      <FormLabel className='text-xs'>
                                        {t('products.form.variantDimensions')}
                                      </FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder='L x W x H'
                                          className='h-9 text-xs'
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
                                  name={`variants.${index}.expiration_date`}
                                  render={({ field: vField }) => (
                                    <FormItem>
                                      <FormLabel className='text-xs'>
                                        {t('products.form.expirationDate', 'Expiry Date')}
                                      </FormLabel>
                                      <FormControl>
                                        <Input
                                          type='date'
                                          className='h-9 text-xs'
                                          {...vField}
                                          value={vField.value ? String(vField.value).slice(0, 10) : ''}
                                          onChange={(e) => vField.onChange(e.target.value || null)}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              {/* Barcode Display if Barcode Exists */}
                              {form.watch(`variants.${index}.barcode`) && (
                                <div className='pt-1'>
                                  <BarcodeDisplay
                                    value={form.watch(`variants.${index}.barcode`) || ''}
                                    type='barcode'
                                  />
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Empty State */}
                    {fields.length === 0 && (
                      <div className='rounded-lg border border-dashed bg-muted/20 p-8 text-center'>
                        <Layers className='mx-auto h-8 w-8 text-muted-foreground/60' />
                        <p className='mt-2 text-sm font-medium'>
                          {t('products.form.noVariantsPrompt')}
                        </p>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='mt-3 gap-1.5'
                          onClick={handleAddVariant}
                        >
                          <Plus className='h-4 w-4' />
                          {t('products.form.addVariant')}
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </form>
        </Form>

        {/* Modal for Per-Variant Barcode Scanner */}
        {scanningVariantIndex !== null && (
          <QRCodeScanner
            open={scanningVariantIndex !== null}
            onOpenChange={(v) => {
              if (!v) setScanningVariantIndex(null)
            }}
            onScan={(data: string) => {
              if (scanningVariantIndex !== null) {
                form.setValue(`variants.${scanningVariantIndex}.barcode`, data)
                setScanningVariantIndex(null)
              }
            }}
          />
        )}

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
