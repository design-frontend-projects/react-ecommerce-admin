import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence, type HTMLMotionProps } from 'framer-motion'
import { Loader2, LogIn } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { fetchCurrentUserAccess } from '@/features/users/data/queries'
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
  const navigate = useNavigate()
  const { t } = useTranslation()

  const { setSession, setUser } = useAuthStore((state) => state.auth)

  const form = useForm<UserAuthFormValues>({
    resolver: zodResolver(userAuthFormSchema),
    defaultValues: {
      contactType: 'email',
      contact: '',
      password: '',
    },
  })

  async function onSubmit(data: UserAuthFormValues) {
    setIsLoading(true)
    try {
      const credentials =
        data.contactType === 'email'
          ? { email: data.contact, password: data.password }
          : { phone: data.contact, password: data.password }

      const { data: authData, error } =
        await supabase.auth.signInWithPassword(credentials)

      if (error) throw error

      if (authData.session && authData.user) {
        setSession(authData.session)
        setUser(authData.user)

        const access = await fetchCurrentUserAccess(authData.user.id)
        const roles = access?.roleNames || []
        const isRestaurantRole = roles.some((r) =>
          ['cashier', 'captain', 'kitchen'].includes(r)
        )

        // Redirect based on selected module and role
        let targetPath = redirectTo || '/products'
        if (selectedModule === 'restaurant' || isRestaurantRole) {
          targetPath = redirectTo || '/respos'
        }

        navigate({ to: targetPath as never, replace: true })
        toast.success(
          t('authForm.successLogin', {
            module: t(`authForm.modules.${selectedModule}`),
          })
        )
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { message?: string })?.message ||
        t('authForm.invalidCredentials')
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
              <span className='z-10'>{t(`authForm.modules.${tab.id}`)}</span>
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
          {t(`authForm.modules.${selectedModule}Desc`)}
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
              name='contact'
              render={({ field }) => (
                <FormItem>
                  <div className='flex items-center justify-between gap-3'>
                    <FormLabel>
                      {form.watch('contactType') === 'email'
                        ? t('authForm.email')
                        : t('authForm.phone')}
                    </FormLabel>
                    <FormField
                      control={form.control}
                      name='contactType'
                      render={({ field: typeField }) => (
                        <div className='grid grid-cols-2 rounded-lg bg-muted p-1 text-xs'>
                          {(['email', 'phone'] as const).map((type) => (
                            <button
                              key={type}
                              type='button'
                              onClick={() => typeField.onChange(type)}
                              className={cn(
                                'rounded-md px-3 py-1 font-medium capitalize transition-colors',
                                typeField.value === type
                                  ? 'bg-background text-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                            >
                              {type === 'email'
                                ? t('authForm.email')
                                : t('authForm.phone')}
                            </button>
                          ))}
                        </div>
                      )}
                    />
                  </div>
                  <FormControl>
                    <Input
                      placeholder={
                        form.watch('contactType') === 'email'
                          ? 'name@example.com'
                          : '+201000000000'
                      }
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
                  <div className='flex items-center justify-between'>
                    <FormLabel>{t('authForm.password')}</FormLabel>
                    <Link
                      to='/forgot-password'
                      className='text-xs font-medium text-primary hover:underline'
                    >
                      {t('authForm.forgotPassword')}
                    </Link>
                  </div>
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
              {t('authForm.signIn')}
            </Button>
          </motion.div>
        </motion.form>
      </Form>
    </div>
  )
}
