```typescript
import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
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
import { Switch } from '@/components/ui/switch'
import { useCreatePriceList, useUpdatePriceList } from '../hooks/use-price-list'
import { usePriceListContext } from './price-list-provider'

const formSchema = z.object({
  product_id: z.coerce.number().min(1, 'Product is required'),
  group_id: z.coerce.number().optional().nullable(),
  price: z.coerce.number().min(0, 'Price must be positive'),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
})

type PriceListFormValues = z.infer<typeof formSchema>

export function PriceListActionDialog() {
  const { open, setOpen, currentRow } = usePriceListContext()
  const createMutation = useCreatePriceList()
  const updateMutation = useUpdatePriceList()
  const queryClient = useQueryClient()

  const { data: products } = useQuery({
    queryKey: ['products-minimal'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('product_id, name')
        .order('name')
      if (error) throw error
      return data
    },
  })

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const form = useForm<PriceListFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_id: 0,
      group_id: null,
      price: 0,
      start_date: '',
      end_date: '',
      is_active: true,
    },
  })

  useEffect(() => {
    if (currentRow) {
      form.reset({
        product_id: currentRow.product_id,
        group_id: currentRow.group_id,
        price: currentRow.price,
        start_date: currentRow.start_date || '',
        end_date: currentRow.end_date || '',
        is_active: currentRow.is_active,
      })
    } else {
      form.reset({
        product_id: 0,
        group_id: null,
        price: 0,
        start_date: '',
        end_date: '',
        is_active: true,
      })
    }
  }, [currentRow, form])

  const onSubmit = async (values: PriceListFormValues) => {
    try {
      if (currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.price_list_id,
          ...values,
          group_id: values.group_id ?? undefined,
          start_date: values.start_date ?? undefined,
          end_date: values.end_date ?? undefined
        })
        toast('Price updated successfully')
      } else {
        await createMutation.mutateAsync({
          ...values,
          group_id: values.group_id ?? undefined,
          start_date: values.start_date ?? undefined,
          end_date: values.end_date ?? undefined
        })
        toast('Price created successfully')
      }
      queryClient.invalidateQueries({ queryKey: ['price-lists'] })
      setOpen(null)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Price' : 'Add Price'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Edit the price details below.'
              : 'Add a new price rule to your database.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='grid gap-4 py-4'
          >
            <FormField
              control={form.control}
              name='product_id'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v))}
                    value={field.value.toString()}
                    disabled={isEdit}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select product' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products?.map((p) => (
                        <SelectItem
                          key={p.product_id}
                          value={p.product_id.toString()}
                        >
                          {p.name}
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
              name='price'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input type='number' step='0.01' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='start_date'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='end_date'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name='is_active'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                  <div className='space-y-0.5'>
                    <FormLabel>Active Status</FormLabel>
                    <div className='text-[0.8rem] text-muted-foreground'>
                      Enable or disable this price rule.
                    </div>
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
