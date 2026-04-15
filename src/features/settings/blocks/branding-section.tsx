'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useSettingsStore } from '@/features/settings/data/store'
import { useUpsertSetting } from '@/features/settings/data/queries'
import {
  BrandingSettingsSchema,
  type BrandingSettings,
  BRANDING_DEFAULTS,
} from '@/features/settings/data/schema'

export function BrandingSection() {
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
      toast.success('Branding settings saved successfully')
    } catch (error) {
      console.error('Failed to save branding settings:', error)
      toast.error('Failed to save branding settings')
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
              <FormLabel>Site Name</FormLabel>
              <FormControl>
                <Input placeholder='My Restaurant' {...field} />
              </FormControl>
              <FormDescription>
                The name displayed in the browser tab and navigation bar.
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
              <FormLabel>Logo URL</FormLabel>
              <FormControl>
                <Input
                  placeholder='https://example.com/logo.png'
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription>
                Direct link to your brand logo image.
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
              <FormLabel>Favicon URL</FormLabel>
              <FormControl>
                <Input
                  placeholder='https://example.com/favicon.ico'
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription>
                The small icon shown in browser tabs.
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
              <FormLabel>Site Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='A short description of your business...'
                  className='min-h-[80px] resize-none'
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription>
                Used in meta tags and documentation. Max 500 characters.
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
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <Save className='mr-2 h-4 w-4' />
          )}
          Save Branding
        </Button>
      </form>
    </Form>
  )
}
