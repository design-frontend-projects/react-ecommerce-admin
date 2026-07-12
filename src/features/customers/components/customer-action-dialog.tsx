import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
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
import { PhoneInput } from '@/components/custom-ui/phone-input'
import { useCities } from '@/features/cities/hooks/use-cities'
import { useCountries } from '@/features/countries/hooks/use-countries'
import { useCustomerGroupsContext } from '@/features/customer-groups/components/customer-groups-provider'
import { useCustomerGroups } from '@/features/customer-groups/hooks/use-customer-groups'
import { useCreateCustomer, useUpdateCustomer } from '../hooks/use-customers'
import { useCustomersContext } from './customers-provider'

const formSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.email('Invalid email address').optional().or(z.literal('')),
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
  group_id: z.coerce.number().optional(),
})

type CustomerFormValues = z.infer<typeof formSchema>

export function CustomerActionDialog() {
  const { open, setOpen, currentRow } = useCustomersContext()
  const { setOpen: setCustomerGroupOpen } = useCustomerGroupsContext()
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()

  const { data: countries } = useCountries()
  const { data: customerGroups } = useCustomerGroups()

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const form = useForm({
    resolver: zodResolver(formSchema),
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
          id: currentRow.customer_id,
          ...values,
        })
        toast.success('Customer updated successfully')
      } else {
        await createMutation.mutateAsync(values)
        toast.success('Customer created successfully')
      }
      setOpen(null)
    } catch (error: unknown) {
      toast.error('Error', {
        description:
          error && error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.',
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Customer' : 'Create Customer'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Edit the customer details below.'
              : 'Add a new customer to your database.'}
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
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder='First Name' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name='last_name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Last Name' {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder='Email' type='email' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name='phone'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
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
                    <FormLabel>Address Line 1</FormLabel>
                    <FormControl>
                      <Input placeholder='Address Line 1' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name='address_line2'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2</FormLabel>
                    <FormControl>
                      <Input placeholder='Address Line 2' {...field} />
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
                    <FormLabel>Country</FormLabel>
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
                          <SelectValue placeholder='Select Country' />
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
                    <FormLabel>City</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                      disabled={!selectedCountryName || cities?.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select City' />
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
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder='State' {...field} />
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
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input placeholder='Postal Code' {...field} />
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
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input
                        type='date'
                        placeholder='Date of Birth'
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
                    <FormLabel>Loyalty Points</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='Loyalty Points'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name='group_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Group</FormLabel>
                    <div className='flex items-center gap-2'>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value ? Number(value) : undefined)
                        }
                        value={field.value ? String(field.value) : undefined}
                      >
                        <FormControl>
                          <SelectTrigger className='flex-1'>
                            <SelectValue placeholder='Select Group' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customerGroups?.map((group) => (
                            <SelectItem
                              key={group.group_id}
                              value={String(group.group_id)}
                            >
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        onClick={() => setCustomerGroupOpen('create')}
                      >
                        <Plus className='h-4 w-4' />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                    <FormLabel>Active Status</FormLabel>
                    <FormDescription>
                      This customer will participate in the loyalty program and
                      have analytics.
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
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
