import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useForm, type SubmitHandler, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useBranches } from '@/features/branches/hooks/use-branches'
import { useCities } from '@/features/cities/hooks/use-cities'
import { useCountries } from '@/features/countries/hooks/use-countries'
import { useCreateStore, useUpdateStore } from '../hooks/use-stores'
import { useStoresContext } from './stores-provider'

const formSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  status: z.boolean(),
  phone: z.string().optional().nullable(),
  email: z
    .string()
    .email('Invalid email format')
    .optional()
    .nullable()
    .or(z.literal('')),
  address: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  city_id: z.string().min(1, 'City is required'),
  country_id: z.string().min(1, 'Country is required'),
  branch_id: z.string().optional().nullable(),
})

type StoreFormValues = z.infer<typeof formSchema>

export function StoreActionDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useStoresContext()
  const createMutation = useCreateStore()
  const updateMutation = useUpdateStore()

  const { data: countries } = useCountries()
  const { data: branches } = useBranches()

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const form = useForm<StoreFormValues>({
    resolver: zodResolver(formSchema) as Resolver<StoreFormValues>,
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      latitude: undefined,
      longitude: undefined,
      city_id: '',
      country_id: '',
      branch_id: '',
      status: true,
    },
  })

  const selectedCountryId = form.watch('country_id')
  const { data: cities } = useCities(selectedCountryId)

  useEffect(() => {
    if (selectedCountryId && currentRow?.country_id !== selectedCountryId) {
      const currentCityId = form.getValues('city_id')
      if (currentCityId && !cities?.find((c) => c.id === currentCityId)) {
        form.setValue('city_id', '')
      }
    }
  }, [selectedCountryId, cities, form, currentRow?.country_id])

  useEffect(() => {
    if (isOpen) {
      if (currentRow) {
        form.reset({
          name: currentRow.name || '',
          phone: currentRow.phone || '',
          email: currentRow.email || '',
          address: currentRow.address || '',
          latitude: currentRow.latitude || undefined,
          longitude: currentRow.longitude || undefined,
          city_id: currentRow.city_id || '',
          country_id: currentRow.country_id || '',
          branch_id: currentRow.branch_id ? String(currentRow.branch_id) : '',
          status: currentRow.status ?? true,
        })
      } else {
        form.reset({
          name: '',
          phone: '',
          email: '',
          address: '',
          latitude: undefined,
          longitude: undefined,
          city_id: '',
          country_id: '',
          branch_id: '',
          status: true,
        })
      }
    }
  }, [currentRow, form, isOpen])

  const onSubmit: SubmitHandler<StoreFormValues> = async (data) => {
    try {
      const sanitizedData = {
        name: data.name.trim(),
        status: data.status,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        city_id: data.city_id || null,
        country_id: data.country_id || null,
        branch_id: data.branch_id ? data.branch_id : null,
      }

      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          store_id: currentRow.store_id,
          ...sanitizedData,
        })
        toast.success(t('stores.toast.updated', 'Store updated successfully'))
      } else {
        await createMutation.mutateAsync(sanitizedData)
        toast.success(t('stores.toast.created', 'Store created successfully'))
      }
      setOpen(null)
    } catch (error: any) {
      toast.error(t('stores.toast.error', 'Error'), {
        description:
          error instanceof Error
            ? error.message
            : t(
                'stores.toast.errorDescription',
                'Something went wrong. Please try again.'
              ),
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='sm:max-w-125'>
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('stores.form.editTitle', 'Edit Store')
              : t('stores.form.createTitle', 'Create Store')}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t('stores.form.editDescription', 'Edit the store details below.')
              : t('stores.form.createDescription', 'Add a new location to your system.')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className='-mr-4 h-112.5 pr-4'>
          <Form {...form}>
            <form
              id='store-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
            >
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('stores.form.name', 'Store Name')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t(
                          'stores.form.namePlaceholder',
                          'Main Branch'
                        )}
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
                name='branch_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('stores.form.branch', 'Branch')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              'stores.form.selectBranch',
                              'Select a branch'
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches?.map((branch) => (
                          <SelectItem key={branch.id} value={String(branch.id)}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='country_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('stores.form.country', 'Country')}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                'stores.form.selectCountry',
                                'Select a country'
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries?.map((country) => (
                            <SelectItem
                              key={country.id}
                              value={String(country.id)}
                            >
                              {country.name}
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
                  name='city_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('stores.form.city', 'City')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                        disabled={!selectedCountryId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !selectedCountryId
                                  ? t(
                                      'stores.form.selectCountryFirst',
                                      'Select country first'
                                    )
                                  : t(
                                      'stores.form.selectCity',
                                      'Select a city'
                                    )
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cities?.map((city) => (
                            <SelectItem key={city.id} value={String(city.id)}>
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
                    <FormLabel>
                      {t('stores.form.address', 'Address')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t(
                          'stores.form.addressPlaceholder',
                          'Street address'
                        )}
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='phone'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('stores.form.phone', 'Phone')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t(
                            'stores.form.phonePlaceholder',
                            '+1-555-0100'
                          )}
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
                  name='email'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('stores.form.email', 'Email')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t(
                            'stores.form.emailPlaceholder',
                            'contact@store.com'
                          )}
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='latitude'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('stores.form.latitude', 'Latitude')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='0.000000'
                          {...field}
                          value={field.value || ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? undefined
                                : Number(e.target.value)
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
                  name='longitude'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('stores.form.longitude', 'Longitude')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='0.000000'
                          {...field}
                          value={field.value || ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? undefined
                                : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name='status'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-base'>
                        {t('stores.form.active', 'Active')}
                      </FormLabel>
                      <div className='text-sm text-muted-foreground'>
                        {t(
                          'stores.form.operationalStatus',
                          'Operational status.'
                        )}
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => setOpen(null)}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {t('stores.form.cancel', 'Cancel')}
          </Button>
          <Button
            type='submit'
            form='store-form'
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? t('stores.form.saving', 'Saving...')
              : t('stores.form.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

