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
import { useCreateSupplier, useUpdateSupplier } from '../hooks/use-suppliers'
import { useSuppliersContext } from './suppliers-provider'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contact_person: z.string().optional(),
  email: z.email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(), // Could add url validation but keeping simple for now
  notes: z.string().optional(),
})

type SupplierFormValues = z.infer<typeof formSchema>

export function SupplierActionDialog() {
  const { open, setOpen, currentRow } = useSuppliersContext()
  const createMutation = useCreateSupplier()
  const updateMutation = useUpdateSupplier()

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      notes: '',
    },
  })

  useEffect(() => {
    if (currentRow) {
      form.reset({
        name: currentRow.name,
        contact_person: currentRow.contact_person || '',
        email: currentRow.email || '',
        phone: currentRow.phone || '',
        address: currentRow.address || '',
        website: currentRow.website || '',
        notes: currentRow.notes || '',
      })
    } else {
      form.reset({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        website: '',
        notes: '',
      })
    }
  }, [currentRow, form])

  const onSubmit = async (values: SupplierFormValues) => {
    try {
      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.supplier_id,
          ...values,
        })
        toast.success('Supplier updated successfully')
      } else {
        await createMutation.mutateAsync(values)
        toast.success('Supplier created successfully')
      }
      setOpen(null)
    } catch (error: unknown) {
      toast.error('Error', {
        description:
          (error as Error)?.message ||
          'Something went wrong. Please try again.',
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-150'>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Supplier' : 'Create Supplier'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Edit the supplier details below.'
              : 'Add a new supplier to your inventory.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='grid gap-4 py-4'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder='Supplier Name' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='contact_person'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl>
                    <Input placeholder='Contact Person' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='grid grid-cols-2 gap-4'>
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
            <FormField
              control={form.control}
              name='website'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder='https://example.com' {...field} />
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder='Additional notes' {...field} />
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
