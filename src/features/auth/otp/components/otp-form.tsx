import { useState, useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'
import { profileService } from '@/features/auth/services/profile-service'
import { fetchCurrentUserAccess } from '@/features/users/data/queries'
import { getPendingOtpRequest, clearPendingOtpRequest } from '../pending-otp'

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
  const { setSession, setUser } = useAuthStore((state) => state.auth)
  const pendingRequest = getPendingOtpRequest()
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    if (!pendingRequest) {
      toast.error(t('otp.noPendingReq'))
      navigate({ to: flow === 'sign-in' ? '/sign-in' : '/sign-up' })
    }
  }, [pendingRequest, navigate, flow, t])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { otp: '' },
  })

  const otp = form.watch('otp')

  async function handleSignUpVerification(code: string) {
    if (!pendingRequest) return

    let verifyParams: Parameters<typeof supabase.auth.verifyOtp>[0]
    if (pendingRequest.contactType === 'email') {
      verifyParams = {
        token: code,
        email: pendingRequest.contact,
        type: 'signup',
      }
    } else {
      verifyParams = {
        token: code,
        phone: pendingRequest.contact,
        type: 'sms',
      }
    }

    const { data, error } = await supabase.auth.verifyOtp(verifyParams)

    if (error) throw error

    if (data.session && data.user) {
      setSession(data.session)
      setUser(data.user)

      // Create the profile now that the user is verified
      try {
        await profileService.createProfile({
          auth_user_id: data.user.id,
          email: data.user.email ?? pendingRequest.contact,
        })
      } catch (_profileErr) {
        toast.error(t('otp.profileFailed'))
      }

      clearPendingOtpRequest()
      navigate({ to: '/' })
      toast.success(t('otp.verifiedSuccess'))
    } else {
      toast.error(t('otp.verificationFailed'))
    }
  }

  async function handleSignInVerification(code: string) {
    if (!pendingRequest) return

    let verifyParams: Parameters<typeof supabase.auth.verifyOtp>[0]
    if (pendingRequest.contactType === 'email') {
      verifyParams = {
        token: code,
        email: pendingRequest.contact,
        type: 'email',
      }
    } else {
      verifyParams = {
        token: code,
        phone: pendingRequest.contact,
        type: 'sms',
      }
    }

    const { data, error } = await supabase.auth.verifyOtp(verifyParams)

    if (error) throw error

    if (data.session && data.user) {
      setSession(data.session)
      setUser(data.user)

      clearPendingOtpRequest()

      const access = await fetchCurrentUserAccess(data.user.id)
      const roles = access?.roleNames || []
      const isRestaurantRole = roles.some((r) =>
        ['cashier', 'captain', 'kitchen'].includes(r)
      )

      let targetPath: '/products' | '/respos' = '/products'
      if (pendingRequest.module === 'restaurant' || isRestaurantRole) {
        targetPath = '/respos'
      }

      navigate({ to: targetPath, replace: true })
      toast.success(t('otp.signInSuccess'))
    } else {
      toast.error(t('otp.verificationFailed'))
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
        (err as { message?: string })?.message ||
        t('otp.invalidCode')
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
              <FormLabel className='sr-only'>
                {t('otp.oneTimePassword')}
              </FormLabel>
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
          {t('otp.verifyBtn')}
        </Button>
      </form>
    </Form>
  )
}
