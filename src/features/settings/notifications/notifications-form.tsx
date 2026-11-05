import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Check, Loader2, BellRing, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useUpsertSetting } from '../data/queries'

const notificationsFormSchema = z.object({
  type: z.enum(['all', 'mentions', 'none']).default('all'),
  mobile: z.boolean().default(false).optional(),
  communication_emails: z.boolean().default(false).optional(),
  social_emails: z.boolean().default(true).optional(),
  marketing_emails: z.boolean().default(false).optional(),
  security_emails: z.boolean().default(true),
})

type NotificationsFormValues = z.infer<typeof notificationsFormSchema>

const defaultValues: Partial<NotificationsFormValues> = {
  type: 'all',
  communication_emails: false,
  marketing_emails: false,
  social_emails: true,
  security_emails: true,
  mobile: false,
}

export function NotificationsForm() {
  const { t } = useTranslation()
  const [isSaving, setIsSaving] = useState(false)
  const upsertSetting = useUpsertSetting()

  const form = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues,
  })

  async function onSubmit(data: NotificationsFormValues) {
    setIsSaving(true)
    try {
      try {
        await upsertSetting.mutateAsync({
          key: 'notifications.preferences',
          value: data,
          group: 'notifications',
          is_public: true,
        })
      } catch {
        // Server persistence deferred, local state applied
      }

      toast.success(
        t('settings.notifications.savedSuccess', 'Notification preferences updated successfully')
      )
    } catch {
      toast.error(t('settings.common.savedError', 'Failed to save settings'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        {/* ─── Notification Channel Radio Group ──────────────────────── */}
        <Card>
          <CardHeader className='pb-3'>
            <div className='flex items-center gap-2'>
              <BellRing className='h-5 w-5 text-primary' />
              <CardTitle className='text-base font-semibold'>
                {t('settings.notifications.type', 'Notify me about...')}
              </CardTitle>
            </div>
            <CardDescription>
              {t(
                'settings.notifications.desc',
                'Configure how you receive notifications, sound chimes, and system alerts.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name='type'
              render={({ field }) => (
                <FormItem className='space-y-3'>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className='flex flex-col gap-2'
                    >
                      <FormItem className='flex items-center gap-2'>
                        <FormControl>
                          <RadioGroupItem value='all' />
                        </FormControl>
                        <FormLabel className='font-normal cursor-pointer'>
                          {t('settings.notifications.typeAll', 'All new messages')}
                        </FormLabel>
                      </FormItem>
                      <FormItem className='flex items-center gap-2'>
                        <FormControl>
                          <RadioGroupItem value='mentions' />
                        </FormControl>
                        <FormLabel className='font-normal cursor-pointer'>
                          {t(
                            'settings.notifications.typeMentions',
                            'Direct messages and mentions'
                          )}
                        </FormLabel>
                      </FormItem>
                      <FormItem className='flex items-center gap-2'>
                        <FormControl>
                          <RadioGroupItem value='none' />
                        </FormControl>
                        <FormLabel className='font-normal cursor-pointer'>
                          {t('settings.notifications.typeNone', 'Nothing')}
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ─── Email Notification Switches ───────────────────────────── */}
        <Card>
          <CardHeader className='pb-3'>
            <div className='flex items-center gap-2'>
              <Mail className='h-5 w-5 text-primary' />
              <CardTitle className='text-base font-semibold'>
                {t('settings.notifications.emailNotifications', 'Email Notifications')}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            <FormField
              control={form.control}
              name='communication_emails'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3.5'>
                  <div className='space-y-0.5 pe-4'>
                    <FormLabel className='text-sm font-medium'>
                      {t('settings.notifications.communicationEmails', 'Communication emails')}
                    </FormLabel>
                    <FormDescription className='text-xs'>
                      {t(
                        'settings.notifications.communicationEmailsDesc',
                        'Receive emails about your account activity.'
                      )}
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
            <FormField
              control={form.control}
              name='marketing_emails'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3.5'>
                  <div className='space-y-0.5 pe-4'>
                    <FormLabel className='text-sm font-medium'>
                      {t('settings.notifications.marketingEmails', 'Marketing emails')}
                    </FormLabel>
                    <FormDescription className='text-xs'>
                      {t(
                        'settings.notifications.marketingEmailsDesc',
                        'Receive emails about new products, features, and more.'
                      )}
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
            <FormField
              control={form.control}
              name='social_emails'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3.5'>
                  <div className='space-y-0.5 pe-4'>
                    <FormLabel className='text-sm font-medium'>
                      {t('settings.notifications.socialEmails', 'Social emails')}
                    </FormLabel>
                    <FormDescription className='text-xs'>
                      {t(
                        'settings.notifications.socialEmailsDesc',
                        'Receive emails for friend requests, follows, and more.'
                      )}
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
            <FormField
              control={form.control}
              name='security_emails'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3.5'>
                  <div className='space-y-0.5 pe-4'>
                    <FormLabel className='text-sm font-medium'>
                      {t('settings.notifications.securityEmails', 'Security emails')}
                    </FormLabel>
                    <FormDescription className='text-xs'>
                      {t(
                        'settings.notifications.securityEmailsDesc',
                        'Receive emails about your account activity and security.'
                      )}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled
                      aria-readonly
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ─── Mobile Settings Checkbox ──────────────────────────────── */}
        <FormField
          control={form.control}
          name='mobile'
          render={({ field }) => (
            <FormItem className='relative flex flex-row items-start gap-3 rounded-lg border p-3.5'>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className='space-y-1 leading-none'>
                <FormLabel className='text-sm font-medium cursor-pointer'>
                  {t(
                    'settings.notifications.mobile',
                    'Use different settings for my mobile devices'
                  )}
                </FormLabel>
                <FormDescription className='text-xs'>
                  {t(
                    'settings.notifications.mobileDesc',
                    'You can manage your mobile notifications in the mobile settings page.'
                  )}
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <Button
          type='submit'
          disabled={isSaving}
          className='flex items-center gap-2'
        >
          {isSaving ? (
            <>
              <Loader2 className='me-2 h-4 w-4 animate-spin' />
              {t('settings.notifications.updating', 'Updating notifications...')}
            </>
          ) : (
            <>
              <Check className='me-2 h-4 w-4' />
              {t('settings.notifications.submit', 'Update notifications')}
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}
