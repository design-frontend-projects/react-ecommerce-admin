import { useEffect } from 'react'
import { useForm, useFieldArray, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  AlertTriangle,
  Layers,
  Calendar,
  Store as StoreIcon,
  Users,
  Percent,
  Coins,
  Radio,
} from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useCreatePriceListWithItems,
  useUpdatePriceListWithItems,
  usePriceListOptions,
} from '../hooks/use-price-list'
import { usePriceListContext } from './price-list-provider'
import {
  priceListFormSchema,
  priceListTypesEnum,
  PRICE_LIST_TYPE_LABELS,
  type PriceListFormData,
  type PriceListType,
} from '../data/schema'

export function PriceListActionDialog() {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const { open, setOpen, currentRow } = usePriceListContext()
  const createMutation = useCreatePriceListWithItems()
  const updateMutation = useUpdatePriceListWithItems()
  const { data: options, isLoading: isLoadingOptions } = usePriceListOptions()

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const defaultStartDate = new Date().toISOString().split('T')[0]

  const form = useForm<PriceListFormData>({
    resolver: zodResolver(priceListFormSchema) as unknown as Resolver<PriceListFormData>,
    defaultValues: {
      product_id: '',
      price: 0,
      type: null,
      group_id: '',
      store_id: '',
      currency_id: '',
      channel_id: '',
      start_date: defaultStartDate,
      end_date: '',
      is_active: true,
      description: '',
      items: [],
    },
  })

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const selectedProductId = form.watch('product_id')

  // When selected product changes in create mode, populate default variant items
  useEffect(() => {
    if (!isOpen || isEdit || !selectedProductId || !options?.products) return

    const selectedProduct = options.products.find((p) => p.id === selectedProductId)
    if (!selectedProduct) return

    const variants = selectedProduct.product_variants || []
    if (variants.length > 0) {
      const generatedItems = variants.map((v) => ({
        product_variant_id: v.id,
        variant_name: v.name || 'Standard',
        variant_sku: v.sku,
        regular_price: Number(v.price) || 0,
        cost_price: v.cost_price != null ? Number(v.cost_price) : null,
        price: Number(v.price) || Number(selectedProduct.base_price) || 0,
        min_price: 0,
        max_discount_percent: 0,
      }))
      replace(generatedItems)
    } else {
      replace([])
    }

    if (selectedProduct.base_price && form.getValues('price') === 0) {
      form.setValue('price', Number(selectedProduct.base_price))
    }
  }, [selectedProductId, isOpen, isEdit, options?.products, replace, form])

  // Reset form when currentRow changes or dialog opens
  useEffect(() => {
    if (currentRow && isEdit) {
      const selectedProduct = options?.products.find((p) => p.id === currentRow.product_id)
      const allProductVariants = selectedProduct?.product_variants || []

      // Map existing price_list_items
      const existingItemsMap = new Map(
        (currentRow.price_list_items || []).map((item) => [
          item.product_variant_id,
          item,
        ])
      )

      // Merge existing items with any variants that might not yet have an item
      const mergedItems = allProductVariants.length > 0
        ? allProductVariants.map((v) => {
            const existing = existingItemsMap.get(v.id)
            return {
              id: existing?.id,
              product_variant_id: v.id,
              variant_name: v.name || existing?.product_variants?.name || 'Standard',
              variant_sku: v.sku || existing?.product_variants?.sku || '',
              regular_price: Number(v.price) || Number(existing?.product_variants?.price) || 0,
              cost_price: v.cost_price != null ? Number(v.cost_price) : existing?.product_variants?.cost_price != null ? Number(existing.product_variants.cost_price) : null,
              price: existing ? Number(existing.price) : Number(v.price) || Number(currentRow.price),
              min_price: existing ? Number(existing.min_price) : 0,
              max_discount_percent: existing ? Number(existing.max_discount_percent) : 0,
            }
          })
        : (currentRow.price_list_items || []).map((item) => ({
            id: item.id,
            product_variant_id: item.product_variant_id,
            variant_name: item.product_variants?.name || 'Standard',
            variant_sku: item.product_variants?.sku || '',
            regular_price: Number(item.product_variants?.price) || 0,
            cost_price: item.product_variants?.cost_price != null ? Number(item.product_variants.cost_price) : null,
            price: Number(item.price),
            min_price: Number(item.min_price),
            max_discount_percent: Number(item.max_discount_percent),
          }))

      form.reset({
        product_id: currentRow.product_id,
        price: Number(currentRow.price),
        type: currentRow.type || null,
        group_id: currentRow.group_id || '',
        store_id: currentRow.store_id || '',
        currency_id: currentRow.currency_id || '',
        channel_id: currentRow.channel_id || '',
        start_date: currentRow.start_date || defaultStartDate,
        end_date: currentRow.end_date || '',
        is_active: currentRow.is_active ?? true,
        description: currentRow.description || '',
        items: mergedItems,
      })
    } else if (open === 'create') {
      form.reset({
        product_id: '',
        price: 0,
        type: null,
        group_id: '',
        store_id: '',
        currency_id: '',
        channel_id: '',
        start_date: defaultStartDate,
        end_date: '',
        is_active: true,
        description: '',
        items: [],
      })
    }
  }, [currentRow, open, isEdit, options?.products, defaultStartDate, form])

  const handleApplyDefaultPriceToAll = () => {
    const currentPrice = Number(form.getValues('price')) || 0
    const currentItems = form.getValues('items')
    const updatedItems = currentItems.map((item) => ({
      ...item,
      price: currentPrice,
    }))
    replace(updatedItems)
    toast.success(
      t('priceList.form.appliedToAll', {
        defaultValue: 'Applied default price to all variants',
      })
    )
  }

  const onSubmit = async (values: PriceListFormData) => {
    try {
      const sanitizedPayload: PriceListFormData = {
        ...values,
        group_id: values.group_id ? values.group_id : null,
        store_id: values.store_id ? values.store_id : null,
        currency_id: values.currency_id ? values.currency_id : null,
        channel_id: values.channel_id ? values.channel_id : null,
        end_date: values.end_date ? values.end_date : null,
        description: values.description ? values.description : null,
        type: values.type ? values.type : null,
      }

      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.id,
          ...sanitizedPayload,
        })
        toast.success(
          t('priceList.form.updateSuccess', {
            defaultValue: 'Price list updated successfully',
          })
        )
      } else {
        await createMutation.mutateAsync(sanitizedPayload)
        toast.success(
          t('priceList.form.createSuccess', {
            defaultValue: 'Price list created successfully',
          })
        )
      }
      setOpen(null)
    } catch (error: unknown) {
      toast.error(
        (error as Error)?.message ||
          t('common.errorOccurred', { defaultValue: 'Something went wrong. Please try again.' })
      )
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const currentProduct = options?.products?.find((p) => p.id === selectedProductId)

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='max-h-[92vh] overflow-y-auto sm:max-w-4xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-xl'>
            <Layers className='h-5 w-5 text-primary' />
            {isEdit
              ? t('priceList.editPriceList', { defaultValue: 'Edit Price List' })
              : t('priceList.addPriceList', { defaultValue: 'Create Price List' })}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t('priceList.editDescription', {
                  defaultValue: 'Modify pricing schedule, customer tier, and variant price overrides.',
                })
              : t('priceList.createDescription', {
                  defaultValue: 'Define a new price list header and assign specific prices to product variants.',
                })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6 py-2'>
            {/* 1. Header Information Section */}
            <div className='rounded-lg border bg-card p-4 shadow-sm space-y-4'>
              <h3 className='text-sm font-semibold uppercase tracking-wider text-muted-foreground'>
                {t('priceList.form.headerSection', { defaultValue: 'General Information' })}
              </h3>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {/* Product Selector */}
                <FormField
                  control={form.control}
                  name='product_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('priceList.form.product', { defaultValue: 'Product' })}{' '}
                        <span className='text-destructive'>*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                        disabled={isEdit || isLoadingOptions}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                isLoadingOptions
                                  ? t('common.loading', { defaultValue: 'Loading products...' })
                                  : t('priceList.form.selectProduct', { defaultValue: 'Select product' })
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className='max-h-60'>
                          {options?.products?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className='flex items-center justify-between gap-3'>
                                <span className='font-medium'>{p.name}</span>
                                <span className='text-xs text-muted-foreground'>
                                  SKU: {p.sku}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {currentProduct && (
                        <FormDescription className='text-xs'>
                          {t('priceList.form.standardBasePrice', { defaultValue: 'Standard Base Price' })}:{' '}
                          <span className='font-semibold text-foreground'>
                            ${Number(currentProduct.base_price || 0).toFixed(2)}
                          </span>{' '}
                          • {currentProduct.product_variants?.length || 0}{' '}
                          {t('priceList.form.variantsCount', { defaultValue: 'variants available' })}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Price List Type */}
                <FormField
                  control={form.control}
                  name='type'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('priceList.form.type', { defaultValue: 'Pricing Tier / Type' })}
                      </FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val || null)}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('priceList.form.selectType', {
                                defaultValue: 'Standard / None',
                              })}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {priceListTypesEnum.options.map((opt) => {
                            const config = PRICE_LIST_TYPE_LABELS[opt as PriceListType]
                            return (
                              <SelectItem key={opt} value={opt}>
                                <div className='flex items-center gap-2'>
                                  <Badge variant='outline' className={`text-xs ${config?.color}`}>
                                    {isAr ? config?.labelAr : config?.label}
                                  </Badge>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Customer Group */}
                <FormField
                  control={form.control}
                  name='group_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <Users className='h-3.5 w-3.5 text-muted-foreground' />
                        {t('priceList.form.customerGroup', { defaultValue: 'Target Customer Group' })}
                      </FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === 'ALL' ? '' : val)}
                        value={field.value || 'ALL'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('priceList.form.allGroups', {
                                defaultValue: 'All Customers (No Group Restriction)',
                              })}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='ALL'>
                            {t('priceList.form.allGroups', {
                              defaultValue: 'All Customers (No Group Restriction)',
                            })}
                          </SelectItem>
                          {options?.customerGroups?.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                              {g.discount_percentage ? ` (${g.discount_percentage}% discount)` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Store / Outlet */}
                <FormField
                  control={form.control}
                  name='store_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <StoreIcon className='h-3.5 w-3.5 text-muted-foreground' />
                        {t('priceList.form.store', { defaultValue: 'Target Store / Location' })}
                      </FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === 'ALL' ? '' : val)}
                        value={field.value || 'ALL'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('priceList.form.allStores', {
                                defaultValue: 'All Stores / Global',
                              })}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='ALL'>
                            {t('priceList.form.allStores', {
                              defaultValue: 'All Stores / Global',
                            })}
                          </SelectItem>
                          {options?.stores?.map((s) => (
                            <SelectItem key={s.store_id} value={s.store_id}>
                              {s.name || s.store_id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Currency */}
                <FormField
                  control={form.control}
                  name='currency_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <Coins className='h-3.5 w-3.5 text-muted-foreground' />
                        {t('priceList.form.currency', { defaultValue: 'Currency' })}
                      </FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === 'DEFAULT' ? '' : val)}
                        value={field.value || 'DEFAULT'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('priceList.form.defaultCurrency', {
                                defaultValue: 'Tenant Default Currency',
                              })}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='DEFAULT'>
                            {t('priceList.form.defaultCurrency', {
                              defaultValue: 'Tenant Default Currency',
                            })}
                          </SelectItem>
                          {options?.currencies?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.symbol} — {c.name} ({c.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Channel */}
                <FormField
                  control={form.control}
                  name='channel_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <Radio className='h-3.5 w-3.5 text-muted-foreground' />
                        {t('priceList.form.channel', { defaultValue: 'Sales Channel' })}
                      </FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === 'ALL' ? '' : val)}
                        value={field.value || 'ALL'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('priceList.form.allChannels', {
                                defaultValue: 'All Channels',
                              })}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='ALL'>
                            {t('priceList.form.allChannels', {
                              defaultValue: 'All Channels',
                            })}
                          </SelectItem>
                          {options?.channels?.map((ch) => (
                            <SelectItem key={ch.id} value={ch.id}>
                              {isAr ? ch.name_ar || ch.name : ch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Default List Price */}
                <FormField
                  control={form.control}
                  name='price'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center justify-between'>
                        <span>
                          {t('priceList.form.defaultPrice', { defaultValue: 'Default List Price' })}{' '}
                          <span className='text-destructive'>*</span>
                        </span>
                        {fields.length > 0 && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='h-6 px-2 text-xs text-primary'
                            onClick={handleApplyDefaultPriceToAll}
                          >
                            <Sparkles className='mr-1 h-3 w-3' />
                            {t('priceList.form.applyToAll', { defaultValue: 'Apply to All Variants' })}
                          </Button>
                        )}
                      </FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <span className='absolute left-3 top-2.5 text-sm text-muted-foreground'>
                            $
                          </span>
                          <Input
                            type='number'
                            step='0.01'
                            min='0'
                            className='pl-7'
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status Switch */}
                <FormField
                  control={form.control}
                  name='is_active'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs'>
                      <div className='space-y-0.5'>
                        <FormLabel>{t('priceList.form.activeStatus', { defaultValue: 'Active Status' })}</FormLabel>
                        <div className='text-xs text-muted-foreground'>
                          {t('priceList.form.activeHelp', {
                            defaultValue: 'Enable or disable this pricing rule.',
                          })}
                        </div>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Date Validity Row */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-2'>
                <FormField
                  control={form.control}
                  name='start_date'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <Calendar className='h-3.5 w-3.5 text-muted-foreground' />
                        {t('priceList.form.startDate', { defaultValue: 'Effective Start Date' })}{' '}
                        <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type='date' {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='end_date'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <Calendar className='h-3.5 w-3.5 text-muted-foreground' />
                        {t('priceList.form.endDate', {
                          defaultValue: 'End Date (Optional)',
                        })}
                      </FormLabel>
                      <FormControl>
                        <Input type='date' {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description / Notes */}
              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('priceList.form.description', { defaultValue: 'Notes & Description' })}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('priceList.form.descriptionPlaceholder', {
                          defaultValue: 'Reason for price change, campaign notes, or promotional terms...',
                        })}
                        className='resize-none h-18'
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 2. Child Items: Variant Pricing Breakdown */}
            <div className='rounded-lg border bg-card p-4 shadow-sm space-y-3'>
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                    <Percent className='h-4 w-4 text-primary' />
                    {t('priceList.form.variantItemsSection', {
                      defaultValue: 'Variant Price Overrides (price_list_items)',
                    })}
                  </h3>
                  <p className='text-xs text-muted-foreground mt-0.5'>
                    {fields.length > 0
                      ? t('priceList.form.variantItemsHelp', {
                          defaultValue: 'Customize price, floor price, and discount cap for each variant.',
                        })
                      : t('priceList.form.noVariantsHelp', {
                          defaultValue: 'Select a product with variants above to configure variant-specific prices.',
                        })}
                  </p>
                </div>
                {fields.length > 0 && (
                  <Badge variant='secondary' className='text-xs'>
                    {fields.length} {t('priceList.form.variantsLabel', { defaultValue: 'Variants' })}
                  </Badge>
                )}
              </div>

              {fields.length > 0 ? (
                <div className='overflow-x-auto rounded-md border'>
                  <Table>
                    <TableHeader className='bg-muted/50'>
                      <TableRow>
                        <TableHead className='w-[220px]'>
                          {t('priceList.table.variant', { defaultValue: 'Variant / SKU' })}
                        </TableHead>
                        <TableHead className='w-[140px] text-right'>
                          {t('priceList.table.regularRef', { defaultValue: 'Regular Price' })}
                        </TableHead>
                        <TableHead className='w-[160px]'>
                          {t('priceList.table.tierPrice', { defaultValue: 'Price List Price' })}{' '}
                          <span className='text-destructive'>*</span>
                        </TableHead>
                        <TableHead className='w-[150px]'>
                          {t('priceList.table.floorPrice', { defaultValue: 'Floor (Min Price)' })}
                        </TableHead>
                        <TableHead className='w-[140px]'>
                          {t('priceList.table.maxDiscount', { defaultValue: 'Max Discount %' })}
                        </TableHead>
                        <TableHead className='w-[120px] text-right'>
                          {t('priceList.table.margin', { defaultValue: 'Est. Margin' })}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((fieldItem, index) => {
                        const variantPrice = form.watch(`items.${index}.price`)
                        const variantMinPrice = form.watch(`items.${index}.min_price`)
                        const cost = fieldItem.cost_price

                        const isBelowCost =
                          cost != null && cost > 0 && variantPrice < cost
                        const isFloorExceeded =
                          variantMinPrice > 0 && variantMinPrice > variantPrice

                        const marginPct =
                          cost != null && variantPrice > 0
                            ? (((variantPrice - cost) / variantPrice) * 100).toFixed(1)
                            : null

                        return (
                          <TableRow key={fieldItem.id || fieldItem.product_variant_id}>
                            {/* Variant name & SKU */}
                            <TableCell className='font-medium'>
                              <div className='flex flex-col'>
                                <span className='text-sm font-semibold'>
                                  {fieldItem.variant_name || 'Standard'}
                                </span>
                                <span className='text-xs text-muted-foreground font-mono'>
                                  {fieldItem.variant_sku}
                                </span>
                              </div>
                            </TableCell>

                            {/* Reference Price & Cost */}
                            <TableCell className='text-right'>
                              <div className='flex flex-col items-end'>
                                <span className='text-sm font-medium'>
                                  ${Number(fieldItem.regular_price || 0).toFixed(2)}
                                </span>
                                {cost != null && (
                                  <span className='text-xs text-muted-foreground'>
                                    Cost: ${cost.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Editable Price */}
                            <TableCell>
                              <div className='space-y-1'>
                                <div className='relative'>
                                  <span className='absolute left-2.5 top-2 text-xs text-muted-foreground'>
                                    $
                                  </span>
                                  <Input
                                    type='number'
                                    step='0.01'
                                    min='0'
                                    className={`h-8 pl-6 text-sm ${
                                      isBelowCost ? 'border-amber-500 bg-amber-50/20' : ''
                                    }`}
                                    {...form.register(`items.${index}.price`, {
                                      valueAsNumber: true,
                                    })}
                                  />
                                </div>
                                {isBelowCost && (
                                  <div className='flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400'>
                                    <AlertTriangle className='h-3 w-3' />
                                    <span>Below cost (${cost?.toFixed(2)})</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* Floor (Min Price) */}
                            <TableCell>
                              <div className='space-y-1'>
                                <div className='relative'>
                                  <span className='absolute left-2.5 top-2 text-xs text-muted-foreground'>
                                    $
                                  </span>
                                  <Input
                                    type='number'
                                    step='0.01'
                                    min='0'
                                    className={`h-8 pl-6 text-sm ${
                                      isFloorExceeded ? 'border-destructive' : ''
                                    }`}
                                    {...form.register(`items.${index}.min_price`, {
                                      valueAsNumber: true,
                                    })}
                                  />
                                </div>
                                {isFloorExceeded && (
                                  <span className='text-[10px] text-destructive'>
                                    Floor exceeds price
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Max Discount % */}
                            <TableCell>
                              <div className='relative'>
                                <Input
                                  type='number'
                                  step='0.1'
                                  min='0'
                                  max='100'
                                  className='h-8 pr-6 text-sm'
                                  {...form.register(`items.${index}.max_discount_percent`, {
                                    valueAsNumber: true,
                                  })}
                                />
                                <span className='absolute right-2.5 top-2 text-xs text-muted-foreground'>
                                  %
                                </span>
                              </div>
                            </TableCell>

                            {/* Margin calculation */}
                            <TableCell className='text-right'>
                              {marginPct !== null ? (
                                <Badge
                                  variant={Number(marginPct) < 0 ? 'destructive' : 'secondary'}
                                  className='text-xs font-mono'
                                >
                                  {marginPct}%
                                </Badge>
                              ) : (
                                <span className='text-xs text-muted-foreground'>—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
                  {selectedProductId
                    ? t('priceList.form.noVariantsForProduct', {
                        defaultValue: 'This product has no extra variants. The header list price will be used.',
                      })
                    : t('priceList.form.selectProductFirst', {
                        defaultValue: 'Select a product to preview and configure variant price rules.',
                      })}
                </div>
              )}
            </div>

            <DialogFooter className='gap-2 sm:gap-0'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setOpen(null)}
                disabled={isPending}
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending
                  ? t('common.saving', { defaultValue: 'Saving...' })
                  : t('common.save', { defaultValue: 'Save Price List' })}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
