'use client'

import { type z } from 'zod'
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
import { Switch } from '@/components/ui/switch'
import { useUpsertSetting } from '@/features/settings/data/queries'
import {
  BusinessSettingsSchema,
  type BusinessSettings,
  BUSINESS_DEFAULTS,
} from '@/features/settings/data/schema'
import { useSettingsStore } from '@/features/settings/data/store'

export function BusinessSection() {
  const { t } = useTranslation()
  const business = useSettingsStore((s) => s.business)
  const setBusiness = useSettingsStore((s) => s.setBusiness)
  const isLoaded = useSettingsStore((s) => s.isLoaded)
  const upsertMutation = useUpsertSetting()

  const form = useForm<
    z.input<typeof BusinessSettingsSchema>,
    unknown,
    BusinessSettings
  >({
    resolver: zodResolver(BusinessSettingsSchema),
    defaultValues: isLoaded ? business : BUSINESS_DEFAULTS,
    values: isLoaded ? business : undefined,
  })

  async function onSubmit(values: BusinessSettings) {
    try {
      await upsertMutation.mutateAsync({
        key: 'business',
        value: values,
        group: 'business',
        is_public: false,
      })
      setBusiness(values)
      toast.success(
        t('settings.system.business.savedSuccess', 'Business rules saved successfully')
      )
    } catch {
      toast.error(
        t('settings.system.business.savedError', 'Failed to save business rules')
      )
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <FormField
          control={form.control}
          name='default_tax_rate'
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('settings.system.business.taxRate', 'Default Tax Rate (%)')}
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  step='0.01'
                  min='0'
                  max='100'
                  placeholder={t(
                    'settings.system.business.taxRatePlaceholder',
                    '0.00'
                  )}
                  {...field}
                  value={(field.value as number) ?? ''}
                  onChange={(e) =>
                    field.onChange(parseFloat(e.target.value) || 0)
                  }
                />
              </FormControl>
              <FormDescription>
                {t(
                  'settings.system.business.taxRateDesc',
                  'Tax rate applied automatically to new orders.'
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='service_fee'
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('settings.system.business.serviceFee', 'Service Fee (%)')}
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  step='0.01'
                  min='0'
                  max='100'
                  placeholder={t(
                    'settings.system.business.serviceFeePlaceholder',
                    '0.00'
                  )}
                  {...field}
                  value={(field.value as number) ?? ''}
                  onChange={(e) =>
                    field.onChange(parseFloat(e.target.value) || 0)
                  }
                />
              </FormControl>
              <FormDescription>
                {t(
                  'settings.system.business.serviceFeeDesc',
                  'Optional service charge percentage added to orders.'
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='free_shipping_threshold'
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t(
                  'settings.system.business.freeShipping',
                  'Free Shipping Threshold'
                )}
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  step='0.01'
                  min='0'
                  placeholder={t(
                    'settings.system.business.freeShippingPlaceholder',
                    '0.00'
                  )}
                  {...field}
                  value={(field.value as number) ?? ''}
                  onChange={(e) =>
                    field.onChange(parseFloat(e.target.value) || 0)
                  }
                />
              </FormControl>
              <FormDescription>
                {t(
                  'settings.system.business.freeShippingDesc',
                  'Minimum order amount for free shipping. Set to 0 to disable.'
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='order_prefix'
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t(
                  'settings.system.business.orderPrefix',
                  'Order Number Prefix'
                )}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t(
                    'settings.system.business.orderPrefixPlaceholder',
                    'ORD-'
                  )}
                  maxLength={10}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription>
                {t(
                  'settings.system.business.orderPrefixDesc',
                  'Prefix prepended to generated order tracking numbers.'
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='auto_reorder'
          render={({ field }) => (
            <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3.5'>
              <div className='space-y-0.5 pe-4'>
                <FormLabel className='text-sm font-medium'>
                  {t(
                    'settings.system.business.autoReorder',
                    'Automatic Stock Reorder'
                  )}
                </FormLabel>
                <FormDescription className='text-xs'>
                  {t(
                    'settings.system.business.autoReorderDesc',
                    'Automatically generate purchase orders when stock hits minimum.'
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
          name='allow_negative_stock'
          render={({ field }) => (
            <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3.5'>
              <div className='space-y-0.5 pe-4'>
                <FormLabel className='text-sm font-medium'>
                  {t(
                    'settings.system.business.allowNegativeStock',
                    'Allow Negative Inventory'
                  )}
                </FormLabel>
                <FormDescription className='text-xs'>
                  {t(
                    'settings.system.business.allowNegativeStockDesc',
                    'Allow POS sales when stock balance is zero or below.'
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
          {t('settings.system.business.save', 'Save Business Rules')}
        </Button>
      </form>
    </Form>
  )
}
