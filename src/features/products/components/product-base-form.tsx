import { useEffect, useState, useMemo } from 'react'
import { format } from 'date-fns'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon, Scan as LucideScan, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
import { QRCodeScanner } from '@/components/custom-ui/qr-code-scanner'
import { SearchableSelect } from '@/components/custom-ui/searchable-select'
import { LookupSelect } from '@/features/lookups/components/lookup-select'
import { useProductWizardStore } from '../context/product-wizard-store'
import {
  baseProductSchema,
  type BaseProductFormData,
  type ProductType,
  type TrackingMode,
} from '../data/schema'
import {
  useBrandOptions,
  useCategoryOptions,
  formatCategorySearchableOptions,
  useSupplierOptions,
  useUomOptions,
  useProductTypeOptions,
} from '../hooks/use-product-options'
import { BarcodeDisplay } from './barcode-display'

export function ProductBaseForm({
  onSubmitDirect,
}: {
  onSubmitDirect?: (data: BaseProductFormData) => void
}) {
  const { t } = useTranslation()
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const {
    currentStep,
    baseProductData,
    setBaseProductData,
    nextStep,
    setVariantsEnabled,
  } = useProductWizardStore()

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

  const form = useForm<BaseProductFormData>({
    resolver: zodResolver(baseProductSchema) as Resolver<BaseProductFormData>,
    defaultValues: baseProductData || {
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
    },
    mode: 'onTouched',
  })

  const hasVariants = form.watch('has_variants')
  const hasExpiration = form.watch('has_expiration')
  const productType = form.watch('product_type')

  useEffect(() => {
    setVariantsEnabled(Boolean(hasVariants || productType === 'variant'))
  }, [hasVariants, productType, setVariantsEnabled])

  // Sync back to store when values change
  useEffect(() => {
    const subscription = form.watch((value) => {
      setBaseProductData(value as Partial<BaseProductFormData>)
    })
    return () => subscription.unsubscribe()
  }, [form, setBaseProductData])

  const onSubmit = async (data: BaseProductFormData) => {
    setBaseProductData(data)

    if (currentStep === 1) {
      const isValid = await form.trigger(['name', 'sku'])
      if (isValid) {
        nextStep()
      }
    } else if (currentStep === 2) {
      nextStep()
    } else if (currentStep === 3) {
      const isValid = await form.trigger()
      if (!isValid) return

      const isVariant = Boolean(
        data.has_variants || data.product_type === 'variant'
      )
      if (isVariant) {
        setVariantsEnabled(true)
        nextStep(true)
      } else if (onSubmitDirect) {
        onSubmitDirect(data)
      }
    }
  }

  return (
    <Form {...form}>
      <form
        id='product-base-form'
        onSubmit={form.handleSubmit(onSubmit)}
        className='space-y-4 py-2'
      >
        {/* =========================================================================
            STEP 1: IDENTITY & BASIC INFO
           ========================================================================= */}
        {currentStep === 1 && (
          <div className='animate-in space-y-4 duration-200 fade-in-50'>
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

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
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
                          type={field.value.length > 20 ? 'qrcode' : 'barcode'}
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
              name='product_type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('products.form.productType')}</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val as ProductType)}
                    value={field.value || 'simple'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('products.form.selectProductType')}
                        />
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

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('products.form.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('products.form.descriptionPlaceholder')}
                      className='min-h-[90px] resize-none'
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* =========================================================================
            STEP 2: ORGANIZATION & CLASSIFICATION
           ========================================================================= */}
        {currentStep === 2 && (
          <div className='animate-in space-y-4 duration-200 fade-in-50'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
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
                          <SelectValue
                            placeholder={t('products.form.selectUnit')}
                          />
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

            <FormField
              control={form.control}
              name='product_type_id'
              render={({ field }) => {
                const selectedType = productTypes.find(
                  (pt) => pt.id === field.value
                )
                return (
                  <FormItem>
                    <FormLabel>
                      {t('products.form.productTypeClassification')}
                    </FormLabel>
                    <Select
                      onValueChange={(val) =>
                        field.onChange(val === 'none' ? null : val)
                      }
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t('products.form.selectProductType')}
                          >
                            {selectedType ? (
                              <div className='flex items-center gap-2 truncate'>
                                {selectedType.color && (
                                  <span
                                    className='h-2.5 w-2.5 shrink-0 rounded-full'
                                    style={{
                                      backgroundColor: selectedType.color,
                                    }}
                                  />
                                )}
                                <span className='font-medium'>
                                  {selectedType.name}
                                </span>
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
                        <SelectItem
                          value='none'
                          className='text-muted-foreground italic'
                        >
                          -- {t('common.none', 'None / Unclassified')} --
                        </SelectItem>
                        {productTypes.map((pt) => (
                          <SelectItem key={pt.id} value={pt.id}>
                            <div className='flex flex-col py-0.5 text-left'>
                              <div className='flex items-center gap-2'>
                                {pt.color && (
                                  <span
                                    className='h-2.5 w-2.5 shrink-0 rounded-full'
                                    style={{ backgroundColor: pt.color }}
                                  />
                                )}
                                <span className='font-medium text-foreground'>
                                  {pt.name}
                                </span>
                                {pt.name_ar && (
                                  <span className='text-xs text-muted-foreground'>
                                    ({pt.name_ar})
                                  </span>
                                )}
                              </div>
                              {pt.description && (
                                <span className='line-clamp-1 text-[11px] text-muted-foreground'>
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
        )}

        {/* =========================================================================
            STEP 3: PRICING, INVENTORY & LOGISTICS
           ========================================================================= */}
        {currentStep === 3 && (
          <div className='animate-in space-y-4 duration-200 fade-in-50'>
            {/* Pricing & Tax */}
            <div className='space-y-3'>
              <h4 className='text-xs font-bold tracking-wider text-muted-foreground uppercase'>
                {t('products.form.pricingAndTax')}
              </h4>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
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
                      <FormLabel>
                        {t('products.form.taxClassification')}
                      </FormLabel>
                      <FormControl>
                        <LookupSelect
                          lookupType='tax_classification'
                          value={field.value}
                          onChange={(val) => field.onChange(val)}
                          placeholder={t(
                            'products.form.selectTaxClassification'
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Inventory & Tracking */}
            <div className='space-y-3 pt-2'>
              <h4 className='text-xs font-bold tracking-wider text-muted-foreground uppercase'>
                {t('products.form.inventoryTracking')}
              </h4>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='tracking_mode'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('products.form.trackingMode')}</FormLabel>
                      <Select
                        onValueChange={(val) =>
                          field.onChange(val as TrackingMode)
                        }
                        value={field.value || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                'products.form.selectTrackingMode'
                              )}
                            />
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
                          placeholder={t(
                            'products.form.reorderLevelPlaceholder'
                          )}
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

              {/* Physical Attributes */}
              <div className='grid grid-cols-1 gap-4 pt-1 md:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='weight'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('products.form.weight')} (kg)</FormLabel>
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

              {/* Toggles Grid */}
              <div className='grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2 md:grid-cols-4'>
                <FormField
                  control={form.control}
                  name='is_active'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-xs'>
                          {t('products.form.active')}
                        </FormLabel>
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
                  name='is_stock_item'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-xs'>
                          {t('products.form.isStockItem')}
                        </FormLabel>
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
                        <FormLabel className='text-xs'>
                          {t('products.form.reorderable')}
                        </FormLabel>
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
                        <FormLabel className='text-xs'>
                          {t('products.form.isMarketplace')}
                        </FormLabel>
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
                        <FormLabel className='text-xs'>
                          {t('products.form.isBatchTracked')}
                        </FormLabel>
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
                        <FormLabel className='text-xs'>
                          {t('products.form.isSerialTracked')}
                        </FormLabel>
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
                    <FormItem
                      className={cn(
                        'flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs transition-colors',
                        field.value
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border'
                      )}
                    >
                      <div className='space-y-0.5'>
                        <div className='flex items-center gap-1.5'>
                          <Layers className='h-3.5 w-3.5 text-primary' />
                          <FormLabel className='cursor-pointer text-xs font-semibold text-primary'>
                            {t('products.form.hasVariants')}
                          </FormLabel>
                        </div>
                        <FormDescription className='text-[10px] text-muted-foreground'>
                          {t(
                            'products.form.hasVariantsDesc',
                            'Configures multiple options in Step 4'
                          )}
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
                        <FormLabel className='text-xs'>
                          {t('products.form.hasExpiration')}
                        </FormLabel>
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
                              <span>
                                {t('products.form.pickExpirationDate')}
                              </span>
                            )}
                            <CalendarIcon className='ms-auto h-4 w-4 opacity-50' />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className='w-auto p-0' align='start'>
                        <Calendar
                          mode='single'
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
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
          </div>
        )}
      </form>
    </Form>
  )
}
