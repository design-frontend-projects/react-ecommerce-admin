import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  channelFormSchema,
  type ChannelFormData,
} from '../data/schema'
import { useCreateChannel, useUpdateChannel } from '../hooks/use-channels'
import { useChannelsContext } from './channels-provider'

export function ChannelActionDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useChannelsContext()
  const isEdit = open === 'update'

  const createMutation = useCreateChannel()
  const updateMutation = useUpdateChannel()
  const isPending = createMutation.isPending || updateMutation.isPending

  const form = useForm<ChannelFormData>({
    resolver: zodResolver(channelFormSchema),
    defaultValues: {
      code: '',
      name: '',
      name_ar: '',
      description: '',
      is_active: true,
    },
  })

  useEffect(() => {
    if (open === 'update' && currentRow) {
      form.reset({
        code: currentRow.code || '',
        name: currentRow.name || '',
        name_ar: currentRow.name_ar || '',
        description: currentRow.description || '',
        is_active: currentRow.is_active ?? true,
      })
    } else if (open === 'create') {
      form.reset({
        code: '',
        name: '',
        name_ar: '',
        description: '',
        is_active: true,
      })
    }
  }, [open, currentRow, form])

  const onSubmit = async (values: ChannelFormData) => {
    try {
      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.id,
          ...values,
        })
        toast.success(
          t('channels.notifications.updateSuccess', {
            defaultValue: 'Sales channel updated successfully.',
          })
        )
      } else {
        await createMutation.mutateAsync(values)
        toast.success(
          t('channels.notifications.createSuccess', {
            defaultValue: 'Sales channel created successfully.',
          })
        )
      }
      setOpen(null)
      form.reset()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An error occurred while saving.'
      toast.error(message)
    }
  }

  return (
    <Dialog
      open={open === 'create' || open === 'update'}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setOpen(null)
          form.reset()
        }
      }}
    >
      <DialogContent className='max-w-md sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('channels.dialog.editTitle', { defaultValue: 'Edit Sales Channel' })
              : t('channels.dialog.createTitle', { defaultValue: 'New Sales Channel' })}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t('channels.dialog.editDesc', {
                  defaultValue: 'Update channel details and ordering settings.',
                })
              : t('channels.dialog.createDesc', {
                  defaultValue: 'Add a new sales or distribution channel (e.g. POS, Online, App).',
                })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='channel-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            <ScrollArea className='max-h-[60vh] pr-3'>
              <div className='space-y-4 py-1'>
                <FormField
                  control={form.control}
                  name='code'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('channels.fields.code', { defaultValue: 'Channel Code' })} *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g. ONLINE, POS, JAHEZ'
                          className='font-mono uppercase'
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {t('channels.fields.codeHelp', {
                          defaultValue: 'Unique code used across sales, invoices, and pricing.',
                        })}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <FormField
                    control={form.control}
                    name='name'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('channels.fields.name', { defaultValue: 'Channel Name (EN)' })} *
                        </FormLabel>
                        <FormControl>
                          <Input placeholder='e.g. Online Store' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='name_ar'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('channels.fields.nameAr', { defaultValue: 'Channel Name (AR)' })}
                        </FormLabel>
                        <FormControl>
                          <Input
                            dir='rtl'
                            placeholder='مثال: المتجر الإلكتروني'
                            {...field}
                            value={field.value || ''}
                          />
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
                      <FormLabel>
                        {t('channels.fields.description', { defaultValue: 'Description' })}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='Optional details about this channel...'
                          className='resize-none'
                          rows={3}
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='is_active'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4 shadow-xs'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-base'>
                          {t('channels.fields.isActive', { defaultValue: 'Active Status' })}
                        </FormLabel>
                        <FormDescription>
                          {t('channels.fields.isActiveHelp', {
                            defaultValue: 'Enable this channel for selection in POS, orders, and price lists.',
                          })}
                        </FormDescription>
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
              </div>
            </ScrollArea>
          </form>
        </Form>

        <DialogFooter className='gap-2 sm:gap-0'>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              setOpen(null)
              form.reset()
            }}
            disabled={isPending}
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button type='submit' form='channel-form' disabled={isPending}>
            {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {isEdit
              ? t('common.saveChanges', { defaultValue: 'Save changes' })
              : t('channels.dialog.createBtn', { defaultValue: 'Create Channel' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
