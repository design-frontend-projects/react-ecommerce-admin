import { useEffect } from 'react'
import { format } from 'date-fns'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Form,
  FormControl,
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
import {
  useBrandOptions,
  useCategoryOptions,
  useSupplierOptions,
  useUomOptions,
} from '../hooks/use-product-options'
import { useProductWizardStore } from '../context/product-wizard-store'
import {
  baseProductSchema,
  type BaseProductFormData,
} from '../data/schema'

export function ProductBaseForm({
  onSubmitDirect,
}: {
  onSubmitDirect?: (data: BaseProductFormData) => void
}) {
  const { t } = useTranslation()
  const { baseProductData, setBaseProductData, nextStep, setVariantsEnabled } =
    useProductWizardStore()

  const { data: categories = [] } = useCategoryOptions()
  const { data: brands = [] } = useBrandOptions()
  const { data: uoms = [] } = useUomOptions()
  const { data: suppliers = [] } = useSupplierOptions()

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
      base_price: 0,
      cost_price: 0,
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
      has_variants: true,
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

  const onSubmit = (data: BaseProductFormData) => {
    setBaseProductData(data)
    if (data.has_variants || data.product_type === 'variant') {
      nextStep()
    } else if (onSubmitDirect) {
      onSubmitDirect(data)
    }
  }

  return (
    <Form {...form}>
      <form
        id='product-base-form'
        onSubmit={form.handleSubmit(onSubmit)}
        className='space-y-4 py-2'
      >
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('products.form.name')} *</FormLabel>
              <FormControl>
                <Input placeholder={t('products.form.namePlaceholder')} {...field} />
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
                <FormControl>
                  <Input
                    placeholder={t('products.form.barcodePlaceholder')}
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
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
                  className='resize-none'
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
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
                        {b.name}
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
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
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
                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='cost_price'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('products.form.costPrice')}</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    step='0.01'
                    min='0'
                    placeholder='0.00'
                    value={(field.value as number) ?? ''}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className='grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3'>
          <FormField
            control={form.control}
            name='is_active'
            render={({ field }) => (
              <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs'>
                <div className='space-y-0.5'>
                  <FormLabel className='text-xs'>{t('products.form.active')}</FormLabel>
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
                  <FormLabel className='text-xs'>{t('products.form.hasVariants')}</FormLabel>
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
                  <FormLabel className='text-xs'>{t('products.form.hasExpiration')}</FormLabel>
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
              <FormItem className='flex flex-col'>
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
      </form>
    </Form>
  )
}
