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
import { Switch } from '@/components/ui/switch'
import { useCreateTaxRate, useUpdateTaxRate } from '../hooks/use-tax-rates'
import { useTaxContext } from './tax-rates-provider'

const formSchema = z.object({
  tax_type: z.string().min(1, 'Tax type is required'),
  rate: z.coerce.number().min(0, 'Rate must be positive'),
  country_code: z.string().min(1, 'Country code is required').max(2),
  state_province: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  effective_from: z.string().min(1, 'Effective date is required'),
  effective_to: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
})

type TaxFormValues = z.infer<typeof formSchema>

export function TaxActionDialog() {
  const { open, setOpen, currentRow } = useTaxContext()
  const createMutation = useCreateTaxRate()
  const updateMutation = useUpdateTaxRate()

  })

  useEffect(() => {
    if (currentRow) {
      form.reset({
        tax_type: currentRow.tax_type,
        rate: currentRow.rate,
        country_code: currentRow.country_code,
        state_province: currentRow.state_province || '',
        description: currentRow.description || '',
        effective_from: currentRow.effective_from,
        effective_to: currentRow.effective_to || '',
        is_active: currentRow.is_active,
      })
    } else {
      form.reset({
        tax_type: '',
        rate: 0,
        country_code: '',
        state_province: '',
        description: '',
        effective_from: new Date().toISOString().split('T')[0],
        effective_to: '',
        is_active: true,
      })
    }
  }, [currentRow, form])

  const onSubmit = async (values: TaxFormValues) => {
    try {
      if (currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.tax_rate_id,
          ...values,
        })
        toast.success('Tax rate updated successfully')
      } else {
        await createMutation.mutateAsync(values)
        toast.success('Tax rate created successfully')
      }
      setOpen(null)
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'Something went wrong. Please try again.',
      })
    }
  }

  return (
    <Dialog
      open={open === 'create' || open === 'edit'}
      onOpenChange={(v) => !v && setOpen(null)}
    >
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>{currentRow ? 'Edit' : 'Create'} Tax Rate</DialogTitle>
          <DialogDescription>
            {currentRow
              ? 'Update the tax rate details.'
              : 'Add a new tax rate to the system.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='tax_type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Type</FormLabel>
                  <FormControl>
                    <Input placeholder='VAT, Sales Tax, etc.' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='rate'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate (%)</FormLabel>
                    <FormControl>
                      <Input type='number' step='0.01' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='country_code'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country Code</FormLabel>
                    <FormControl>
                      <Input placeholder='US, UK, etc.' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name='state_province'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State/Province</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='effective_from'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective From</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='effective_to'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective To</FormLabel>
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
                    <FormLabel>Is Active</FormLabel>
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
