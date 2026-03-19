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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { useCreateCurrency, useUpdateCurrency } from '../hooks/use-currencies'
import { useCurrenciesContext } from './currencies-provider'

const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  code: z
    .string()
    .min(1, { message: 'Code is required.' })
    .max(3, { message: 'Code must be at most 3 characters.' }),
  symbol: z
    .string()
    .min(1, { message: 'Symbol is required.' })
    .max(5, { message: 'Symbol must be at most 5 characters.' }),
  is_active: z.boolean(),
})

type CurrencyFormSchema = z.infer<typeof formSchema>

export function CurrencyActionDialog() {
  const { open, setOpen, currentRow } = useCurrenciesContext()
  const isEdit = open === 'update'

  const createMutation = useCreateCurrency()
  const updateMutation = useUpdateCurrency()

  const form = useForm<CurrencyFormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues:
      isEdit && currentRow
        ? {
            name: currentRow.name,
            code: currentRow.code,
            symbol: currentRow.symbol,
            is_active: currentRow.is_active,
          }
        : {
            name: '',
            code: '',
            symbol: '',
            is_active: true,
          },
  })

  const onSubmit = async (values: CurrencyFormSchema) => {
    try {
      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({ id: currentRow.id, ...values })
        toast.success('Currency updated successfully.')
      } else {
        await createMutation.mutateAsync(values)
        toast.success('Currency created successfully.')
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
          <DialogTitle>{isEdit ? 'Edit Currency' : 'Add Currency'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the currency details below.'
              : 'Fill in the details to add a new currency.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className='-mr-4 h-[300px] pr-4'>
          <Form {...form}>
            <form
              id='currency-form'
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
                      <Input placeholder='US Dollar' {...field} />
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
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder='USD' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='symbol'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symbol</FormLabel>
                    <FormControl>
                      <Input placeholder='$' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='is_active'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-base'>Active</FormLabel>
                      <div className='text-sm text-muted-foreground'>
                        Determine if this currency can be used.
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
            form='currency-form'
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {isEdit ? 'Save changes' : 'Create Currency'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
