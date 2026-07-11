import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { type TFunction } from 'i18next'
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

const formSchema = (t: TFunction) =>
  z.object({
    name: z.string().min(1, t('customerGroups.validation.nameRequired')),
    description: z.string().optional(),
    minimum_order_amount: z.coerce.number().optional(),
    discount_percentage: z.coerce.number().optional(),
  })

type CustomerGroupFormValues = z.infer<ReturnType<typeof formSchema>>

export function CustomerGroupsActionDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useCustomerGroupsContext()
  const createMutation = useCreateCustomerGroup()
  const updateMutation = useUpdateCustomerGroup()

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const form = useForm<CustomerGroupFormValues>({
    resolver: zodResolver(formSchema(t)),
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
        toast.success(t('customerGroups.toast.updated'))
      } else {
        await createMutation.mutateAsync(values)
        toast.success(t('customerGroups.toast.created'))
      }
      setOpen(null)
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
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[500px]'>
        <DialogHeader>
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
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('customerGroups.form.description')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(
                        'customerGroups.form.placeholderDescription'
                      )}
                      {...field}
                    />
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
                    <FormLabel>
                      {t('customerGroups.form.minOrderAmount')}
                    </FormLabel>
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
                    <FormLabel>{t('customerGroups.form.discount')}</FormLabel>
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
