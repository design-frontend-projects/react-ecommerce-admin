import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { useCustomers } from '@/features/customers/hooks/use-customers'
import {
  useCreateCustomerCard,
  useUpdateCustomerCard,
} from '../hooks/use-customer-cards'
import { useCustomerCardsContext } from './customer-cards-provider'

const formSchema = z.object({
  customer_id: z.coerce.number().min(1, 'Customer is required'),
  cardholder_name: z.string().min(1, 'Cardholder name is required'),
  card_type: z.string().optional(),
  last_four_digits: z.string().length(4, 'Must be 4 digits'),
  expiry_month: z.coerce.number().min(1).max(12),
  expiry_year: z.coerce.number().min(2025).max(2100),
  billing_address: z.string().optional(),
  is_default: z.boolean().default(false),
})

type CustomerCardFormValues = z.infer<typeof formSchema>

export function CustomerCardsActionDialog() {
  const { open, setOpen, currentRow } = useCustomerCardsContext()
  const createMutation = useCreateCustomerCard()
  const updateMutation = useUpdateCustomerCard()
  const { data: customers } = useCustomers()

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_id: 0,
      cardholder_name: '',
      card_type: '',
      last_four_digits: '',
      expiry_month: 1,
      expiry_year: 2025,
      billing_address: '',
      is_default: false,
    },
  })

  useEffect(() => {
    if (currentRow) {
      form.reset({
        customer_id: currentRow.customer_id,
        cardholder_name: currentRow.cardholder_name,
        card_type: currentRow.card_type || '',
        last_four_digits: currentRow.last_four_digits,
        expiry_month: currentRow.expiry_month,
        expiry_year: currentRow.expiry_year,
        billing_address: currentRow.billing_address || '',
        is_default: currentRow.is_default || false,
      })
    } else {
      form.reset({
        customer_id: 0,
        cardholder_name: '',
        card_type: '',
        last_four_digits: '',
        expiry_month: new Date().getMonth() + 1,
        expiry_year: new Date().getFullYear(),
        billing_address: '',
        is_default: false,
      })
    }
  }, [currentRow, form])

  const onSubmit = async (values: CustomerCardFormValues) => {
    try {
      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.card_id,
          ...values,
        })
        toast.success('Card updated successfully')
      } else {
        await createMutation.mutateAsync(values)
        toast.success('Card created successfully')
      }
      setOpen(null)
    } catch (error: unknown) {
      toast.error('Error', {
        description:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.',
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Card' : 'Add New Card'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Edit the card details below.'
              : 'Add a new card for a customer.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='grid gap-4 py-4'
          >
            <FormField
              name='customer_id'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={
                      field.value ? field.value.toString() : undefined
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select a customer' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem
                          key={customer.customer_id}
                          value={customer.customer_id.toString()}
                        >
                          {customer.first_name} {customer.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name='cardholder_name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cardholder Name</FormLabel>
                  <FormControl>
                    <Input placeholder='Name on Card' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                name='card_type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Type</FormLabel>
                    <FormControl>
                      <Input placeholder='Visa, MasterCard' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name='last_four_digits'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last 4 Digits</FormLabel>
                    <FormControl>
                      <Input placeholder='1234' maxLength={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                name='expiry_month'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Month</FormLabel>
                    <FormControl>
                      <Input type='number' min={1} max={12} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name='expiry_year'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Year</FormLabel>
                    <FormControl>
                      <Input type='number' min={2025} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              name='billing_address'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Address</FormLabel>
                  <FormControl>
                    <Input placeholder='Address' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name='is_default'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>Default Card</FormLabel>
                    <FormDescription>
                      Set as default payment method.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
