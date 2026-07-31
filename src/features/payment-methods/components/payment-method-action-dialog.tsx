import { useEffect } from 'react'
import { z } from 'zod'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Check, CreditCard, Hash, Minus, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import {
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
} from '../hooks/use-payment-methods'
import { usePaymentMethodsContext } from './payment-methods-provider'

const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  icon: z.string().optional().or(z.literal('')),
  is_enabled: z.boolean(),
  is_default: z.boolean(),
  sort_order: z.coerce
    .number()
    .int()
    .min(0, { message: 'Sort order must be 0 or greater.' }),
})

type PaymentMethodFormSchema = z.infer<typeof formSchema>

export function PaymentMethodActionDialog() {
  const { open, setOpen, currentRow } = usePaymentMethodsContext()
  const isEdit = open === 'update'

  const createMutation = useCreatePaymentMethod()
  const updateMutation = useUpdatePaymentMethod()

  const form = useForm<PaymentMethodFormSchema>({
    resolver: zodResolver(formSchema) as Resolver<PaymentMethodFormSchema>,
    defaultValues: {
      name: '',
      icon: '',
      is_enabled: true,
      is_default: false,
      sort_order: 0,
    },
  })

  useEffect(() => {
    if (isEdit && currentRow) {
      form.reset({
        name: currentRow.name,
        icon: currentRow.icon ?? '',
        is_enabled: currentRow.is_enabled,
        is_default: currentRow.is_default,
        sort_order: currentRow.sort_order,
      })
    } else {
      form.reset({
        name: '',
        icon: '',
        is_enabled: true,
        is_default: false,
        sort_order: 0,
      })
    }
  }, [isEdit, currentRow, open, form])

  const onSubmit = async (values: PaymentMethodFormSchema) => {
    try {
      const payload = {
        ...values,
        icon: values.icon || null,
      }

      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({ id: currentRow.id, ...payload })
        toast.success('Payment method updated successfully.')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Payment method created successfully.')
      }
      setOpen(null)
      form.reset()
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong.')
    }
  }

  return (
    <Dialog
      open={open === 'create' || open === 'update'}
      onOpenChange={(val) => {
        if (!val) {
          setOpen(null)
          form.reset()
        }
      }}
    >
      <DialogContent className='max-w-sm sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            {isEdit ? (
              <>
                <CreditCard className='h-5 w-5 text-primary' />
                Edit Payment Method
              </>
            ) : (
              'Add Payment Method'
            )}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the payment method details below.'
              : 'Fill in the details to add a new payment method.'}
          </DialogDescription>
        </DialogHeader>

        {isEdit && currentRow && (
          <div className='rounded-lg border bg-muted/40 p-3 space-y-2 text-xs text-muted-foreground'>
            <div className='flex items-center justify-between font-medium text-foreground'>
              <span className='truncate font-semibold text-sm text-foreground flex items-center gap-1.5'>
                {currentRow.name}
                {currentRow.icon && (
                  <span className='text-xs font-mono text-muted-foreground font-normal'>
                    ({currentRow.icon})
                  </span>
                )}
              </span>
              <Badge variant={currentRow.is_enabled ? 'default' : 'secondary'} className='text-[10px] h-5 px-1.5'>
                {currentRow.is_enabled ? (
                  <Check className='mr-1 h-3 w-3' />
                ) : (
                  <Minus className='mr-1 h-3 w-3' />
                )}
                {currentRow.is_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            
            <div className='grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-border/50'>
              <div className='flex items-center gap-1 text-muted-foreground truncate'>
                <Hash className='h-3 w-3 shrink-0' />
                <span className='font-mono truncate' title={currentRow.id}>
                  ID: {currentRow.id}
                </span>
              </div>
              <div className='flex items-center justify-end gap-1.5'>
                {currentRow.is_default && (
                  <Badge variant='default' className='bg-amber-500 hover:bg-amber-600 text-[10px] h-4 px-1'>
                    <Star className='mr-1 h-2.5 w-2.5 fill-current' />
                    Default
                  </Badge>
                )}
                <span className='text-muted-foreground font-mono'>
                  Order: #{currentRow.sort_order}
                </span>
              </div>
            </div>
          </div>
        )}

        <ScrollArea className='-mr-4 h-[350px] pr-4'>
          <Form {...form}>
            <form
              id='payment-method-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
            >
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Cash' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='icon'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='credit-card, banknote, wallet...'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='sort_order'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input type='number' min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='is_enabled'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-base'>Enabled</FormLabel>
                      <div className='text-sm text-muted-foreground'>
                        Determine if this payment method can be used.
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
              <FormField
                control={form.control}
                name='is_default'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-base'>Default</FormLabel>
                      <div className='text-sm text-muted-foreground'>
                        Set as the default payment method.
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
            </form>
          </Form>
        </ScrollArea>
        <DialogFooter>
          <Button
            type='submit'
            form='payment-method-form'
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {isEdit ? 'Save changes' : 'Create Payment Method'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
