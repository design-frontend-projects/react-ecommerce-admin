import { useEffect, useMemo } from 'react'
import { z } from 'zod'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { type TFunction } from 'i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PhoneInput } from '@/components/custom-ui/phone-input'
import { useCities } from '@/features/cities/hooks/use-cities'
import { useCountries } from '@/features/countries/hooks/use-countries'
import { useCustomerGroups } from '@/features/customer-groups/hooks/use-customer-groups'
import { useCreateCustomer, useUpdateCustomer } from '../hooks/use-customers'
import { useCustomersContext } from './customers-provider'

const getFormSchema = (t: TFunction) =>
  z.object({
    first_name: z.string().min(1, t('customers.validation.firstNameRequired', 'First name is required')),
    last_name: z.string().min(1, t('customers.validation.lastNameRequired', 'Last name is required')),
    email: z
      .string()
      .email(t('customers.validation.invalidEmail', 'Invalid email address'))
      .optional()
      .or(z.literal('')),
    phone: z.string().optional(),
    address_line1: z.string().optional(),
    address_line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
    date_of_birth: z.string().optional(),
    loyalty_points: z.coerce.number().optional(),
    is_active: z.boolean().default(true),
    group_id: z.string().optional(),
  })

type CustomerFormValues = z.infer<ReturnType<typeof getFormSchema>>

export function CustomerActionDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useCustomersContext()
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()

  const { data: countries } = useCountries()

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const formSchema = useMemo(() => getFormSchema(t), [t])

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema) as Resolver<CustomerFormValues>,
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      date_of_birth: '',
      loyalty_points: 0,
      is_active: true,
      group_id: undefined,
    },
  })

  const selectedCountryName = form.watch('country')
  const selectedCountry = countries?.find((c) => c.name === selectedCountryName)
  const { data: cities } = useCities(selectedCountry?.id)

  useEffect(() => {
    if (currentRow) {
      form.reset({
        first_name: currentRow.first_name,
        last_name: currentRow.last_name,
        email: currentRow.email || '',
        phone: currentRow.phone || '',
        address_line1: currentRow.address_line1 || '',
        address_line2: currentRow.address_line2 || '',
        city: currentRow.city || '',
        state: currentRow.state || '',
        postal_code: currentRow.postal_code || '',
        country: currentRow.country || '',
        date_of_birth: currentRow.date_of_birth || '',
        loyalty_points: currentRow.loyalty_points || 0,
        is_active: currentRow.is_active ?? true,
        group_id: currentRow.group_id || undefined,
      })
    } else {
      form.reset({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        date_of_birth: '',
        loyalty_points: 0,
        is_active: true,
        group_id: undefined,
      })
    }
  }, [currentRow, form])

  const onSubmit = async (values: CustomerFormValues) => {
    try {
      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.id || (currentRow as any).customer_id,
          ...values,
        })
        toast.success(t('customers.toast.updated', 'Customer updated successfully'))
      } else {
        await createMutation.mutateAsync(values)
        toast.success(t('customers.toast.created', 'Customer created successfully'))
      }
      setOpen(null)
    } catch (error: unknown) {
      toast.error(t('customers.toast.error', 'Error'), {
        description:
          error && error instanceof Error
            ? error.message
            : t('common.errorOccurred', 'Something went wrong. Please try again.'),
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('customers.editCustomer', 'Edit Customer')
              : t('customers.createCustomer', 'Create Customer')}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t('customers.form.editDescription', 'Edit the customer details below.')
              : t('customers.form.createDescription', 'Add a new customer to your database.')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='grid gap-4 py-4'
          >
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                name='first_name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.form.firstName', 'First Name')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('customers.form.firstNamePlaceholder', 'First Name')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name='last_name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.form.lastName', 'Last Name')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('customers.form.lastNamePlaceholder', 'Last Name')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.form.email', 'Email')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('customers.form.emailPlaceholder', 'Email')}
                        type='email'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name='phone'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.form.phone', 'Phone')}</FormLabel>
                    <FormControl>
                      <PhoneInput
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-1 gap-4'>
              <FormField
                name='address_line1'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.form.addressLine1', 'Address Line 1')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('customers.form.addressLine1Placeholder', 'Address Line 1')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name='address_line2'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.form.addressLine2', 'Address Line 2')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('customers.form.addressLine2Placeholder', 'Address Line 2')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-4 gap-4'>
              <FormField
                name='country'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.form.country', 'Country')}</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value)
                        form.setValue('city', '')
                      }}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('customers.form.selectCountry', 'Select Country')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries?.map((country) => (
                          <SelectItem key={country.id} value={country.name}>
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
                name='city'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.form.city', 'City')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                      disabled={!selectedCountryName || cities?.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('customers.form.selectCity', 'Select City')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cities?.map((city) => (
                          <SelectItem key={city.id} value={city.name}>
                            {city.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name='state'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.form.state', 'State')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('customers.form.statePlaceholder', 'State')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                name='postal_code'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.form.postalCode', 'Postal Code')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('customers.form.postalCodePlaceholder', 'Postal Code')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                name='date_of_birth'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.form.dateOfBirth', 'Date of Birth')}</FormLabel>
                    <FormControl>
                      <Input
                        type='date'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                name='loyalty_points'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.form.loyaltyPoints', 'Loyalty Points')}</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder={t('customers.form.loyaltyPointsPlaceholder', 'Loyalty Points')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <CustomerGroupField form={form} />

            <FormField
              name='is_active'
              render={({ field }) => (
                <FormItem className='flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4'>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className='space-y-1 leading-none'>
                    <FormLabel>{t('customers.form.activeStatus', 'Active Status')}</FormLabel>
                    <FormDescription>
                      {t(
                        'customers.form.activeDesc',
                        'This customer will participate in the loyalty program and have analytics.'
                      )}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setOpen(null)}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                type='submit'
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t('common.saving', 'Saving...')
                  : t('common.save', 'Save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// --- Customer Group Select Field ---

interface CustomerGroupFieldProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any
}

function CustomerGroupField({ form }: CustomerGroupFieldProps) {
  const { t } = useTranslation()
  const { data: groups, isLoading, isError } = useCustomerGroups()

  return (
    <FormField
      control={form.control}
      name='group_id'
      render={({ field }) => (
        <FormItem>
          <div className='flex items-center justify-between'>
            <FormLabel>{t('customers.form.group', 'Customer Group')}</FormLabel>
          </div>
          <FormControl>
            {isLoading ? (
              <Skeleton className='h-9 w-full rounded-md' />
            ) : (
              <Select
                value={field.value ? String(field.value) : ''}
                onValueChange={(val) => {
                  field.onChange(val === '__none__' ? undefined : val)
                }}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder={t('customers.form.selectGroup', 'Select a customer group')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none__'>
                    <span className='text-muted-foreground'>{t('customers.form.noGroup', 'No group')}</span>
                  </SelectItem>
                  {groups?.map((group) => {
                    const groupId = group.id || group.group_id
                    if (!groupId) return null
                    return (
                      <SelectItem
                        key={String(groupId)}
                        value={String(groupId)}
                      >
                        <div className='flex items-center gap-2'>
                          <span>{group.name}</span>
                          {group.discount_percentage != null &&
                            Number(group.discount_percentage) > 0 && (
                              <span className='text-xs text-muted-foreground'>
                                ({Number(group.discount_percentage)}% off)
                              </span>
                            )}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          </FormControl>
          {isError && (
            <p className='text-xs text-destructive'>
              {t('customers.form.failedLoadGroups', 'Failed to load groups. Try again.')}
            </p>
          )}
          {!isLoading && groups?.length === 0 && (
            <FormDescription>
              {t(
                'customers.form.noGroupsDefined',
                'No groups defined yet. Click "New Group" to create one.'
              )}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
