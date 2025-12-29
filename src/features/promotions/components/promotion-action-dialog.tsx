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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useCreatePromotion, useUpdatePromotion } from '../hooks/use-promotions'
import { usePromotionsContext } from './promotions-provider'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
  discount_type: z.string().min(1, 'Discount type is required'),
  discount_value: z.coerce.number().min(0, 'Discount value must be positive'),
  minimum_purchase: z.coerce
    .number()
    .min(0, 'Minimum purchase must be positive'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_active: z.boolean().default(true),
  usage_limit: z.coerce.number().optional(),
  usage_per_customer: z.coerce.number().optional(),
})

type PromotionFormValues = z.infer<typeof formSchema>

export function PromotionActionDialog() {
  const { open, setOpen, currentRow } = usePromotionsContext()
  const createMutation = useCreatePromotion()
  const updateMutation = useUpdatePromotion()

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      minimum_purchase: 0,
      start_date: '',
      end_date: '',
      is_active: true,
      usage_limit: undefined,
      usage_per_customer: 1,
    },
  })

  useEffect(() => {
    if (currentRow) {
      form.reset({
        name: currentRow.name,
        code: currentRow.code,
        description: currentRow.description || '',
        discount_type: currentRow.discount_type,
        discount_value: currentRow.discount_value,
        minimum_purchase: currentRow.minimum_purchase,
        start_date: currentRow.start_date
          ? new Date(currentRow.start_date).toISOString().split('T')[0]
          : '',
        end_date: currentRow.end_date
          ? new Date(currentRow.end_date).toISOString().split('T')[0]
          : '',
        is_active: currentRow.is_active,
        usage_limit: currentRow.usage_limit || undefined,
        usage_per_customer: currentRow.usage_per_customer || undefined,
      })
    } else {
      form.reset({
        name: '',
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 0,
        minimum_purchase: 0,
        start_date: '',
        end_date: '',
        is_active: true,
        usage_limit: undefined,
        usage_per_customer: 1,
      })
    }
  }, [currentRow, form])

  const onSubmit = async (values: PromotionFormValues) => {
    try {
      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.promotion_id,
          ...values,
        })
        toast.success('Promotion updated successfully')
      } else {
        await createMutation.mutateAsync(values)
        toast.success('Promotion created successfully')
      }
      setOpen(null)
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'Something went wrong. Please try again.',
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Promotion' : 'Create Promotion'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Edit the promotion details below.'
              : 'Add a new promotion to your database.'}
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
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promotion Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Holiday Sale' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='code'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promo Code</FormLabel>
                    <FormControl>
                      <Input placeholder='SAVE20' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Promotion description...'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='discount_type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select type' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='percentage'>Percentage</SelectItem>
                        <SelectItem value='fixed'>Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='discount_value'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl>
                      <Input type='number' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='start_date'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} />
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
                      <Input type='date' {...field} />
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
                      Enable or disable this promotion.
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
