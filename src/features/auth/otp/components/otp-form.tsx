import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
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
import { profileService } from '../../services/profile-service'
import {
  clearPendingOtpRequest,
  getPendingOtpRequest,
} from '../pending-otp'

const formSchema = z.object({
  otp: z
    .string()
    .min(6, 'Please enter the 6-digit code.')
    .max(6, 'Please enter the 6-digit code.'),
})

type OtpFormProps = React.HTMLAttributes<HTMLFormElement>

export function OtpForm({ className, ...props }: OtpFormProps) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { otp: '' },
  })


  const otp = form.watch('otp')

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      const pending = getPendingOtpRequest()
      if (!pending) {
        throw new Error('No pending verification request. Please request a new code.')
      }

      const verifyPayload =
        pending.contactType === 'email'
          ? {
              email: pending.contact,
              token: data.otp,
              type: pending.flow === 'sign-up' ? ('signup' as const) : ('email' as const),
            }
          : {
              phone: pending.contact,
              token: data.otp,
              type: 'sms' as const,
            }

      const { data: authData, error } = await supabase.auth.verifyOtp(verifyPayload)
      if (error) throw error

      const authUserId = authData.user?.id
      if (!authUserId) {
        throw new Error('Verification succeeded but no user session was returned.')
      }

      clearPendingOtpRequest()
      const profile = await profileService.getProfile(authUserId)
      if (!profile?.onboarding_complete) {
        navigate({ to: '/complete-account', search: {}, replace: true })
        toast.success('Verified. Complete your account to continue.')
        return
      }

      const target =
        pending.redirectTo ||
        (pending.module === 'restaurant' ? '/respos' : '/')
      navigate({ to: target as never, search: true, replace: true })
      toast.success('Signed in successfully.')
    } catch (err: unknown) {
      const errorMsg =
        (err as { errors?: { message: string }[] })?.errors?.[0]?.message ||
        (err as { message?: string })?.message ||
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
