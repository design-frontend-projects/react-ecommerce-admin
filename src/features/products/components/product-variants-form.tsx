import { z } from 'zod'
import { useForm, useFieldArray, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { useProductWizardStore } from '../context/product-wizard-store'
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

  const form = useForm<VariantsFormValues>({
    resolver: zodResolver(variantsFormSchema) as Resolver<VariantsFormValues>,
    defaultValues: {
      variants:
        variantsData.length > 0
          ? variantsData
          : [
              {
                sku: baseProductData?.sku ? `${baseProductData.sku}-V1` : '',
                barcode: '',
                name: 'Default',
                price: baseProductData?.base_price || 0,
                cost_price: baseProductData?.cost_price || 0,
                stock_quantity: 0,
                min_stock: baseProductData?.reorder_level || 0,
                weight: baseProductData?.weight || null,
                dimensions: baseProductData?.dimensions || '',
                is_active: true,
                uom_id: baseProductData?.base_uom_id || null,
                attributes_label: 'Default',
              },
            ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'variants',
  })

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
        <div className='flex items-center justify-between pb-2'>
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
                sku: baseProductData?.sku
                  ? `${baseProductData.sku}-V${fields.length + 1}`
                  : '',
                barcode: '',
                name: `Variant ${fields.length + 1}`,
                price: baseProductData?.base_price || 0,
                cost_price: baseProductData?.cost_price || 0,
                stock_quantity: 0,
                min_stock: baseProductData?.reorder_level || 0,
                weight: baseProductData?.weight || null,
                dimensions: baseProductData?.dimensions || '',
                is_active: true,
                uom_id: baseProductData?.base_uom_id || null,
                attributes_label: `Variant ${fields.length + 1}`,
              })
            }
          >
            <Plus className='me-1.5 h-4 w-4' />
            {t('products.form.addVariant')}
          </Button>
        </div>

        {form.formState.errors.variants && (
          <div className='text-sm font-medium text-destructive'>
            {form.formState.errors.variants.root?.message}
          </div>
        )}

        <div className='max-h-[50vh] space-y-3 overflow-y-auto pr-1'>
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

                {/* Identity Row */}
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-4'>
                  <FormField
                    control={form.control}
                    name={`variants.${index}.attributes_label`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs'>
                          {t('products.form.variantLabel')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('products.form.variantLabelPlaceholder')}
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
                    name={`variants.${index}.sku`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs'>
                          {t('products.form.variantSku')} *
                        </FormLabel>
                        <FormControl>
                          <Input placeholder='Variant SKU' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`variants.${index}.barcode`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs'>
                          {t('products.form.variantBarcode')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='UPC / EAN'
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
                    name={`variants.${index}.is_active`}
                    render={({ field }) => (
                      <FormItem className='flex h-[36px] flex-row items-center justify-between rounded-lg border px-3 sm:mt-[22px]'>
                        <FormLabel className='text-xs'>
                          {t('products.form.active')}
                        </FormLabel>
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

                {/* Finance & Stock Row */}
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-4'>
                  <FormField
                    control={form.control}
                    name={`variants.${index}.price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs'>
                          {t('products.form.variantPrice')} *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            step='0.01'
                            min='0'
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
                    name={`variants.${index}.cost_price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs'>
                          {t('products.form.variantCost')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            step='0.01'
                            min='0'
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
                    name={`variants.${index}.stock_quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs'>
                          {t('products.form.variantInitialStock')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min='0'
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
                    name={`variants.${index}.min_stock`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs'>
                          {t('products.form.variantMinStock')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min='0'
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
              </CardContent>
            </Card>
          ))}
        </div>
      </form>
    </Form>
  )
}
