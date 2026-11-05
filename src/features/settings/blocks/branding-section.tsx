'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
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
import { useUpsertSetting } from '@/features/settings/data/queries'
import {
  BrandingSettingsSchema,
  type BrandingSettings,
  BRANDING_DEFAULTS,
} from '@/features/settings/data/schema'
import { useSettingsStore } from '@/features/settings/data/store'

export function BrandingSection() {
  const { t } = useTranslation()
  const branding = useSettingsStore((s) => s.branding)
  const setBranding = useSettingsStore((s) => s.setBranding)
  const isLoaded = useSettingsStore((s) => s.isLoaded)
  const upsertMutation = useUpsertSetting()

  const form = useForm<BrandingSettings>({
    resolver: zodResolver(BrandingSettingsSchema),
    defaultValues: isLoaded ? branding : BRANDING_DEFAULTS,
    values: isLoaded ? branding : undefined,
  })

  async function onSubmit(values: BrandingSettings) {
    try {
      await upsertMutation.mutateAsync({
        key: 'branding',
        value: values,
        group: 'branding',
        is_public: true,
      })
      setBranding(values)
      toast.success(
        t('settings.system.branding.savedSuccess', 'Branding settings saved successfully')
      )
    } catch {
      toast.error(
        t('settings.system.branding.savedError', 'Failed to save branding settings')
      )
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('settings.system.branding.siteName', 'Site Name')}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t(
                    'settings.system.branding.siteNamePlaceholder',
                    'My Restaurant'
                  )}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t(
                  'settings.system.branding.siteNameDesc',
                  'The name displayed in the browser tab and navigation bar.'
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='logo_url'
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('settings.system.branding.logoUrl', 'Logo URL')}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t(
                    'settings.system.branding.logoUrlPlaceholder',
                    'https://example.com/logo.png'
                  )}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription>
                {t(
                  'settings.system.branding.logoUrlDesc',
                  'Direct link to your brand logo image.'
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='favicon_url'
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('settings.system.branding.faviconUrl', 'Favicon URL')}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t(
                    'settings.system.branding.faviconUrlPlaceholder',
                    'https://example.com/favicon.ico'
                  )}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription>
                {t(
                  'settings.system.branding.faviconUrlDesc',
                  'The small icon shown in browser tabs.'
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='description'
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('settings.system.branding.description', 'Site Description')}
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t(
                    'settings.system.branding.descriptionPlaceholder',
                    'A short description of your business...'
                  )}
                  className='min-h-[80px] resize-none'
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription>
                {t(
                  'settings.system.branding.descriptionDesc',
                  'Used in meta tags and documentation. Max 500 characters.'
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type='submit'
          disabled={upsertMutation.isPending}
          className='w-full sm:w-auto'
        >
          {upsertMutation.isPending ? (
            <Loader2 className='me-2 h-4 w-4 animate-spin' />
          ) : (
            <Save className='me-2 h-4 w-4' />
          )}
          {t('settings.system.branding.save', 'Save Branding')}
        </Button>
      </form>
    </Form>
  )
}
