import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence, type HTMLMotionProps } from 'framer-motion'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
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
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  
  const { setSession, setUser } = useAuthStore((state) => state.auth)
  const { selectedBranchId, setSelectedBranchId } = useAuthStore((state) => state.auth)

  const { data: branches, isLoading: isBranchesLoading } = useQuery({
    queryKey: ['branches', 'active', 'auth-form'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data
    },
  })

  const form = useForm<UserAuthFormValues>({
    resolver: zodResolver(userAuthFormSchema),
    defaultValues: {
      branchId: selectedBranchId || '',
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: UserAuthFormValues) {
    setIsLoading(true)
    try {
      setSelectedBranchId(data.branchId)

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) throw error

      if (authData.session && authData.user) {
        setSession(authData.session)
        setUser(authData.user)

        // Redirect based on selected module
        let targetPath = redirectTo || '/'
        if (selectedModule === 'restaurant') {
          targetPath = redirectTo || '/respos'
        }

        navigate({ to: targetPath, replace: true })
        toast.success(
          `Welcome back! Logged in as ${selectedModule === 'restaurant' ? 'Restaurant' : 'Inventory'} user.`
        )
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { message?: string })?.message ||
        'Invalid email or password.'
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
              name='branchId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      setSelectedBranchId(value)
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className='h-11 bg-background/50 focus-visible:ring-primary'>
                        <SelectValue
                          placeholder={
                            isBranchesLoading
                              ? 'Loading branches...'
                              : 'Select a branch'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

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
                <FormItem>
                  <div className='flex items-center justify-between'>
                    <FormLabel>Password</FormLabel>
                    <Link
                      to='/forgot-password'
                      className='text-xs font-medium text-primary hover:underline'
                    >
                      Forgot password?
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
              disabled={isLoading || isBranchesLoading}
            >
              {isLoading ? (
                <Loader2 className='mr-2 h-5 w-5 animate-spin' />
              ) : (
                <LogIn className='mr-2 h-5 w-5' />
              )}
              Sign In
            </Button>
          </motion.div>
        </motion.form>
      </Form>
    </div>
  )
}

