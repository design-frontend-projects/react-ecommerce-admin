import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { useCreateCustomer } from '@/features/customers/hooks/use-customers'

const quickCustomerSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().max(50).optional().or(z.literal('')),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
})

type QuickCustomerFormValues = z.infer<typeof quickCustomerSchema>

interface PosQuickCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCustomerCreated: (customer: {
    id: string
    first_name: string
    last_name: string
    email?: string | null
    phone?: string | null
  }) => void
}

export function PosQuickCustomerDialog({
  open,
  onOpenChange,
  onCustomerCreated,
}: PosQuickCustomerDialogProps) {
  const { t } = useTranslation()
  const createCustomerMutation = useCreateCustomer()

  const form = useForm<QuickCustomerFormValues>({
    resolver: zodResolver(quickCustomerSchema) as any,
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
    },
  })

  const onSubmit = async (values: QuickCustomerFormValues) => {
    try {
      const result = await createCustomerMutation.mutateAsync({
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone || undefined,
        email: values.email || undefined,
      })

      if (result) {
        toast.success(
          t('pos.quickCustomer.createdToast', 'Customer {{name}} created', {
            name: `${values.first_name} ${values.last_name}`,
          })
        )
        onCustomerCreated({
          id: String(result.id),
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email || null,
          phone: values.phone || null,
        })
        form.reset()
      }
    } catch (err: any) {
      toast.error(
        err.message ||
          t('pos.quickCustomer.failedCreate', 'Failed to create customer')
      )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) form.reset()
        onOpenChange(v)
      }}
    >
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary/10'>
              <UserPlus className='h-4 w-4 text-primary' />
            </div>
            <div>
              <DialogTitle className='text-sm font-bold'>
                {t('pos.quickCustomer.title', 'Quick Add Customer')}
              </DialogTitle>
              <DialogDescription className='text-xs'>
                {t(
                  'pos.quickCustomer.desc',
                  'Create a new customer for this sale.'
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-3'>
            <div className='grid grid-cols-2 gap-3'>
              <FormField
                control={form.control}
                name='first_name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs'>
                      {t('pos.quickCustomer.firstName', 'First Name *')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder='John'
                        className='h-9 text-sm'
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage className='text-[10px]' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='last_name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs'>
                      {t('pos.quickCustomer.lastName', 'Last Name *')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder='Doe'
                        className='h-9 text-sm'
                      />
                    </FormControl>
                    <FormMessage className='text-[10px]' />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='phone'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs'>
                    {t('pos.quickCustomer.phone', 'Phone')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder='+1 (555) 000-0000'
                      className='h-9 text-sm'
                    />
                  </FormControl>
                  <FormMessage className='text-[10px]' />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs'>
                    {t('pos.quickCustomer.email', 'Email')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type='email'
                      placeholder='john@example.com'
                      className='h-9 text-sm'
                    />
                  </FormControl>
                  <FormMessage className='text-[10px]' />
                </FormItem>
              )}
            />

            <DialogFooter className='gap-2 sm:gap-0 pt-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => {
                  form.reset()
                  onOpenChange(false)
                }}
              >
                {t('pos.quickCustomer.cancel', 'Cancel')}
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={createCustomerMutation.isPending}
                className='gap-1.5'
              >
                {createCustomerMutation.isPending ? (
                  <>
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                    {t('pos.quickCustomer.creating', 'Creating...')}
                  </>
                ) : (
                  <>
                    <UserPlus className='h-3.5 w-3.5' />
                    {t('pos.quickCustomer.saveCustomer', 'Create & Select')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
