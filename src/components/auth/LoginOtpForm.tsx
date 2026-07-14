import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { otpSchema, type OtpFormData } from '@/lib/validation/auth'
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
} from '@/components/ui/input-otp'

interface LoginOtpFormProps {
  email: string
  onSubmit: (data: OtpFormData) => void
  onResend: () => void
  onBack: () => void
  isLoading?: boolean
}

export function LoginOtpForm({
  email,
  onSubmit,
  onResend,
  onBack,
  isLoading,
}: LoginOtpFormProps) {
  const [countdown, setCountdown] = useState(30)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const form = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      email,
      token: '',
    },
  })

  const handleResend = () => {
    setCountdown(30)
    onResend()
  }

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <p className='text-sm text-muted-foreground'>
          We sent a 6-digit code to{' '}
          <span className='font-medium text-foreground'>{email}</span>
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <FormField
            control={form.control}
            name='token'
            render={({ field }) => (
              <FormItem className='flex flex-col items-center justify-center'>
                <FormLabel className='sr-only'>One-Time Password</FormLabel>
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
                <FormMessage />
              </FormItem>
            )}
          />

          <Button className='w-full' type='submit' disabled={isLoading}>
            {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Verify Code
          </Button>
        </form>
      </Form>

      <div className='flex flex-col space-y-2 text-center text-sm'>
        {countdown > 0 ? (
          <p className='text-muted-foreground'>Resend code in {countdown}s</p>
        ) : (
          <button
            type='button'
            onClick={handleResend}
            className='text-primary hover:underline focus:outline-none'
            disabled={isLoading}
          >
            Resend Code
          </button>
        )}
        <button
          type='button'
          onClick={onBack}
          className='text-muted-foreground hover:text-foreground hover:underline focus:outline-none'
          disabled={isLoading}
        >
          Use a different email
        </button>
      </div>
    </div>
  )
}
