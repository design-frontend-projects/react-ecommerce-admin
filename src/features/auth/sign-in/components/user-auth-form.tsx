import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { useSignIn } from '@clerk/clerk-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, LogIn } from 'lucide-react'
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
import { MODULE_TABS } from './module-tabs'
import {
  userAuthFormSchema,
  type UserAuthFormValues,
  type UserModule,
} from './sign-in.schema'

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModule, setSelectedModule] = useState<UserModule>('inventory')
  const { isLoaded, signIn, setActive } = useSignIn()
  const navigate = useNavigate()

  const form = useForm<UserAuthFormValues>({
    resolver: zodResolver(userAuthFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: UserAuthFormValues) {
    if (!isLoaded) return

    setIsLoading(true)
    try {
      const result = await signIn.create({
        identifier: data.email,
        password: data.password,
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })

        // Redirect based on selected module
        let targetPath = redirectTo || '/'
        if (selectedModule === 'restaurant') {
          targetPath = redirectTo || '/respos'
        }

        navigate({ to: targetPath, replace: true })
        toast.success(
          `Welcome back! Logged in as ${selectedModule === 'restaurant' ? 'Restaurant' : 'Inventory'} user.`
        )
      } else {
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

  // const handleOAuthSignIn = async (
  //   strategy: 'oauth_github' | 'oauth_facebook'
  // ) => {
  //   if (!isLoaded) return
  //   try {
  //     setIsLoading(true)
  //     const redirectPath = selectedModule === 'restaurant' ? '/respos' : '/'
  //     await signIn.authenticateWithRedirect({
  //       strategy,
  //       redirectUrl: '/sso-callback',
  //       redirectUrlComplete: redirectTo || redirectPath,
  //     })
  //   } catch (err: unknown) {
  //     const errorMsg =
  //       (err as { errors?: { message: string }[] })?.errors?.[0]?.message ||
  //       'OAuth invalid'
  //     toast.error(errorMsg)
  //     setIsLoading(false)
  //   }
  // }

  return (
    <div className='space-y-4'>
      {/* Module Selector Tabs */}
      <div className='grid grid-cols-2 gap-2 rounded-lg bg-muted p-1'>
        {MODULE_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = selectedModule === tab.id

          return (
            <button
              key={tab.id}
              type='button'
              onClick={() => setSelectedModule(tab.id)}
              className={cn(
                'relative flex flex-col items-center gap-1 rounded-md px-3 py-3 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId='activeModuleTab'
                  className={cn(
                    'absolute inset-0 rounded-md bg-gradient-to-r opacity-10',
                    tab.gradient
                  )}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon
                className={cn(
                  'h-5 w-5',
                  isActive && `text-${tab.gradient.split('-')[1]}-500`
                )}
              />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Module Description */}
      <AnimatePresence mode='wait'>
        <motion.p
          key={selectedModule}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className='text-center text-xs text-muted-foreground'
        >
          {MODULE_TABS.find((t) => t.id === selectedModule)?.description}
        </motion.p>
      </AnimatePresence>

      {/* Sign-in Form */}
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
                  <Input placeholder='name@example.com' {...field} />
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
                  <PasswordInput placeholder='Enter your password' {...field} />
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
          <Button
            className={cn(
              'mt-2 bg-gradient-to-r',
              selectedModule === 'restaurant'
                ? 'from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                : 'from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
            )}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
            Sign in to{' '}
            {selectedModule === 'restaurant' ? 'Restaurant' : 'Inventory'}
          </Button>

          <div className='relative my-2'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t' />
            </div>
            {/* <div className='relative flex justify-center text-xs uppercase'>
              <span className='bg-background px-2 text-muted-foreground'>
                Or continue with
              </span>
            </div> */}
          </div>

          {/* <div className='grid grid-cols-2 gap-2'>
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
          </div> */}
        </form>
      </Form>
    </div>
  )
}
