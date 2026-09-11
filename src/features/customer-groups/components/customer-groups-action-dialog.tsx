import { useEffect } from 'react'
import { z } from 'zod'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { type TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DollarSign, Percent, Users } from 'lucide-react'
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
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  useCreateCustomerGroup,
  useUpdateCustomerGroup,
} from '../hooks/use-customer-groups'
import { useCustomerGroupsContext } from './customer-groups-provider'

const formSchema = (t: TFunction) =>
  z.object({
    name: z
      .string()
      .min(1, t('customerGroups.validation.nameRequired'))
      .max(100, 'Name must not exceed 100 characters'),
    description: z.string().optional(),
    minimum_order_amount: z.coerce
      .number()
      .min(0, 'Minimum order amount cannot be negative')
      .optional(),
    discount_percentage: z.coerce
      .number()
      .min(0, 'Discount cannot be negative')
      .max(100, 'Discount cannot exceed 100%')
      .optional(),
  })

type CustomerGroupFormValues = z.infer<ReturnType<typeof formSchema>>

const defaultValues: CustomerGroupFormValues = {
  name: '',
  description: '',
  minimum_order_amount: 0,
  discount_percentage: 0,
}

const DISCOUNT_PRESETS = [0, 5, 10, 15, 20, 25]

export function CustomerGroupsActionDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow, setCurrentRow } = useCustomerGroupsContext()
  const createMutation = useCreateCustomerGroup()
  const updateMutation = useUpdateCustomerGroup()

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const form = useForm<CustomerGroupFormValues>({
    resolver: zodResolver(formSchema(t)) as Resolver<CustomerGroupFormValues>,
    defaultValues,
  })

  useEffect(() => {
    if (isOpen) {
      if (isEdit && currentRow) {
        form.reset({
          name: currentRow.name,
          description: currentRow.description || '',
          minimum_order_amount: Number(currentRow.minimum_order_amount) || 0,
          discount_percentage: Number(currentRow.discount_percentage) || 0,
        })
      } else {
        form.reset(defaultValues)
      }
    }
  }, [isOpen, isEdit, currentRow, form])

  const handleClose = () => {
    setOpen(null)
    setCurrentRow(null)
    form.reset(defaultValues)
  }

  const onSubmit = async (values: CustomerGroupFormValues) => {
    try {
      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.id || currentRow.group_id!,
          ...values,
        })
        toast.success(t('customerGroups.toast.updated'))
      } else {
        await createMutation.mutateAsync(values)
        toast.success(t('customerGroups.toast.created'))
      }
      handleClose()
    } catch (error: unknown) {
      toast.error(t('customerGroups.toast.error'), {
        description:
          error instanceof Error
            ? error.message
            : t('customerGroups.toast.genericError'),
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[540px]'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Users className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle>
                {isEdit
                  ? t('customerGroups.editGroup')
                  : t('customerGroups.createGroup')}
              </DialogTitle>
              <DialogDescription>
                {isEdit
                  ? t('customerGroups.editGroupDesc')
                  : t('customerGroups.createGroupDesc')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 py-2'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('customerGroups.form.name')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('customerGroups.form.placeholderName')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('customerGroups.form.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('customerGroups.form.placeholderDescription')}
                      rows={3}
                      className='resize-none'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='minimum_order_amount'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('customerGroups.form.minOrderAmount')}
                    </FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <DollarSign className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
                        <Input
                          type='number'
                          placeholder='0.00'
                          step='0.01'
                          className='ps-9'
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='discount_percentage'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customerGroups.form.discount')}</FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Percent className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
                        <Input
                          type='number'
                          placeholder='0'
                          step='0.5'
                          min={0}
                          max={100}
                          className='ps-9'
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Quick Discount Presets */}
            <div className='rounded-lg border bg-muted/40 p-3 space-y-2'>
              <div className='flex items-center justify-between text-xs text-muted-foreground font-medium'>
                <span>{t('customerGroups.form.discountPresets')}</span>
                <span className='text-xs text-muted-foreground'>
                  {form.watch('discount_percentage') || 0}%
                </span>
              </div>
              <div className='flex flex-wrap gap-1.5'>
                {DISCOUNT_PRESETS.map((preset) => (
                  <Badge
                    key={preset}
                    variant={form.watch('discount_percentage') === preset ? 'default' : 'outline'}
                    className='cursor-pointer px-2.5 py-1 text-xs transition-colors hover:bg-primary/80 hover:text-primary-foreground'
                    onClick={() => form.setValue('discount_percentage', preset)}
                  >
                    {preset}%
                  </Badge>
                ))}
              </div>
            </div>

            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={handleClose}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {t('customerGroups.form.cancel')}
              </Button>
              <Button
                type='submit'
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t('customerGroups.form.saving')
                  : t('customerGroups.form.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
