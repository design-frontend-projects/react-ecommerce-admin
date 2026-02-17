import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { useSignIn } from '@clerk/clerk-react'
import { motion, AnimatePresence, type HTMLMotionProps } from 'framer-motion'
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

interface UserAuthFormProps extends Omit<HTMLMotionProps<'form'>, 'ref'> {
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
    <div className='space-y-4'>
      {/* Module Selector Tabs */}
      <div className='grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-1.5 backdrop-blur-sm'>
        {MODULE_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = selectedModule === tab.id

          return (
            <button
              key={tab.id}
              type='button'
              onClick={() => setSelectedModule(tab.id)}
              className={cn(
                'relative flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 sm:min-h-[44px]',
                isActive
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                  : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId='activeModuleTab'
                  className={cn(
                    'absolute inset-0 rounded-lg bg-linear-to-r opacity-10',
                    tab.gradient
                  )}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon
                className={cn(
                  'h-5 w-5 transition-transform duration-300',
                  isActive
                    ? `scale-110 text-${tab.gradient.split('-')[1]}-500`
                    : 'scale-100'
                )}
              />
              <span className='z-10'>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Module Description */}
      <AnimatePresence mode='wait'>
        <motion.p
          key={selectedModule}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          className='text-center text-xs font-medium text-muted-foreground'
        >
          {MODULE_TABS.find((t) => t.id === selectedModule)?.description}
        </motion.p>
      </AnimatePresence>

      {/* Sign-in Form */}
      <Form {...form}>
        <motion.form
          variants={containerVariants}
          initial='hidden'
          animate='show'
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn('grid gap-4', className)}
          {...props}
        >
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
                <FormItem className='relative'>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder='Enter your password'
                      className='h-11 bg-background/50 focus-visible:ring-primary'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <Link
                    to='/forgot-password'
                    className='absolute end-0 -top-0.5 text-xs font-medium text-primary transition-colors hover:text-primary/80 sm:text-sm'
                  >
                    Forgot password?
                  </Link>
                </FormItem>
              )}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <Button
              className={cn(
                'mt-2 h-11 w-full bg-linear-to-r text-base font-semibold transition-all duration-300 active:scale-95',
                selectedModule === 'restaurant'
                  ? 'from-orange-500 to-red-500 shadow-orange-500/20 hover:from-orange-600 hover:to-red-600 hover:shadow-orange-500/30'
                  : 'from-blue-500 to-cyan-500 shadow-blue-500/20 hover:from-blue-600 hover:to-cyan-600 hover:shadow-blue-500/30'
              )}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className='mr-2 h-5 w-5 animate-spin' />
              ) : (
                <LogIn className='mr-2 h-5 w-5' />
              )}
              Sign in to{' '}
              {selectedModule === 'restaurant' ? 'Restaurant' : 'Inventory'}
            </Button>
          </motion.div>

          <motion.div variants={itemVariants} className='relative my-4'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t border-border/50' />
            </div>
            <div className='relative flex justify-center text-xs uppercase'>
              <span className='bg-background px-2 text-muted-foreground'>
                Or continue with
              </span>
            </div>
          </motion.div>
        </motion.form>
      </Form>
    </div>
  )
}
