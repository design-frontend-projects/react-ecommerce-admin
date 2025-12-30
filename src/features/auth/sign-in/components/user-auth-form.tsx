import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { useSignIn } from '@clerk/clerk-react'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { IconFacebook, IconGithub } from '@/assets/brand-icons'
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
  email: z.email({
    error: (iss) => (iss.input === '' ? 'Please enter your email' : undefined),
  }),
  password: z
    .string()
    .min(1, 'Please enter your password')
    .min(7, 'Password must be at least 7 characters long'),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { isLoaded, signIn, setActive } = useSignIn()
  const navigate = useNavigate()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (!isLoaded) return

    setIsLoading(true)
    try {
      const result = await signIn.create({
        identifier: data.email,
        password: data.password,
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        const targetPath = redirectTo || '/'
        navigate({ to: targetPath, replace: true })
        toast.success(`Welcome back!`)
      } else {
        /*Investigate why the login hasn't completed */
        toast.info('Sign in requires further steps.')
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { errors?: { message: string }[] })?.errors?.[0]?.message ||
        'Something went wrong. Please try again.'
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = async (
    strategy: 'oauth_github' | 'oauth_facebook'
  ) => {
    if (!isLoaded) return
    try {
      setIsLoading(true)
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: redirectTo || '/',
      })
    } catch (err: unknown) {
      const errorMsg =
        (err as { errors?: { message: string }[] })?.errors?.[0]?.message ||
        'OAuth invalid'
      toast.error(errorMsg)
      setIsLoading(false)
    }
  }

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn('grid gap-3', className)}
          {...props}
        >
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='password'
            render={({ field }) => (
              <FormItem className='relative'>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput {...field} />
                </FormControl>
                <FormMessage />
                <Link
                  to='/forgot-password'
                  className='absolute end-0 -top-0.5 text-sm font-medium text-muted-foreground hover:opacity-75'
                >
                  Forgot password?
                </Link>
              </FormItem>
            )}
          />
          <Button className='mt-2' disabled={isLoading}>
            {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
            Sign in
          </Button>

          <div className='relative my-2'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t' />
            </div>
            <div className='relative flex justify-center text-xs uppercase'>
              <span className='bg-background px-2 text-muted-foreground'>
                Or continue with
              </span>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-2'>
            <Button
              variant='outline'
              type='button'
              disabled={isLoading}
              onClick={() => handleOAuthSignIn('oauth_github')}
            >
              <IconGithub className='h-4 w-4' /> GitHub
            </Button>
            <Button
              variant='outline'
              type='button'
              disabled={isLoading}
              onClick={() => handleOAuthSignIn('oauth_facebook')}
            >
              <IconFacebook className='h-4 w-4' /> Facebook
            </Button>
          </div>
        </form>
      </Form>
      {/* <SignIn /> */}
    </>
  )
}
