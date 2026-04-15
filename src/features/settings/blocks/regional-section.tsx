'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSettingsStore } from '@/features/settings/data/store'
import { useUpsertSetting } from '@/features/settings/data/queries'
import {
  LocalizationSettingsSchema,
  type LocalizationSettings,
  LOCALIZATION_DEFAULTS,
} from '@/features/settings/data/schema'

const CURRENCIES = [
  { value: 'USD', label: 'USD — US Dollar ($)' },
  { value: 'EUR', label: 'EUR — Euro (€)' },
  { value: 'GBP', label: 'GBP — British Pound (£)' },
  { value: 'SAR', label: 'SAR — Saudi Riyal (﷼)' },
  { value: 'AED', label: 'AED — UAE Dirham (د.إ)' },
  { value: 'EGP', label: 'EGP — Egyptian Pound (E£)' },
  { value: 'INR', label: 'INR — Indian Rupee (₹)' },
  { value: 'JPY', label: 'JPY — Japanese Yen (¥)' },
  { value: 'CNY', label: 'CNY — Chinese Yuan (¥)' },
  { value: 'TRY', label: 'TRY — Turkish Lira (₺)' },
]

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY — 04/15/2026' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY — 15/04/2026' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD — 2026-04-15' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY — 15.04.2026' },
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية (Arabic)' },
  { value: 'fr', label: 'Français (French)' },
  { value: 'es', label: 'Español (Spanish)' },
  { value: 'de', label: 'Deutsch (German)' },
  { value: 'tr', label: 'Türkçe (Turkish)' },
  { value: 'zh', label: '中文 (Chinese)' },
  { value: 'ja', label: '日本語 (Japanese)' },
]

export function RegionalSection() {
  const localization = useSettingsStore((s) => s.localization)
  const setLocalization = useSettingsStore((s) => s.setLocalization)
  const isLoaded = useSettingsStore((s) => s.isLoaded)
  const upsertMutation = useUpsertSetting()

  const form = useForm<LocalizationSettings>({
    resolver: zodResolver(LocalizationSettingsSchema),
    defaultValues: isLoaded ? localization : LOCALIZATION_DEFAULTS,
    values: isLoaded ? localization : undefined,
  })

  async function onSubmit(values: LocalizationSettings) {
    try {
      await upsertMutation.mutateAsync({
        key: 'localization',
        value: values,
        group: 'localization',
        is_public: true,
      })
      setLocalization(values)
      toast.success('Regional preferences saved successfully')
    } catch (error) {
      console.error('Failed to save regional preferences:', error)
      toast.error('Failed to save regional preferences')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <FormField
          control={form.control}
          name='currency'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Select currency' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Default currency for prices and invoices (ISO 4217).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='date_format'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date Format</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Select date format' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DATE_FORMATS.map((df) => (
                    <SelectItem key={df.value} value={df.value}>
                      {df.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                How dates are displayed across the application.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='language'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Language</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Select language' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Default language for the application interface.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='timezone'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <FormControl>
                <Input
                  placeholder='e.g., America/New_York, Europe/London'
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription>
                Optional. IANA timezone for date/time operations.
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
          Save Regional Preferences
        </Button>
      </form>
    </Form>
  )
}
