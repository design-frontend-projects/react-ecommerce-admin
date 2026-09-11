import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Warehouse,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Settings,
  Phone,
  Mail,
  Building,
  Copy,
  Info,
} from 'lucide-react'
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
const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/

const formSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required.')
    .max(30, 'Code cannot exceed 30 characters.')
    .trim(),
  name: z
    .string()
    .min(1, 'Name is required.')
    .max(120, 'Name cannot exceed 120 characters.')
    .trim(),
  branchId: z.string().optional().nullable(),
  storeId: z.string().optional().nullable(),
  countryId: z.string().optional().nullable(),
  cityId: z.string().optional().nullable(),
  phone: z
    .string()
    .regex(phoneRegex, 'Invalid phone number format.')
    .optional()
    .nullable()
    .or(z.literal('')),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .nullable()
    .or(z.literal('')),
  address: z
    .string()
    .max(255, 'Address cannot exceed 255 characters.')
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(1000, 'Notes cannot exceed 1000 characters.')
    .optional()
    .nullable(),
  allowNegativeStock: z.boolean(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
})

type WarehouseFormValues = z.infer<typeof formSchema>

export function WarehouseActionDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow, isDuplicate } = useWarehousesContext()
  const [activeTab, setActiveTab] = useState<'general' | 'location' | 'settings'>('general')

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
  const codeValue = form.watch('code') || ''
  const nameValue = form.watch('name') || ''
  const notesValue = form.watch('notes') || ''
  const { data: cities = [] } = useCities(selectedCountryId || undefined)

  // Pre-populate on edit / duplicate / reset on create
  useEffect(() => {
    if (isOpen) {
      setActiveTab('general')
      if (isEdit && currentRow) {
        form.reset({
          code: currentRow.code || '',
          name: currentRow.name || '',
          branchId: currentRow.branch_id || currentRow.branches?.id || '',
          storeId:
            currentRow.store_warehouses?.[0]?.stores?.store_id ||
            currentRow.store_id ||
            currentRow.stores?.store_id ||
            '',
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
      } else if (isDuplicate && currentRow) {
        form.reset({
          code: `${currentRow.code}-COPY`,
          name: `${currentRow.name} (Copy)`,
          branchId: currentRow.branch_id || currentRow.branches?.id || '',
          storeId:
            currentRow.store_warehouses?.[0]?.stores?.store_id ||
            currentRow.store_id ||
            currentRow.stores?.store_id ||
            '',
          countryId: currentRow.country_id || currentRow.countries?.id || '',
          cityId: currentRow.city_id || currentRow.cities?.id || '',
          phone: currentRow.phone || '',
          email: currentRow.email || '',
          address: currentRow.address || '',
          notes: currentRow.notes || '',
          allowNegativeStock: currentRow.allow_negative_stock ?? false,
          isDefault: false, // duplicates start as non-default
          isActive: true,
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
  }, [isOpen, isEdit, isDuplicate, currentRow, form])

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
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      branchId:
        values.branchId && values.branchId !== NONE_VALUE ? values.branchId : null,
      storeId:
        values.storeId && values.storeId !== NONE_VALUE ? values.storeId : null,
      countryId:
        values.countryId && values.countryId !== NONE_VALUE
          ? values.countryId
          : null,
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
    <Dialog
      open={isOpen}
      onOpenChange={(val) => !isPending && setOpen(val ? open : null)}
    >
      <DialogContent className='sm:max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden'>
        <DialogHeader className='p-6 pb-3 border-b bg-muted/20'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs'>
              {isDuplicate ? (
                <Copy className='h-5 w-5 text-emerald-600' />
              ) : (
                <Warehouse className='h-5 w-5' />
              )}
            </div>
            <div>
              <DialogTitle className='text-lg font-bold'>
                {isDuplicate
                  ? t('warehouses.duplicateWarehouse', 'Duplicate Warehouse')
                  : isEdit
                    ? t('warehouses.editWarehouse', 'Edit Warehouse')
                    : t('warehouses.createWarehouse', 'Create Warehouse')}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                {isDuplicate
                  ? t(
                      'warehouses.duplicateDesc',
                      'Create a new warehouse pre-populated from an existing facility.'
                    )
                  : t(
                      'warehouses.description',
                      'Physical storage facilities and their zone → rack → shelf → bin locations.'
                    )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex flex-col flex-1 overflow-hidden'
          >
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as typeof activeTab)}
              className='flex flex-col flex-1 overflow-hidden'
            >
              <div className='px-6 pt-3 border-b bg-muted/5'>
                <TabsList className='grid w-full grid-cols-3 h-9'>
                  <TabsTrigger
                    value='general'
                    className='flex items-center gap-1.5 text-xs'
                  >
                    <Warehouse className='h-3.5 w-3.5' />
                    <span>{t('warehouses.form.generalTab', 'General')}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value='location'
                    className='flex items-center gap-1.5 text-xs'
                  >
                    <MapPin className='h-3.5 w-3.5' />
                    <span>{t('warehouses.form.locationTab', 'Location & Facility')}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value='settings'
                    className='flex items-center gap-1.5 text-xs'
                  >
                    <Settings className='h-3.5 w-3.5' />
                    <span>{t('warehouses.form.settingsTab', 'Policies & Status')}</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className='flex-1 overflow-y-auto p-6 space-y-4'>
                {/* 1. General Tab */}
                <TabsContent value='general' className='space-y-4 m-0'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <FormField
                      control={form.control}
                      name='code'
                      render={({ field }) => (
                        <FormItem>
                          <div className='flex items-center justify-between'>
                            <FormLabel className='text-xs font-semibold'>
                              {t('warehouses.form.code', 'Warehouse Code')} *
                            </FormLabel>
                            <span className='text-[10px] text-muted-foreground font-mono'>
                              {codeValue.length}/30
                            </span>
                          </div>
                          <FormControl>
                            <Input
                              placeholder={t(
                                'warehouses.form.codePlaceholder',
                                'e.g. WH-MAIN-01'
                              )}
                              className='font-mono uppercase text-sm'
                              maxLength={30}
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.value.toUpperCase())
                              }
                            />
                          </FormControl>
                          <FormDescription className='text-[11px]'>
                            {t('warehouses.form.codeHelper', 'Unique identifier code across facilities')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='name'
                      render={({ field }) => (
                        <FormItem>
                          <div className='flex items-center justify-between'>
                            <FormLabel className='text-xs font-semibold'>
                              {t('warehouses.form.name', 'Warehouse Name')} *
                            </FormLabel>
                            <span className='text-[10px] text-muted-foreground font-mono'>
                              {nameValue.length}/120
                            </span>
                          </div>
                          <FormControl>
                            <Input
                              placeholder={t(
                                'warehouses.form.namePlaceholder',
                                'e.g. Main Distribution Center'
                              )}
                              maxLength={120}
                              className='text-sm'
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className='text-[11px]'>
                            {t('warehouses.form.nameHelper', 'Descriptive name visible on reports & transfers')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name='notes'
                    render={({ field }) => (
                      <FormItem>
                        <div className='flex items-center justify-between'>
                          <FormLabel className='text-xs font-semibold'>
                            {t('warehouses.form.notes', 'Internal Notes')}
                          </FormLabel>
                          <span className='text-[10px] text-muted-foreground font-mono'>
                            {notesValue.length}/1000
                          </span>
                        </div>
                        <FormControl>
                          <Textarea
                            placeholder={t(
                              'warehouses.form.notesPlaceholder',
                              'Access codes, loading bay info, operational hours, security contacts...'
                            )}
                            rows={4}
                            maxLength={1000}
                            className='text-sm resize-none'
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* 2. Location & Facility Tab */}
                <TabsContent value='location' className='space-y-4 m-0'>
                  {/* Branch & Store Connectivity */}
                  <div className='rounded-lg border p-3.5 space-y-3 bg-muted/10'>
                    <div className='flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                      <Building className='h-3.5 w-3.5 text-blue-500' />
                      <span>{t('warehouses.form.connectivityTitle', 'Facility Affiliation')}</span>
                    </div>

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      <FormField
                        control={form.control}
                        name='branchId'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-xs'>
                              {t('warehouses.form.branch', 'Associated Branch')}
                            </FormLabel>
                            <Select
                              value={field.value || NONE_VALUE}
                              onValueChange={(val) =>
                                field.onChange(val === NONE_VALUE ? '' : val)
                              }
                            >
                              <FormControl>
                                <SelectTrigger className='text-xs'>
                                  <SelectValue
                                    placeholder={t(
                                      'warehouses.form.selectBranch',
                                      'Select branch (optional)'
                                    )}
                                  />
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
                            <FormLabel className='text-xs'>
                              {t('warehouses.form.store', 'Linked Store')}
                            </FormLabel>
                            <Select
                              value={field.value || NONE_VALUE}
                              onValueChange={(val) =>
                                field.onChange(val === NONE_VALUE ? '' : val)
                              }
                            >
                              <FormControl>
                                <SelectTrigger className='text-xs'>
                                  <SelectValue
                                    placeholder={t(
                                      'warehouses.form.selectStore',
                                      'Select store (optional)'
                                    )}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value={NONE_VALUE}>
                                  {t('warehouses.form.noStore', 'No store linked')}
                                </SelectItem>
                                {stores.map((store) => (
                                  <SelectItem
                                    key={store.store_id}
                                    value={store.store_id}
                                  >
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
                  </div>

                  {/* Geographic Location & Address */}
                  <div className='rounded-lg border p-3.5 space-y-3 bg-muted/10'>
                    <div className='flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                      <MapPin className='h-3.5 w-3.5 text-emerald-500' />
                      <span>{t('warehouses.form.locationTitle', 'Geographic Location')}</span>
                    </div>

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      <FormField
                        control={form.control}
                        name='countryId'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-xs'>
                              {t('warehouses.form.country', 'Country')}
                            </FormLabel>
                            <Select
                              value={field.value || NONE_VALUE}
                              onValueChange={(val) =>
                                field.onChange(val === NONE_VALUE ? '' : val)
                              }
                            >
                              <FormControl>
                                <SelectTrigger className='text-xs'>
                                  <SelectValue
                                    placeholder={t(
                                      'warehouses.form.selectCountry',
                                      'Select country (optional)'
                                    )}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value={NONE_VALUE}>
                                  {t(
                                    'warehouses.form.noCountry',
                                    'No country selected'
                                  )}
                                </SelectItem>
                                {countries.map((country) => (
                                  <SelectItem key={country.id} value={country.id}>
                                    {country.name}{' '}
                                    {country.code ? `(${country.code})` : ''}
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
                            <FormLabel className='text-xs'>
                              {t('warehouses.form.city', 'City')}
                            </FormLabel>
                            <Select
                              value={field.value || NONE_VALUE}
                              disabled={!selectedCountryId}
                              onValueChange={(val) =>
                                field.onChange(val === NONE_VALUE ? '' : val)
                              }
                            >
                              <FormControl>
                                <SelectTrigger className='text-xs'>
                                  <SelectValue
                                    placeholder={
                                      selectedCountryId
                                        ? t(
                                            'warehouses.form.selectCity',
                                            'Select city (optional)'
                                          )
                                        : t(
                                            'warehouses.form.selectCountryFirst',
                                            'Select a country first'
                                          )
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

                    <FormField
                      control={form.control}
                      name='address'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-xs'>
                            {t('warehouses.form.address', 'Street Address')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t(
                                'warehouses.form.addressPlaceholder',
                                'Building, street, district...'
                              )}
                              className='text-xs'
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Contact Information */}
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                    <FormField
                      control={form.control}
                      name='phone'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-xs flex items-center gap-1'>
                            <Phone className='h-3 w-3 text-muted-foreground' />
                            {t('warehouses.form.phone', 'Contact Phone')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t(
                                'warehouses.form.phonePlaceholder',
                                'e.g. +1 555-0199'
                              )}
                              className='text-xs'
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
                          <FormLabel className='text-xs flex items-center gap-1'>
                            <Mail className='h-3 w-3 text-muted-foreground' />
                            {t('warehouses.form.email', 'Contact Email')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type='email'
                              placeholder={t(
                                'warehouses.form.emailPlaceholder',
                                'warehouse@company.com'
                              )}
                              className='text-xs'
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* 3. Settings & Policies Tab */}
                <TabsContent value='settings' className='space-y-4 m-0'>
                  <div className='rounded-lg border divide-y bg-card overflow-hidden'>
                    {/* Allow Negative Stock */}
                    <FormField
                      control={form.control}
                      name='allowNegativeStock'
                      render={({ field }) => (
                        <FormItem className='flex items-center justify-between p-4'>
                          <div className='space-y-1 pe-4'>
                            <div className='flex items-center gap-2'>
                              <ShieldAlert className='h-4 w-4 text-amber-500' />
                              <FormLabel className='text-sm font-semibold cursor-pointer'>
                                {t(
                                  'warehouses.form.allowNegativeStock',
                                  'Allow negative stock'
                                )}
                              </FormLabel>
                            </div>
                            <FormDescription className='text-xs leading-relaxed text-muted-foreground'>
                              {t(
                                'warehouses.form.allowNegativeStockDesc',
                                'Allow inventory levels to drop below zero during orders and transfers.'
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

                    {/* Default Facility */}
                    <FormField
                      control={form.control}
                      name='isDefault'
                      render={({ field }) => (
                        <FormItem className='flex items-center justify-between p-4'>
                          <div className='space-y-1 pe-4'>
                            <div className='flex items-center gap-2'>
                              <ShieldCheck className='h-4 w-4 text-primary' />
                              <FormLabel className='text-sm font-semibold cursor-pointer'>
                                {t('warehouses.form.isDefault', 'Default facility')}
                              </FormLabel>
                            </div>
                            <FormDescription className='text-xs leading-relaxed text-muted-foreground'>
                              {t(
                                'warehouses.form.isDefaultDesc',
                                'Primary fulfillment location for sales and order routing.'
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

                    {/* Active Status */}
                    <FormField
                      control={form.control}
                      name='isActive'
                      render={({ field }) => (
                        <FormItem className='flex items-center justify-between p-4'>
                          <div className='space-y-1 pe-4'>
                            <FormLabel className='text-sm font-semibold cursor-pointer'>
                              {t('warehouses.form.isActive', 'Active status')}
                            </FormLabel>
                            <FormDescription className='text-xs leading-relaxed text-muted-foreground'>
                              {t(
                                'warehouses.form.isActiveDesc',
                                'Enable or disable inventory operations in this warehouse.'
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

                  <div className='flex items-start gap-2 p-3 rounded-lg border bg-blue-500/5 border-blue-500/20 text-xs text-blue-700 dark:text-blue-300'>
                    <Info className='h-4 w-4 shrink-0 mt-0.5' />
                    <span>
                      {t(
                        'warehouses.form.policyNotice',
                        'Storage zones, racks, shelves, and bins can be configured immediately after creating the facility.'
                      )}
                    </span>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter className='p-4 border-t bg-muted/20 flex items-center justify-between'>
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
                  : isDuplicate
                    ? t('warehouses.form.createDuplicate', 'Create Duplicate')
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
