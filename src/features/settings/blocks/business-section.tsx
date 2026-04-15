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
import { useSettingsStore } from '@/features/settings/data/store'
import { useUpsertSetting } from '@/features/settings/data/queries'
import {
  BusinessSettingsSchema,
  type BusinessSettings,
  BUSINESS_DEFAULTS,
} from '@/features/settings/data/schema'

export function BusinessSection() {
  const business = useSettingsStore((s) => s.business)
  const setBusiness = useSettingsStore((s) => s.setBusiness)
  const isLoaded = useSettingsStore((s) => s.isLoaded)
  const upsertMutation = useUpsertSetting()

  const form = useForm<BusinessSettings>({
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
      toast.success('Business rules saved successfully')
    } catch (error) {
      console.error('Failed to save business rules:', error)
      toast.error('Failed to save business rules')
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
              <FormLabel>Default Tax Rate (%)</FormLabel>
              <FormControl>
                <Input
                  type='number'
                  step='0.01'
                  min='0'
                  max='100'
                  placeholder='0.00'
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>
                Tax rate applied automatically to new orders.
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
              <FormLabel>Service Fee (%)</FormLabel>
              <FormControl>
                <Input
                  type='number'
                  step='0.01'
                  min='0'
                  max='100'
                  placeholder='0.00'
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>
                Optional service charge percentage added to orders.
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
              <FormLabel>Free Shipping Threshold</FormLabel>
              <FormControl>
                <Input
                  type='number'
                  step='0.01'
                  min='0'
                  placeholder='0.00'
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>
                Minimum order amount for free shipping. Set to 0 to disable.
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
          Save Business Rules
        </Button>
      </form>
    </Form>
  )
}
