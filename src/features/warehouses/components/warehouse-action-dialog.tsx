import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Warehouse, MapPin, ShieldAlert } from 'lucide-react'
import { useCountries } from '@/features/countries/hooks/use-countries'
import { useCities } from '@/features/cities/hooks/use-cities'
import { useBranches } from '@/features/branches/hooks/use-branches'
import { useStoreOptions } from '@/hooks/use-inventory-lookups'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCreateWarehouse, useUpdateWarehouse } from '../hooks/use-warehouses'
import { useWarehousesContext } from './provider'

const NONE_VALUE = '__none__'

const formSchema = z.object({
  code: z.string().min(1, 'Code is required').max(30),
  name: z.string().min(1, 'Name is required').max(120),
  branchId: z.string().optional().nullable(),
  storeId: z.string().optional().nullable(),
  countryId: z.string().optional().nullable(),
  cityId: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .nullable()
    .or(z.literal('')),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  allowNegativeStock: z.boolean(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
})

type WarehouseFormValues = z.infer<typeof formSchema>

export function WarehouseActionDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useWarehousesContext()

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const { data: countries = [] } = useCountries()
  const { data: branches = [] } = useBranches()
  const { data: stores = [] } = useStoreOptions()

  const createWarehouse = useCreateWarehouse()
  const updateWarehouse = useUpdateWarehouse()

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(formSchema) as Resolver<WarehouseFormValues>,
    defaultValues: {
      code: '',
      name: '',
      branchId: '',
      storeId: '',
      countryId: '',
      cityId: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      allowNegativeStock: false,
      isDefault: false,
      isActive: true,
    },
  })

  const selectedCountryId = form.watch('countryId')
  const { data: cities = [] } = useCities(selectedCountryId || undefined)

  // Pre-populate on edit / reset on create
  useEffect(() => {
    if (isOpen) {
      if (isEdit && currentRow) {
        form.reset({
          code: currentRow.code || '',
          name: currentRow.name || '',
          branchId: currentRow.branch_id || currentRow.branches?.id || '',
          storeId: currentRow.store_id || currentRow.stores?.store_id || '',
          countryId: currentRow.country_id || currentRow.countries?.id || '',
          cityId: currentRow.city_id || currentRow.cities?.id || '',
          phone: currentRow.phone || '',
          email: currentRow.email || '',
          address: currentRow.address || '',
          notes: currentRow.notes || '',
          allowNegativeStock: currentRow.allow_negative_stock ?? false,
          isDefault: currentRow.is_default ?? false,
          isActive: currentRow.is_active ?? true,
        })
      } else {
        form.reset({
          code: '',
          name: '',
          branchId: '',
          storeId: '',
          countryId: '',
          cityId: '',
          phone: '',
          email: '',
          address: '',
          notes: '',
          allowNegativeStock: false,
          isDefault: false,
          isActive: true,
        })
      }
    }
  }, [isOpen, isEdit, currentRow, form])

  // Reset city if country changes and city is no longer valid
  useEffect(() => {
    if (selectedCountryId && cities.length > 0) {
      const currentCityId = form.getValues('cityId')
      if (currentCityId && !cities.some((c) => c.id === currentCityId)) {
        form.setValue('cityId', '')
      }
    } else if (!selectedCountryId) {
      form.setValue('cityId', '')
    }
  }, [selectedCountryId, cities, form])

  const onSubmit = async (values: WarehouseFormValues) => {
    const payload = {
      code: values.code.trim(),
      name: values.name.trim(),
      branchId: values.branchId && values.branchId !== NONE_VALUE ? values.branchId : null,
      storeId: values.storeId && values.storeId !== NONE_VALUE ? values.storeId : null,
      countryId: values.countryId && values.countryId !== NONE_VALUE ? values.countryId : null,
      cityId: values.cityId && values.cityId !== NONE_VALUE ? values.cityId : null,
      phone: values.phone?.trim() || null,
      email: values.email?.trim() || null,
      address: values.address?.trim() || null,
      notes: values.notes?.trim() || null,
      allowNegativeStock: values.allowNegativeStock,
      isDefault: values.isDefault,
      isActive: values.isActive,
    }

    try {
      if (isEdit && currentRow) {
        await updateWarehouse.mutateAsync({
          id: currentRow.id,
          input: payload,
        })
      } else {
        await createWarehouse.mutateAsync(payload)
      }
      setOpen(null)
    } catch {
      // Handled by mutation toast
    }
  }

  const isPending = createWarehouse.isPending || updateWarehouse.isPending

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !isPending && setOpen(val ? open : null)}>
      <DialogContent className='sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Warehouse className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold'>
                {isEdit
                  ? t('warehouses.editWarehouse', 'Edit Warehouse')
                  : t('warehouses.createWarehouse', 'Create Warehouse')}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                {t(
                  'warehouses.description',
                  'Physical storage facilities and their zone → rack → shelf → bin locations.'
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <Tabs defaultValue='general' className='w-full'>
              <TabsList className='grid w-full grid-cols-2'>
                <TabsTrigger value='general' className='flex items-center gap-1.5'>
                  <Warehouse className='h-4 w-4' />
                  <span>{t('warehouses.form.generalTab', 'General')}</span>
                </TabsTrigger>
                <TabsTrigger value='location' className='flex items-center gap-1.5'>
                  <MapPin className='h-4 w-4' />
                  <span>{t('warehouses.form.locationTab', 'Location & Structure')}</span>
                </TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value='general' className='space-y-4 pt-3'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='code'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('warehouses.form.code', 'Warehouse Code')} *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('warehouses.form.codePlaceholder', 'e.g. WH-MAIN-01')}
                            className='font-mono uppercase'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='name'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('warehouses.form.name', 'Warehouse Name')} *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('warehouses.form.namePlaceholder', 'e.g. Main Distribution Center')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='phone'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('warehouses.form.phone', 'Contact Phone')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('warehouses.form.phonePlaceholder', 'e.g. +1 555-0199')}
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='email'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('warehouses.form.email', 'Contact Email')}</FormLabel>
                        <FormControl>
                          <Input
                            type='email'
                            placeholder={t('warehouses.form.emailPlaceholder', 'warehouse@company.com')}
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className='rounded-lg border p-4 space-y-4 bg-muted/20'>
                  <FormField
                    control={form.control}
                    name='allowNegativeStock'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between gap-2'>
                        <div className='space-y-0.5'>
                          <div className='flex items-center gap-1.5'>
                            <ShieldAlert className='h-4 w-4 text-amber-500' />
                            <FormLabel className='text-sm font-medium'>
                              {t('warehouses.form.allowNegativeStock', 'Allow negative stock')}
                            </FormLabel>
                          </div>
                          <FormDescription className='text-xs'>
                            {t(
                              'warehouses.form.allowNegativeStockDesc',
                              'Allow stock levels to drop below zero during orders/transfers'
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
                    name='isDefault'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between gap-2'>
                        <div className='space-y-0.5'>
                          <FormLabel className='text-sm font-medium'>
                            {t('warehouses.form.isDefault', 'Default facility')}
                          </FormLabel>
                          <FormDescription className='text-xs'>
                            {t(
                              'warehouses.form.isDefaultDesc',
                              'Primary default fulfillment location for linked store'
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
                    name='isActive'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between gap-2'>
                        <div className='space-y-0.5'>
                          <FormLabel className='text-sm font-medium'>
                            {t('warehouses.form.isActive', 'Active status')}
                          </FormLabel>
                          <FormDescription className='text-xs'>
                            {t(
                              'warehouses.form.isActiveDesc',
                              'Enable or disable inventory operations in this warehouse'
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
                </div>
              </TabsContent>

              {/* Location & Structure Tab */}
              <TabsContent value='location' className='space-y-4 pt-3'>
                {/* Country and City Cascading Dropdowns */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='countryId'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('warehouses.form.country', 'Country')}</FormLabel>
                        <Select
                          value={field.value || NONE_VALUE}
                          onValueChange={(val) => field.onChange(val === NONE_VALUE ? '' : val)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('warehouses.form.selectCountry', 'Select country (optional)')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={NONE_VALUE}>
                              {t('warehouses.form.noCountry', 'No country selected')}
                            </SelectItem>
                            {countries.map((country) => (
                              <SelectItem key={country.id} value={country.id}>
                                {country.name} {country.code ? `(${country.code})` : ''}
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
                    name='cityId'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('warehouses.form.city', 'City')}</FormLabel>
                        <Select
                          value={field.value || NONE_VALUE}
                          disabled={!selectedCountryId}
                          onValueChange={(val) => field.onChange(val === NONE_VALUE ? '' : val)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  selectedCountryId
                                    ? t('warehouses.form.selectCity', 'Select city (optional)')
                                    : t('warehouses.form.selectCountryFirst', 'Select a country first')
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={NONE_VALUE}>
                              {t('warehouses.form.noCity', 'No city selected')}
                            </SelectItem>
                            {cities.map((city) => (
                              <SelectItem key={city.id} value={city.id}>
                                {city.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Branch and Store Selectors */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='branchId'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('warehouses.form.branch', 'Associated Branch')}</FormLabel>
                        <Select
                          value={field.value || NONE_VALUE}
                          onValueChange={(val) => field.onChange(val === NONE_VALUE ? '' : val)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('warehouses.form.selectBranch', 'Select branch (optional)')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={NONE_VALUE}>
                              {t('warehouses.form.noBranch', 'No branch linked')}
                            </SelectItem>
                            {branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id}>
                                {branch.name}
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
                    name='storeId'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('warehouses.form.store', 'Linked Store')}</FormLabel>
                        <Select
                          value={field.value || NONE_VALUE}
                          onValueChange={(val) => field.onChange(val === NONE_VALUE ? '' : val)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('warehouses.form.selectStore', 'Select store (optional)')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={NONE_VALUE}>
                              {t('warehouses.form.noStore', 'No store linked')}
                            </SelectItem>
                            {stores.map((store) => (
                              <SelectItem key={store.store_id} value={store.store_id}>
                                {store.name ?? store.store_id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name='address'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('warehouses.form.address', 'Street Address')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('warehouses.form.addressPlaceholder', 'Building, street, district...')}
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='notes'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('warehouses.form.notes', 'Internal Notes')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('warehouses.form.notesPlaceholder', 'Access codes, loading bay info, operational hours...')}
                          rows={3}
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='outline'
                disabled={isPending}
                onClick={() => setOpen(null)}
              >
                {t('warehouses.form.cancel', 'Cancel')}
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending
                  ? t('warehouses.form.saving', 'Saving...')
                  : isEdit
                    ? t('warehouses.form.save', 'Save Changes')
                    : t('warehouses.form.create', 'Create Warehouse')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
