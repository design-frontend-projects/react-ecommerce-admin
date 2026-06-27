import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useSignUp, useSignIn } from '@clerk/clerk-react'
import { toast } from 'sonner'
import { profileService } from '@/features/auth/services/profile-service'
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'

const formSchema = z.object({
  otp: z
    .string()
    .min(6, 'Please enter the 6-digit code.')
    .max(6, 'Please enter the 6-digit code.'),
})

interface OtpFormProps extends React.HTMLAttributes<HTMLFormElement> {
  flow: 'sign-up' | 'sign-in'
}

export function OtpForm({ className, flow, ...props }: OtpFormProps) {
  const navigate = useNavigate()
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp()
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { otp: '' },
  })

  const otp = form.watch('otp')

  async function handleSignUpVerification(code: string) {
    if (!isSignUpLoaded || !signUp) return

    const result = await signUp.attemptEmailAddressVerification({ code })

    if (result.status === 'complete') {
      await setSignUpActive({ session: result.createdSessionId })

      // Create the profile now that the user is verified
      try {
        if (result.createdUserId && signUp.emailAddress) {
          await profileService.createProfile({
            clerk_user_id: result.createdUserId,
            email: signUp.emailAddress,
          })
        }
      } catch (profileErr) {
        console.error('Failed to create initial profile:', profileErr)
      }

      navigate({ to: '/' })
      toast.success('Email verified successfully!')
    } else {
      toast.error('Verification failed. Please try again.')
    }
  }

  async function handleSignInVerification(code: string) {
    if (!isSignInLoaded || !signIn) return

    const result = await signIn.attemptFirstFactor({
      strategy: 'email_code',
      code,
    })

    if (result.status === 'complete') {
      await setSignInActive({ session: result.createdSessionId })
      navigate({ to: '/', replace: true })
      toast.success('Sign in successful!')
    } else if (result.status === 'needs_second_factor') {
      toast.info('Two-factor authentication is required.')
      // Could navigate to a 2FA page if needed
    } else {
      console.warn('[OTP] Unhandled sign-in status:', result.status)
      toast.error('Verification failed. Please try again.')
    }
  }

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      if (flow === 'sign-in') {
        await handleSignInVerification(data.otp)
      } else {
        await handleSignUpVerification(data.otp)
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { errors?: { message: string }[] })?.errors?.[0]?.message ||
        'Invalid code. Please try again.'
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-2', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='otp'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='sr-only'>One-Time Password</FormLabel>
              <FormControl>
                <InputOTP
                  maxLength={6}
                  {...field}
                  containerClassName='justify-between sm:[&>[data-slot="input-otp-group"]>div]:w-12'
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={otp.length < 6 || isLoading}>
          Verify
        </Button>
      </form>
    </Form>
  )
}
