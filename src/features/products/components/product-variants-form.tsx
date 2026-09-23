import { z } from 'zod'
import { useForm, useFieldArray, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Trash2,
  Copy,
  Sparkles,
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProductWizardStore } from '../context/product-wizard-store'
import { useUomOptions } from '../hooks/use-product-options'
import { TaxRateSelect } from './tax-rate-select'
import {
  variantRowSchema,
  type VariantRowFormData,
} from '../data/schema'

const variantsFormSchema = z.object({
  variants: z
    .array(variantRowSchema)
    .min(1, 'At least one variant is required'),
})

type VariantsFormValues = z.infer<typeof variantsFormSchema>

export function ProductVariantsForm({
  onSubmit,
}: {
  onSubmit: (data: VariantRowFormData[]) => void
}) {
  const { t } = useTranslation()
  const { variantsData, baseProductData } = useProductWizardStore()
  const { data: uoms = [] } = useUomOptions()

  const form = useForm<VariantsFormValues>({
    resolver: zodResolver(variantsFormSchema) as Resolver<VariantsFormValues>,
    defaultValues: {
      variants:
        variantsData.length > 0
          ? variantsData.map((v) => ({
              ...v,
              tax_rate_id: v.tax_rate_id || null,
              expiration_date: v.expiration_date || null,
            }))
          : [
              {
                sku: baseProductData?.sku ? `${baseProductData.sku}-V1` : '',
                barcode: '',
                name: 'Default',
                tax_rate_id: null,
                weight: baseProductData?.weight || null,
                dimensions: baseProductData?.dimensions || '',
                is_active: true,
                uom_id: baseProductData?.base_uom_id || null,
                attributes_label: 'Default',
                expiration_date: null,
              },
            ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'variants',
  })

  const handleAddVariant = () => {
    const nextIdx = fields.length + 1
    append({
      sku: baseProductData?.sku
        ? `${baseProductData.sku}-V${nextIdx}`
        : `SKU-V${nextIdx}`,
      barcode: '',
      name: `Variant ${nextIdx}`,
      tax_rate_id: null,
      weight: baseProductData?.weight || null,
      dimensions: baseProductData?.dimensions || '',
      is_active: true,
      uom_id: baseProductData?.base_uom_id || null,
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
      tax_rate_id: item.tax_rate_id || null,
      weight: item.weight || null,
      dimensions: item.dimensions || '',
      is_active: item.is_active ?? true,
      uom_id: item.uom_id || null,
      attributes_label: item.attributes_label
        ? `${item.attributes_label} (Copy)`
        : `Variant ${nextIdx}`,
      expiration_date: item.expiration_date || null,
    })
  }

  const handleGenerateSkuForVariant = (index: number) => {
    const baseSku = baseProductData?.sku || 'PRD'
    const label = form.getValues(`variants.${index}.attributes_label`) || `V${index + 1}`
    const sanitized = label.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase()
    form.setValue(`variants.${index}.sku`, `${baseSku}-${sanitized}`)
  }

  const handleFormSubmit = (data: VariantsFormValues) => {
    onSubmit(data.variants)
  }

  return (
    <Form {...form}>
      <form
        id='product-variants-form'
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className='space-y-4 py-2'
      >
        <div className='flex flex-wrap items-center justify-between gap-3 border-b pb-3'>
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
            className='gap-1.5 shadow-2xs'
            onClick={handleAddVariant}
          >
            <Plus className='h-4 w-4' />
            {t('products.form.addVariant')}
          </Button>
        </div>

        {form.formState.errors.variants && (
          <div className='text-sm font-medium text-destructive'>
            {form.formState.errors.variants.root?.message}
          </div>
        )}

        <div className='max-h-[55vh] space-y-4 overflow-y-auto pr-1'>
          {fields.map((field, index) => {
            const isActive = form.watch(`variants.${index}.is_active`)
            const label = form.watch(`variants.${index}.attributes_label`)

            return (
              <Card
                key={field.id}
                className='relative border-muted-foreground/20 shadow-xs transition-shadow hover:shadow-sm'
              >
                <CardHeader className='flex flex-row items-center justify-between border-b bg-muted/20 px-4 py-2.5'>
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='font-mono text-xs'>
                      #{index + 1}
                    </Badge>
                    <CardTitle className='text-sm font-semibold'>
                      {label || `Variant ${index + 1}`}
                    </CardTitle>
                    {isActive ? (
                      <Badge variant='default' className='h-5 gap-1 px-1.5 text-[10px]'>
                        <CheckCircle2 className='h-3 w-3' />
                        {t('products.form.active')}
                      </Badge>
                    ) : (
                      <Badge variant='secondary' className='h-5 gap-1 px-1.5 text-[10px]'>
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
                      title={t('products.form.duplicateVariant', 'Duplicate variant')}
                    >
                      <Copy className='h-3.5 w-3.5' />
                      <span className='hidden sm:inline'>{t('products.form.duplicateVariant', 'Duplicate')}</span>
                    </Button>
                    {fields.length > 1 && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7 text-muted-foreground hover:text-destructive'
                        onClick={() => remove(index)}
                        title='Delete variant'
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className='flex flex-col gap-3 p-4'>
                  {/* Row 1: Option Label, SKU, Barcode, Active Switch */}
                  <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
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
                              placeholder={t('products.form.variantLabelPlaceholder', 'e.g. Red / XL')}
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
                              {t('products.form.generateSku', 'Auto')}
                            </Button>
                          </div>
                          <FormControl>
                            <Input
                              placeholder='Variant SKU'
                              className='h-9 font-mono text-xs'
                              {...vField}
                            />
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
                              placeholder='UPC / EAN'
                              className='h-9 font-mono text-xs'
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

                  {/* Row 2: UOM, Tax Rate, Weight, Dimensions, Expiration Date */}
                  <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5'>
                    <FormField
                      control={form.control}
                      name={`variants.${index}.uom_id`}
                      render={({ field: vField }) => (
                        <FormItem>
                          <FormLabel className='text-xs'>
                            {t('products.form.variantUom', 'Unit of Measure')}
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
                                  placeholder={t('products.form.selectVariantUom', 'Inherit Base Unit')}
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
                      name={`variants.${index}.tax_rate_id`}
                      render={({ field: vField }) => (
                        <FormItem>
                          <FormLabel className='text-xs'>
                            {t('products.form.taxRate', 'Tax Rate')}
                          </FormLabel>
                          <FormControl>
                            <TaxRateSelect
                              value={vField.value}
                              onChange={(val) => vField.onChange(val)}
                              placeholder={t('products.form.selectVariantTaxRate', 'Select tax rate...')}
                            />
                          </FormControl>
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
                            {t('products.form.variantWeight', 'Weight (kg)')}
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
                            {t('products.form.variantDimensions', 'Dimensions')}
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
                          <FormLabel className='text-xs flex items-center gap-1'>
                            <CalendarIcon className='h-3 w-3 text-muted-foreground' />
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
                </CardContent>
              </Card>
            )
          })}
        </div>

        {fields.length === 0 && (
          <div className='rounded-lg border border-dashed bg-muted/20 p-8 text-center'>
            <Layers className='mx-auto h-8 w-8 text-muted-foreground/60' />
            <p className='mt-2 text-sm font-medium'>
              {t('products.form.noVariantsPrompt', 'No variants added yet.')}
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
      </form>
    </Form>
  )
}
