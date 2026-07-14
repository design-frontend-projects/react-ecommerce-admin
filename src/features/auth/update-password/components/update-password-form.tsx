import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { Loader2, ArrowRight } from 'lucide-react'
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
import { PasswordInput } from '@/components/password-input'
import {
  updatePasswordFormSchema,
  type UpdatePasswordFormValues,
} from './update-password.schema'

export function UpdatePasswordForm({
  className,
  ...props
}: Omit<HTMLMotionProps<'form'>, 'ref'>) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useTranslation()

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function onSubmit(data: UpdatePasswordFormValues) {
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (error) throw error

      toast.success(t('updatePassword.successMsg'))
      navigate({ to: '/' })
    } catch (err: unknown) {
      const errorMsg =
        (err as { message?: string })?.message || t('updatePassword.errorMsg')
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
            name='password'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('updatePassword.newPassword')}</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder='••••••••'
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
          <FormField
            control={form.control}
            name='confirmPassword'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('updatePassword.confirmPassword')}</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder='••••••••'
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
            {t('updatePassword.updateBtn')}
          </Button>
        </motion.div>
      </motion.form>
    </Form>
  )
}
