import { z } from 'zod'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useSuppliers } from '@/features/suppliers/hooks/use-suppliers'
import {
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
} from '../hooks/use-purchase-orders'
import { usePOContext } from './purchase-orders-provider'

const formSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier is required'),
  order_date: z.string().min(1, 'Order date is required'),
  expected_delivery_date: z.string().optional().nullish(),
  status: z.string().min(1, 'Status is required'),
  notes: z.string().optional().nullish(),
  total_amount: z.coerce.number().min(0, 'Amount must be positive'),
})

type POFormValues = z.infer<typeof formSchema>

export function POActionDialog() {
  const { open, setOpen, currentRow } = usePOContext()
  const { data: suppliers } = useSuppliers()
  const createMutation = useCreatePurchaseOrder()
  const updateMutation = useUpdatePurchaseOrder()
  const queryClient = useQueryClient()

  const form = useForm<POFormValues>({
    resolver: zodResolver(formSchema) as Resolver<POFormValues>,
    defaultValues: {
      supplier_id: currentRow?.supplier_id.toString() || '',
      order_date: currentRow?.order_date
        ? new Date(currentRow.order_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      expected_delivery_date: currentRow?.expected_delivery_date || '',
      status: currentRow?.status || 'Pending',
      notes: currentRow?.notes || '',
      total_amount: currentRow?.total_amount || 0,
    },
  })

  const onSubmit = async (values: POFormValues) => {
    try {
      if (currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.po_id,
          ...values,
          supplier_id: parseInt(values.supplier_id),
          expected_delivery_date: values.expected_delivery_date ?? undefined,
          notes: values.notes ?? undefined,
        })
        toast.success('Purchase Order updated successfully!')
      } else {
        await createMutation.mutateAsync({
          ...values,
          supplier_id: parseInt(values.supplier_id),
          expected_delivery_date: values.expected_delivery_date ?? undefined,
          notes: values.notes ?? undefined,
        })
        toast.success('Purchase Order created successfully!')
      }
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      setOpen(null)
      form.reset()
    } catch (error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error(error)
      }
      toast.error('Failed to save purchase order.')
    }
  }

  return (
    <Dialog
      open={open === 'create' || open === 'edit'}
      onOpenChange={(v) => !v && setOpen(null)}
    >
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>
            {currentRow ? 'Edit' : 'Create'} Purchase Order
          </DialogTitle>
          <DialogDescription>
            {currentRow
              ? 'Update the details of the purchase order.'
              : 'Add a new purchase order to the system.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='supplier_id'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select a supplier' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers?.map((s) => (
                        <SelectItem
                          key={s.supplier_id}
                          value={s.supplier_id.toString()}
                        >
                          {s.name}
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
                name='order_date'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Date</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='expected_delivery_date'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Delivery</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='status'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select status' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='Pending'>Pending</SelectItem>
                        <SelectItem value='Sent'>Sent</SelectItem>
                        <SelectItem value='Completed'>Completed</SelectItem>
                        <SelectItem value='Cancelled'>Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='total_amount'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount</FormLabel>
                    <FormControl>
                      <Input type='number' step='0.01' {...field} />
                    </FormControl>
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type='submit'
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
