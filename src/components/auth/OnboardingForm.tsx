import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  onboardingSchema,
  type OnboardingFormData,
} from '@/lib/validation/onboarding'
import { Button } from '@/components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface OnboardingFormProps {
  onSubmit: (data: OnboardingFormData) => void
  isLoading?: boolean
  defaultEmail?: string
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Dubai',
]

const INDUSTRIES = [
  'Food & Beverage',
  'Retail',
  'Hospitality',
  'Services',
  'Other',
]

export function OnboardingForm({
  onSubmit,
  isLoading,
  defaultEmail = '',
}: OnboardingFormProps) {
  const { t } = useTranslation()
  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      company_name: '',
      billing_contact: defaultEmail,
      timezone: '',
      industry: '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <FormField
          control={form.control}
          name='company_name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('authForms.companyName', 'Company Name')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('authForms.companyPlaceholder', 'Acme Restaurant Group')}
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='billing_contact'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('authForms.billingContactEmail', 'Billing Contact Email')}</FormLabel>
              <FormControl>
                <Input
                  placeholder='billing@example.com'
                  type='email'
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid grid-cols-2 gap-4'>
          <FormField
            control={form.control}
            name='industry'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('authForms.industry', 'Industry')}</FormLabel>
                <Select
                  disabled={isLoading}
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('authForms.selectIndustry', 'Select industry')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='timezone'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('authForms.timezone', 'Timezone')}</FormLabel>
                <Select
                  disabled={isLoading}
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('authForms.selectTimezone', 'Select timezone')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button className='mt-6 w-full' type='submit' disabled={isLoading}>
          {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
          {t('authForms.completeSetup', 'Complete Setup')}
        </Button>
      </form>
    </Form>
  )
}
