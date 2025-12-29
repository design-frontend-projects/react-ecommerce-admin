import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
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
import { Textarea } from '@/components/ui/textarea'
import { PhoneInput } from '@/components/custom-ui/phone-input'
import { useCreateCustomer, useUpdateCustomer } from '../hooks/use-customers'
import { useCustomersContext } from './customers-provider'

const formSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
})

type CustomerFormValues = z.infer<typeof formSchema>

export function CustomerActionDialog() {
  const { open, setOpen, currentRow } = useCustomersContext()
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
    },
  })

  useEffect(() => {
    if (currentRow) {
      form.reset({
        first_name: currentRow.first_name,
        last_name: currentRow.last_name,
        email: currentRow.email || '',
        phone: currentRow.phone || '',
        address: currentRow.address || '',
      })
    } else {
      form.reset({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
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
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[425px]'>
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
                control={form.control}
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
                control={form.control}
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
            <FormField
              control={form.control}
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
              control={form.control}
              name='phone'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <PhoneInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='address'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder='Address' {...field} />
                  </FormControl>
                  <FormMessage />
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
