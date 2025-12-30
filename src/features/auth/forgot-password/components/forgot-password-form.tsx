import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useSignIn } from '@clerk/clerk-react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
  code: z.string().optional(),
})

export function ForgotPasswordForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const navigate = useNavigate()
  const { isLoaded, signIn, setActive } = useSignIn()
  const [isLoading, setIsLoading] = useState(false)
  const [successfulCreation, setSuccessfulCreation] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '', code: '' },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (!isLoaded) return
    setIsLoading(true)

    try {
      if (!successfulCreation) {
        // Step 1: Send password reset code
        await signIn
          .create({
            strategy: 'reset_password_email_code',
            identifier: data.email,
          })
          .then((_) => {
            setSuccessfulCreation(true)
            toast.success('Check your email', {
              description: 'We sent you a 6-digit verification code.',
            })
          })
          .catch((err: unknown) => {
            const msg =
              (err as { errors?: { longMessage: string }[] })?.errors?.[0]
                ?.longMessage || 'An error occurred'
            toast.error(msg)
          })
      } else {
        // Step 2: Verify code and set new password
        await signIn
          .attemptFirstFactor({
            strategy: 'reset_password_email_code',
            code: data.code || '',
            password: data.password || '',
          })
          .then((result) => {
            if (result.status === 'complete') {
              setActive({ session: result.createdSessionId })
              navigate({ to: '/' })
              toast.success('Password reset successfully')
            } else {
              /*Investigate why the login hasn't completed */
            }
          })
          .catch((err: unknown) => {
            const msg =
              (err as { errors?: { longMessage: string }[] })?.errors?.[0]
                ?.longMessage || 'An error occurred'
            toast.error(msg)
          })
      }
    } catch (err: unknown) {
      // Catch any other errors
      const errorMsg =
        (err as { errors?: { message: string }[] })?.errors?.[0]?.message ||
        'Something went wrong'
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
        {!successfulCreation && (
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder='name@example.com' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {successfulCreation && (
          <>
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder='********' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='code'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input placeholder='123456' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <Button className='mt-2' disabled={isLoading}>
          {successfulCreation ? 'Reset Password' : 'Send Reset Code'}
          {isLoading ? <Loader2 className='animate-spin' /> : <ArrowRight />}
        </Button>
      </form>
    </Form>
  )
}
