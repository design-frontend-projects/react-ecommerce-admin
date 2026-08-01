import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { emailSchema, type EmailFormData } from '@/lib/validation/auth'
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

interface LoginEmailFormProps {
  onSubmit: (data: EmailFormData) => void
  isLoading?: boolean
}

export function LoginEmailForm({ onSubmit, isLoading }: LoginEmailFormProps) {
  const { t } = useTranslation()
  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('authForms.emailAddress', 'Email Address')}</FormLabel>
              <FormControl>
                <Input
                  placeholder='you@example.com'
                  type='email'
                  autoCapitalize='none'
                  autoComplete='email'
                  autoCorrect='off'
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='w-full' type='submit' disabled={isLoading}>
          {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
          {t('authForms.continueWithEmail', 'Continue with Email')}
        </Button>
      </form>
    </Form>
  )
}
