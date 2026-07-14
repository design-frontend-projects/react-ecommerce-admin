import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { Loader2, MailCheck, ArrowRight, ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
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
  forgotPasswordFormSchema,
  type ForgotPasswordFormValues,
} from './forgot-password.schema'

export function ForgotPasswordForm({
  className,
  ...props
}: Omit<HTMLMotionProps<'form'>, 'ref'>) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { t } = useTranslation()

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(data: ForgotPasswordFormValues) {
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/update-password`,
      })

      if (error) throw error

      setIsSuccess(true)
      toast.success(t('forgotPassword.checkEmailTitle'), {
        description: t('forgotPassword.checkEmailToast'),
      })
    } catch (err: unknown) {
      const errorMsg =
        (err as { message?: string })?.message || t('forgotPassword.errorMsg')
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  }

  if (isSuccess) {
    return (
      <div className='flex flex-col items-center justify-center space-y-4 text-center'>
        <div className='rounded-full bg-primary/10 p-4'>
          <MailCheck className='h-8 w-8 text-primary' />
        </div>
        <h3 className='text-lg font-medium'>
          {t('forgotPassword.checkEmailTitle')}
        </h3>
        <p className='text-sm text-muted-foreground'>
          {t('forgotPassword.checkEmailDesc', {
            email: form.getValues('email'),
          })}
        </p>
        <Button variant='outline' className='mt-4 w-full' asChild>
          <Link to='/sign-in'>
            <ArrowLeft className='mr-2 h-4 w-4' />
            {t('forgotPassword.backToSignIn')}
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <motion.form
        variants={containerVariants}
        initial='hidden'
        animate='show'
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <motion.div variants={itemVariants}>
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('forgotPassword.email')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder='name@example.com'
                    className='h-11 bg-background/50 focus-visible:ring-primary'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Button className='mt-2 h-11 w-full' disabled={isLoading}>
            {isLoading ? (
              <Loader2 className='mr-2 h-5 w-5 animate-spin' />
            ) : (
              <ArrowRight className='mr-2 h-5 w-5' />
            )}
            {t('forgotPassword.sendResetLink')}
          </Button>
        </motion.div>
      </motion.form>
    </Form>
  )
}
