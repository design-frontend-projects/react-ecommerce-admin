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
import {
  useCreateCustomerGroup,
  useUpdateCustomerGroup,
} from '../hooks/use-customer-groups'
import { useCustomerGroupsContext } from './customer-groups-provider'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  minimum_order_amount: z.coerce.number().optional(),
  discount_percentage: z.coerce.number().optional(),
})

type CustomerGroupFormValues = z.infer<typeof formSchema>

export function CustomerGroupsActionDialog() {
  const { open, setOpen, currentRow } = useCustomerGroupsContext()
  const createMutation = useCreateCustomerGroup()
  const updateMutation = useUpdateCustomerGroup()

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      minimum_order_amount: 0,
      discount_percentage: 0,
    },
  })

  useEffect(() => {
    if (currentRow) {
      form.reset({
        name: currentRow.name,
        description: currentRow.description || '',
        minimum_order_amount: currentRow.minimum_order_amount || 0,
        discount_percentage: currentRow.discount_percentage || 0,
      })
    } else {
      form.reset({
        name: '',
        description: '',
        minimum_order_amount: 0,
        discount_percentage: 0,
      })
    }
  }, [currentRow, form])

  const onSubmit = async (values: CustomerGroupFormValues) => {
    try {
      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.group_id,
          ...values,
        })
        toast.success('Customer group updated successfully')
      } else {
        await createMutation.mutateAsync(values)
        toast.success('Customer group created successfully')
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
          <DialogTitle>
            {isEdit ? 'Edit Customer Group' : 'Create Customer Group'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Edit the customer group details below.'
              : 'Add a new customer group.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='grid gap-4 py-4'
          >
            <FormField
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder='Group Name' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder='Description' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                name='minimum_order_amount'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Order Amount</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='0.00'
                        step='0.01'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name='discount_percentage'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount %</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='0'
                        step='0.01'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setOpen(null)
                  form.reset()
                }}
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
