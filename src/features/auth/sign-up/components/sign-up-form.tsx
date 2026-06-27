import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { type HTMLMotionProps, motion } from 'framer-motion'
import { Loader2, LogIn, MailCheck } from 'lucide-react'
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
import { PasswordInput } from '@/components/password-input'
import { signUpFormSchema, type SignUpFormValues } from './sign-up.schema'

export function SignUpForm({
  className,
  ...props
}: Omit<HTMLMotionProps<'form'>, 'ref'>) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: SignUpFormValues) {
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
          },
          emailRedirectTo: `${window.location.origin}/complete-account`,
        },
      })

      if (error) throw error

      setIsSuccess(true)
      toast.success('Account created successfully!', {
        description: 'Please check your email to verify your account.',
      })
    } catch (err: unknown) {
      const errorMsg =
        (err as { message?: string })?.message ||
        'Something went wrong. Please try again.'
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
        <h3 className='text-lg font-medium'>Check your email</h3>
        <p className='text-sm text-muted-foreground'>
          We've sent a verification link to {form.getValues('email')}. Please
          click the link to verify your account and continue.
        </p>
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
        <div className='grid grid-cols-2 gap-3'>
          <motion.div variants={itemVariants}>
            <FormField
              control={form.control}
              name='firstName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='John'
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
              name='lastName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Doe'
                      className='h-11 bg-background/50 focus-visible:ring-primary'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>
        </div>

        <motion.div variants={itemVariants}>
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
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
          <FormField
            control={form.control}
            name='password'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
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
              <LogIn className='mr-2 h-5 w-5' />
            )}
            Sign Up
          </Button>
        </motion.div>
      </motion.form>
    </Form>
  )
}
