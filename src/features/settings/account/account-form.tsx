import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useUser } from '@/hooks/use-auth'
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
import { useChangePassword } from '../profile/profile-queries'

const passwordFormSchema = z
  .object({
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters.')
      .max(50, 'Password must not be longer than 50 characters.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  })

type PasswordFormValues = z.infer<typeof passwordFormSchema>

export function AccountForm() {
  const { t } = useTranslation()
  const { user } = useUser()
  const userId = user?.id

  const changePassword = useChangePassword()

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  function onSubmit(data: PasswordFormValues) {
    if (!userId) return

    changePassword.mutate(
      { userId, password: data.password },
      {
        onSuccess: () => {
          toast.success(
            t('settings.account.updated', 'Password changed successfully'),
            {
              description: t(
                'settings.common.savedSuccess',
                'Your password has been successfully changed.'
              ),
            }
          )
          form.reset()
        },
        onError: (error) => {
          toast.error(t('settings.common.savedError', 'Error'), {
            description:
              error.message ||
              t('settings.common.savedError', 'Failed to update password.'),
          })
        },
      }
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='max-w-xl space-y-6'>
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('settings.account.newPassword', 'New Password')}
              </FormLabel>
              <FormControl>
                <Input
                  type='password'
                  placeholder={t(
                    'settings.account.newPasswordPlaceholder',
                    '••••••••'
                  )}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t(
                  'settings.account.passwordHint',
                  'Must be at least 6 characters.'
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t(
                  'settings.account.confirmPassword',
                  'Confirm New Password'
                )}
              </FormLabel>
              <FormControl>
                <Input
                  type='password'
                  placeholder={t(
                    'settings.account.confirmPasswordPlaceholder',
                    '••••••••'
                  )}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type='submit'
          disabled={changePassword.isPending}
          className='flex items-center gap-2'
        >
          {changePassword.isPending ? (
            <>
              <Loader2 className='me-2 h-4 w-4 animate-spin' />
              {t('settings.account.updating', 'Changing Password...')}
            </>
          ) : (
            <>
              <KeyRound className='me-2 h-4 w-4' />
              {t('settings.account.submit', 'Change Password')}
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}
