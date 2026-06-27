import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { Loader2, MailCheck, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
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
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { profileService } from '@/features/auth/services/profile-service'
import { signUpFormSchema, type SignUpFormValues } from './sign-up.schema'

export function SignUpForm({
  className,
  ...props
}: Omit<HTMLMotionProps<'form'>, 'ref'>) {
  const [isLoading, setIsLoading] = useState(false)
  const [isOtpSent, setIsOtpSent] = useState(false)
  const navigate = useNavigate()
  const { setSession, setUser } = useAuthStore((state) => state.auth)

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      email: '',
      otp: '',
    },
  })

  async function onSubmit(data: SignUpFormValues) {
    setIsLoading(true)

    try {
      if (!isOtpSent) {
        // Step 1: Send OTP for signup
        const { error } = await supabase.auth.signInWithOtp({
          email: data.email,
          options: {
            shouldCreateUser: true, // Allow signup if user doesn't exist
          },
        })

        if (error) throw error

        setIsOtpSent(true)
        toast.info('A verification code has been sent to your email.')
      } else {
        // Step 2: Verify OTP
        if (!data.otp || data.otp.length !== 6) {
          toast.error('Please enter the 6-digit OTP.')
          setIsLoading(false)
          return
        }

        const { data: authData, error } = await supabase.auth.verifyOtp({
          email: data.email,
          token: data.otp,
          type: 'email',
        })

        if (error) throw error

        if (authData.session && authData.user) {
          // Create the profile in the database
          await profileService.getOrCreateProfile({
            user_id: authData.user.id,
            email: authData.user.email ?? data.email,
          })

          // Save session in Zustand store
          setSession(authData.session)
          setUser(authData.user)

          navigate({ to: '/', replace: true })
          toast.success('Account created and verified successfully!')
        }
      }
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
        {!isOtpSent ? (
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
        ) : (
          <motion.div variants={itemVariants}>
            <FormField
              control={form.control}
              name='otp'
              render={({ field }) => (
                <FormItem className='flex flex-col items-center justify-center space-y-4'>
                  <FormLabel className='text-center'>
                    Enter Verification Code
                  </FormLabel>
                  <FormControl>
                    <InputOTP maxLength={6} {...field}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </FormControl>
                  <p className='text-xs text-muted-foreground'>
                    Sent to {form.getValues('email')}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>
        )}

        <motion.div variants={itemVariants}>
          <Button className='mt-2 h-11 w-full' disabled={isLoading}>
            {isLoading ? (
              <Loader2 className='mr-2 h-5 w-5 animate-spin' />
            ) : isOtpSent ? (
              <LogIn className='mr-2 h-5 w-5' />
            ) : (
              <MailCheck className='mr-2 h-5 w-5' />
            )}
            {isOtpSent ? 'Verify & Sign Up' : 'Send Verification Code'}
          </Button>
        </motion.div>

        {isOtpSent && (
          <motion.div variants={itemVariants} className='mt-2 text-center'>
            <button
              type='button'
              onClick={() => setIsOtpSent(false)}
              className='text-xs text-muted-foreground transition-colors hover:text-foreground'
            >
              Use a different email address
            </button>
          </motion.div>
        )}
      </motion.form>
    </Form>
  )
}
