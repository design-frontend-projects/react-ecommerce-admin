import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useResetUserPassword } from '../hooks/use-users'

const resetPasswordFormSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>

interface ResetPasswordDialogProps {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResetPasswordDialog({
  userId,
  open,
  onOpenChange,
}: ResetPasswordDialogProps) {
  const { t } = useTranslation()
  const resetMutation = useResetUserPassword()
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      password: '',
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset()
    }
  }, [form, open])

  const onSubmit = (values: ResetPasswordFormValues) => {
    if (!userId) return

    resetMutation.mutate(
      {
        userId,
        password: values.password,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('users.resetPasswordDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('users.resetPasswordDialog.desc')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex flex-col gap-5'
          >
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('users.resetPasswordDialog.newPassword')}</FormLabel>
                  <FormControl>
                    <Input
                      type='password'
                      placeholder='••••••••'
                      disabled={resetMutation.isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='flex items-center justify-end gap-3'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={resetMutation.isPending}
              >
                {t('users.resetPasswordDialog.cancel')}
              </Button>
              <Button type='submit' disabled={resetMutation.isPending}>
                {t('users.resetPasswordDialog.resetPasswordBtn')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
