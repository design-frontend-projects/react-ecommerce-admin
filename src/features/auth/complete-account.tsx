import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  ChevronRight,
  Loader2Icon,
  User,
  Store,
  Pill,
  Utensils,
  Shirt,
  Laptop,
  Banknote,
  CreditCard,
  Smartphone,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Logo } from '@/assets/logo'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/use-auth'
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
import { useCompleteOnboarding } from './hooks/use-onboarding'

const onboardingSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  phone: z.string().trim().optional(),
  activity: z.enum(
    ['market', 'pharmacy', 'restuarant', 'clothes', 'electronic'],
    {
      message: 'Please select a business activity',
    }
  ),
  paymentMethod: z.enum(['cash', 'visa', 'mobile_transfer'], {
    message: 'Please select a payment method',
  }),
  transferRef: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  if (data.paymentMethod === 'mobile_transfer' && !data.transferRef) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Transfer reference is required for mobile transfers',
      path: ['transferRef'],
    })
  }
})

type OnboardingFormValues = z.infer<typeof onboardingSchema>

const ACTIVITIES = [
  {
    id: 'market',
    name: 'Market',
    icon: Store,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    icon: Pill,
    color: 'from-red-500 to-rose-500',
  },
  {
    id: 'restuarant',
    name: 'Restaurant',
    icon: Utensils,
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'clothes',
    name: 'Clothes Shop',
    icon: Shirt,
    color: 'from-purple-500 to-indigo-500',
  },
  {
    id: 'electronic',
    name: 'Electronics',
    icon: Laptop,
    color: 'from-blue-500 to-cyan-500',
  },
] as const

const PAYMENT_METHODS = [
  {
    id: 'cash',
    icon: Banknote,
    color: 'from-emerald-500 to-green-500',
  },
  {
    id: 'visa',
    icon: CreditCard,
    color: 'from-blue-500 to-indigo-500',
  },
  {
    id: 'mobile_transfer',
    icon: Smartphone,
    color: 'from-purple-500 to-pink-500',
  },
] as const

export function CompleteAccountFeature() {
  const { user } = useUser()
  const completeOnboardingMutation = useCompleteOnboarding()
  const [step, setStep] = useState(1)
  const { t } = useTranslation()

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: user?.user_metadata?.firstName || user?.firstName || '',
      lastName: user?.user_metadata?.lastName || user?.lastName || '',
      phone: user?.phone || '',
      activity: undefined,
      paymentMethod: undefined,
      transferRef: '',
    },
    mode: 'onChange',
  })

  const onSubmit = (values: OnboardingFormValues) => {
    if (!user?.id) return

    completeOnboardingMutation.mutate({
      userId: user.id,
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
      activity: values.activity,
      paymentMethod: values.paymentMethod,
      transferRef: values.transferRef,
    })
  }

  const nextStep = async () => {
    if (step === 1) {
      const isValid = await form.trigger(['firstName', 'lastName', 'phone'])
      if (isValid) setStep(2)
    } else if (step === 2) {
      const isValid = await form.trigger(['activity'])
      if (isValid) setStep(3)
    }
  }

  const prevStep = () => setStep((s) => Math.max(1, s - 1))

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm'>
      {/* Premium Background Pattern */}
      <div
        className='absolute inset-0 -z-10 h-full w-full'
        style={{
          backgroundImage:
            'radial-gradient(var(--auth-grid-dot) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          maskImage:
            'radial-gradient(ellipse 50% 50% at 50% 50%, black 70%, transparent 100%)',
        }}
      />
      <div
        className='absolute inset-0 -z-20 h-full w-full'
        style={{
          backgroundImage:
            'linear-gradient(135deg, var(--background), color-mix(in srgb, var(--background) 90%, transparent), color-mix(in srgb, var(--primary) 10%, var(--background)))',
        }}
      />

      <div className='w-full max-w-lg p-4'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='overflow-hidden rounded-3xl border border-border/50 bg-card/60 shadow-2xl backdrop-blur-xl'
        >
          {/* Header */}
          <div className='flex flex-col items-center justify-center space-y-4 border-b border-border/50 p-8 text-center'>
            <div className='flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner'>
              <Logo className='h-8 w-8' />
            </div>
            <div className='space-y-1'>
              <h2 className='text-2xl font-bold tracking-tight'>
                {t('completeAccount.title')}
              </h2>
              <p className='text-sm text-muted-foreground'>
                {t('completeAccount.subtitle')}
              </p>
            </div>

            {/* Stepper */}
            <div className='mt-4 flex items-center justify-center gap-2'>
              <div
                className={`h-2 w-12 rounded-full transition-colors duration-500 ${step >= 1 ? 'bg-primary' : 'bg-primary/20'}`}
              />
              <div
                className={`h-2 w-12 rounded-full transition-colors duration-500 ${step >= 2 ? 'bg-primary' : 'bg-primary/20'}`}
              />
              <div
                className={`h-2 w-12 rounded-full transition-colors duration-500 ${step >= 3 ? 'bg-primary' : 'bg-primary/20'}`}
              />
            </div>
          </div>

          {/* Form Content */}
          <div className='p-8'>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className='space-y-6'
              >
                <AnimatePresence mode='wait' initial={false}>
                  {step === 1 && (
                    <motion.div
                      key='step1'
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className='space-y-4'
                    >
                      <div className='flex items-center gap-2 text-lg font-medium'>
                        <User className='h-5 w-5 text-primary' />
                        {t('completeAccount.personalInfo')}
                      </div>
                      <FormField
                        control={form.control}
                        name='firstName'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t('completeAccount.firstName')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder='John'
                                className='h-12 bg-background/50 text-lg'
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='lastName'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t('completeAccount.lastName')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder='Doe'
                                className='h-12 bg-background/50 text-lg'
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='phone'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t('completeAccount.phoneOptional')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder='+1 (555) 000-0000'
                                className='h-12 bg-background/50 text-lg'
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type='button'
                        size='lg'
                        className='mt-2 w-full text-base'
                        onClick={nextStep}
                        disabled={
                          !form.watch('firstName') || !form.watch('lastName')
                        }
                      >
                        {t('completeAccount.continue')}
                        <ChevronRight className='ml-2 h-5 w-5' />
                      </Button>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key='step2'
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className='space-y-4'
                    >
                      <FormField
                        control={form.control}
                        name='activity'
                        render={({ field }) => (
                          <FormItem className='space-y-4'>
                            <FormLabel className='flex items-center gap-2 text-lg font-medium'>
                              <Store className='h-5 w-5 text-primary' />
                              {t('completeAccount.selectActivity')}
                            </FormLabel>
                            <FormControl>
                              <div className='grid grid-cols-2 gap-3 sm:grid-cols-2'>
                                {ACTIVITIES.map((act) => {
                                  const Icon = act.icon
                                  const isSelected = field.value === act.id
                                  return (
                                    <button
                                      key={act.id}
                                      type='button'
                                      onClick={() => field.onChange(act.id)}
                                      className={cn(
                                        'relative flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all duration-300 hover:border-primary/50',
                                        isSelected
                                          ? 'border-primary bg-primary/5 text-foreground shadow-md ring-1 ring-primary'
                                          : 'border-border/50 bg-background/30 text-muted-foreground hover:bg-background/50'
                                      )}
                                    >
                                      {isSelected && (
                                        <motion.div
                                          layoutId='activeActivity'
                                          className={cn(
                                            'absolute inset-0 rounded-xl bg-linear-to-r opacity-5',
                                            act.color
                                          )}
                                          transition={{
                                            type: 'spring',
                                            bounce: 0.2,
                                            duration: 0.6,
                                          }}
                                        />
                                      )}
                                      <Icon
                                        className={cn(
                                          'h-8 w-8 transition-transform duration-300',
                                          isSelected
                                            ? 'scale-110 text-primary'
                                            : 'scale-100'
                                        )}
                                      />
                                      <span
                                        className={cn(
                                          'text-sm font-semibold',
                                          isSelected
                                            ? 'font-bold text-foreground'
                                            : ''
                                        )}
                                      >
                                        {t(
                                          `completeAccount.activities.${act.id}`
                                        )}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className='flex gap-3 pt-4'>
                        <Button
                          type='button'
                          variant='outline'
                          size='lg'
                          className='w-1/3 text-base'
                          onClick={prevStep}
                        >
                          {t('completeAccount.back')}
                        </Button>
                          <Button
                          type='button'
                          size='lg'
                          className='w-2/3 bg-primary text-base transition-all hover:bg-primary/90'
                          onClick={nextStep}
                          disabled={!form.watch('activity')}
                        >
                          {t('completeAccount.continue')}
                          <ChevronRight className='ml-2 h-5 w-5' />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      key='step3'
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className='space-y-4'
                    >
                      <FormField
                        control={form.control}
                        name='paymentMethod'
                        render={({ field }) => (
                          <FormItem className='space-y-4'>
                            <FormLabel className='flex items-center gap-2 text-lg font-medium'>
                              <CreditCard className='h-5 w-5 text-primary' />
                              {t('completeAccount.selectPayment')}
                            </FormLabel>
                            <FormControl>
                              <div className='grid grid-cols-3 gap-3'>
                                {PAYMENT_METHODS.map((method) => {
                                  const Icon = method.icon
                                  const isSelected = field.value === method.id
                                  return (
                                    <button
                                      key={method.id}
                                      type='button'
                                      onClick={() => {
                                        field.onChange(method.id)
                                        if (method.id !== 'mobile_transfer') {
                                          form.setValue('transferRef', '')
                                          form.clearErrors('transferRef')
                                        }
                                      }}
                                      className={cn(
                                        'relative flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all duration-300 hover:border-primary/50',
                                        isSelected
                                          ? 'border-primary bg-primary/5 text-foreground shadow-md ring-1 ring-primary'
                                          : 'border-border/50 bg-background/30 text-muted-foreground hover:bg-background/50'
                                      )}
                                    >
                                      {isSelected && (
                                        <motion.div
                                          layoutId='activePayment'
                                          className={cn(
                                            'absolute inset-0 rounded-xl bg-linear-to-r opacity-5',
                                            method.color
                                          )}
                                          transition={{
                                            type: 'spring',
                                            bounce: 0.2,
                                            duration: 0.6,
                                          }}
                                        />
                                      )}
                                      <Icon
                                        className={cn(
                                          'h-8 w-8 transition-transform duration-300',
                                          isSelected
                                            ? 'scale-110 text-primary'
                                            : 'scale-100'
                                        )}
                                      />
                                      <span
                                        className={cn(
                                          'text-sm font-semibold',
                                          isSelected
                                            ? 'font-bold text-foreground'
                                            : ''
                                        )}
                                      >
                                        {t(
                                          `completeAccount.paymentMethods.${method.id}`
                                        )}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch('paymentMethod') === 'mobile_transfer' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className='overflow-hidden pt-2'
                        >
                          <FormField
                            control={form.control}
                            name='transferRef'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {t('completeAccount.transferRef')}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder={t(
                                      'completeAccount.transferRefPlaceholder'
                                    )}
                                    className='h-12 bg-background/50 text-lg'
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}

                      <div className='flex gap-3 pt-4'>
                        <Button
                          type='button'
                          variant='outline'
                          size='lg'
                          className='w-1/3 text-base'
                          onClick={prevStep}
                        >
                          {t('completeAccount.back')}
                        </Button>
                        <Button
                          type='submit'
                          size='lg'
                          className='w-2/3 bg-linear-to-r from-blue-500 to-cyan-500 text-base shadow-blue-500/20 transition-all hover:from-blue-600 hover:to-cyan-600 hover:shadow-blue-500/30'
                          disabled={
                            completeOnboardingMutation.isPending ||
                            !form.watch('paymentMethod')
                          }
                        >
                          {completeOnboardingMutation.isPending ? (
                            <Loader2Icon className='mr-2 h-5 w-5 animate-spin' />
                          ) : (
                            <CheckCircle2 className='mr-2 h-5 w-5' />
                          )}
                          {t('completeAccount.completeSetup')}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </Form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
