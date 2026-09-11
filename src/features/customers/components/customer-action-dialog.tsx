import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { type TFunction } from 'i18next'
import { toast } from 'sonner'
import {
  User,
  MapPin,
  ShieldCheck,
  Wand2,
  Calendar,
  Sparkles,
  Phone,
  Mail,
} from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { PhoneInput } from '@/components/custom-ui/phone-input'
import { useCities } from '@/features/cities/hooks/use-cities'
import { useCountries } from '@/features/countries/hooks/use-countries'
import { useCustomerGroups } from '@/features/customer-groups/hooks/use-customer-groups'
import { useCreateCustomer, useUpdateCustomer } from '../hooks/use-customers'
import { useCustomersContext } from './customers-provider'

const getFormSchema = (t: TFunction) =>
  z.object({
    first_name: z
      .string()
      .min(1, t('customers.validation.firstNameRequired', 'First name is required'))
      .max(100, 'First name must not exceed 100 characters'),
    last_name: z
      .string()
      .min(1, t('customers.validation.lastNameRequired', 'Last name is required'))
      .max(100, 'Last name must not exceed 100 characters'),
    code: z
      .string()
      .max(30, 'Customer code must not exceed 30 characters')
      .optional()
      .or(z.literal('')),
    email: z
      .string()
      .max(200, 'Email must not exceed 200 characters')
      .email(t('customers.validation.invalidEmail', 'Invalid email address'))
      .optional()
      .or(z.literal('')),
    phone: z.string().max(50).optional(),
    address_line1: z.string().max(200).optional(),
    address_line2: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postal_code: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    date_of_birth: z.string().optional(),
    loyalty_points: z.coerce.number().min(0).optional(),
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
  const [activeTab, setActiveTab] = useState<'general' | 'address' | 'loyalty'>('general')

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const formSchema = useMemo(() => getFormSchema(t), [t])

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema) as Resolver<CustomerFormValues>,
    defaultValues: {
      first_name: '',
      last_name: '',
      code: '',
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
    if (isOpen) {
      if (currentRow) {
        form.reset({
          first_name: currentRow.first_name,
          last_name: currentRow.last_name,
          code: currentRow.code || '',
          email: currentRow.email || '',
          phone: currentRow.phone || '',
          address_line1: currentRow.address_line1 || '',
          address_line2: currentRow.address_line2 || '',
          city: currentRow.city || '',
          state: currentRow.state || '',
          postal_code: currentRow.postal_code || '',
          country: currentRow.country || '',
          date_of_birth: currentRow.date_of_birth ? currentRow.date_of_birth.slice(0, 10) : '',
          loyalty_points: currentRow.loyalty_points || 0,
          is_active: currentRow.is_active ?? true,
          group_id: currentRow.group_id || undefined,
        })
      } else {
        form.reset({
          first_name: '',
          last_name: '',
          code: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
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
      setActiveTab('general')
    }
  }, [isOpen, currentRow, form])

  const handleGenerateCode = () => {
    const randomCode = `CUST-${Math.floor(1000 + Math.random() * 9000)}`
    form.setValue('code', randomCode)
  }

  const onSubmit = async (values: CustomerFormValues) => {
    try {
      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.id || (currentRow as unknown as { customer_id: string }).customer_id,
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
      <DialogContent className='max-h-[92vh] overflow-y-auto sm:max-w-[620px] p-0'>
        <DialogHeader className='p-6 pb-2'>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <User className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle>
                {isEdit
                  ? t('customers.editCustomer', 'Edit Customer')
                  : t('customers.createCustomer', 'Create Customer')}
              </DialogTitle>
              <DialogDescription>
                {isEdit
                  ? t('customers.form.editDescription', 'Edit customer details, address, and tier settings.')
                  : t('customers.form.createDescription', 'Add a new customer profile to your database.')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 px-6 pb-6'>
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as typeof activeTab)}
              className='w-full'
            >
              <TabsList className='grid grid-cols-3 w-full mb-4'>
                <TabsTrigger value='general' className='text-xs gap-1.5'>
                  <User className='h-3.5 w-3.5' />
                  <span>{t('customers.tabs.general', 'General')}</span>
                </TabsTrigger>
                <TabsTrigger value='address' className='text-xs gap-1.5'>
                  <MapPin className='h-3.5 w-3.5' />
                  <span>{t('customers.tabs.address', 'Address')}</span>
                </TabsTrigger>
                <TabsTrigger value='loyalty' className='text-xs gap-1.5'>
                  <ShieldCheck className='h-3.5 w-3.5' />
                  <span>{t('customers.tabs.loyalty', 'Loyalty')}</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: General & Contact */}
              <TabsContent value='general' className='space-y-4 focus-visible:outline-none'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='first_name'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('customers.form.firstName', 'First Name')} *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('customers.form.firstNamePlaceholder', 'John')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='last_name'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('customers.form.lastName', 'Last Name')} *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('customers.form.lastNamePlaceholder', 'Doe')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name='code'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('customers.form.code', 'Customer Code')}</FormLabel>
                      <div className='flex gap-2'>
                        <FormControl>
                          <Input
                            placeholder={t('customers.form.codePlaceholder', 'e.g. CUST-1001')}
                            className='font-mono'
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='gap-1 shrink-0'
                          onClick={handleGenerateCode}
                        >
                          <Wand2 className='h-3.5 w-3.5' />
                          <span>{t('customers.form.generateCode', 'Generate')}</span>
                        </Button>
                      </div>
                      <FormDescription className='text-xs'>
                        {t('customers.form.codeHint', 'Unique code used on invoices and order receipts')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='email'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('customers.form.email', 'Email')}</FormLabel>
                        <FormControl>
                          <div className='relative'>
                            <Mail className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
                            <Input
                              type='email'
                              placeholder='customer@example.com'
                              className='ps-9'
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
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

                <FormField
                  control={form.control}
                  name='date_of_birth'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('customers.form.dateOfBirth', 'Date of Birth')}</FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <Calendar className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
                          <Input
                            type='date'
                            className='ps-9'
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Tab 2: Address & Location */}
              <TabsContent value='address' className='space-y-4 focus-visible:outline-none'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='country'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('customers.form.country', 'Country')}</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value)
                            form.setValue('city', '')
                          }}
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
                    control={form.control}
                    name='city'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('customers.form.city', 'City')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
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
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='state'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('customers.form.state', 'State / Province')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('customers.form.statePlaceholder', 'e.g. CA or Ontario')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='postal_code'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('customers.form.postalCode', 'Postal / Zip Code')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('customers.form.postalCodePlaceholder', '90210')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name='address_line1'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('customers.form.addressLine1', 'Address Line 1')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('customers.form.addressLine1Placeholder', 'Street address or P.O. Box')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='address_line2'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('customers.form.addressLine2', 'Address Line 2')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('customers.form.addressLine2Placeholder', 'Apartment, suite, unit, etc.')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Tab 3: Group & Loyalty */}
              <TabsContent value='loyalty' className='space-y-4 focus-visible:outline-none'>
                <CustomerGroupField form={form} />

                <FormField
                  control={form.control}
                  name='loyalty_points'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('customers.form.loyaltyPoints', 'Loyalty Rewards Points')}</FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <Sparkles className='absolute left-3 top-2.5 h-4 w-4 text-amber-500' />
                          <Input
                            type='number'
                            min={0}
                            placeholder='0'
                            className='ps-9'
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormDescription className='text-xs'>
                        {t('customers.form.pointsDesc', 'Current balance of loyalty reward points available for redemption.')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='is_active'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-start space-y-0 space-x-3 rounded-xl border bg-muted/30 p-4'>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className='space-y-1 leading-none'>
                        <FormLabel className='cursor-pointer font-semibold'>
                          {t('customers.form.activeStatus', 'Active Customer Account')}
                        </FormLabel>
                        <FormDescription className='text-xs'>
                          {t(
                            'customers.form.activeDesc',
                            'Active customers participate in the loyalty program, discounts, and order analytics.'
                          )}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className='pt-3 border-t'>
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
                  : t('common.save', 'Save Customer')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function CustomerGroupField({ form }: { form: any }) {
  const { t } = useTranslation()
  const { data: groups, isLoading, isError } = useCustomerGroups()

  return (
    <FormField
      control={form.control}
      name='group_id'
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('customers.form.group', 'Customer Group')}</FormLabel>
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
                          <span className='font-medium'>{group.name}</span>
                          {group.discount_percentage != null &&
                            Number(group.discount_percentage) > 0 && (
                              <span className='text-xs text-emerald-600 font-semibold'>
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
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
