import { useState } from 'react'
import { z } from 'zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  CreditCard,
  GitBranchPlus,
  Globe,
  Laptop,
  Loader2Icon,
  MapPin,
  Pill,
  Plus,
  Shirt,
  SkipForward,
  Smartphone,
  Sparkles,
  Store,
  Trash2,
  User,
  UserPlus,
  Utensils,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Logo } from '@/assets/logo'
import { supabase } from '@/lib/supabase'
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
import { SelectDropdown } from '@/components/select-dropdown'
import {
  useCompleteOnboarding,
  type CompleteOnboardingResult,
} from './hooks/use-onboarding'

// ─── Schema ──────────────────────────────────────────────────────────────────

const branchSchema = z.object({
  name: z.string().trim().min(1, 'Branch name is required'),
  cityId: z.string().min(1, 'City is required'),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
})

const onboardingUserSchema = z.object({
  email: z.string().email('Valid email required'),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  roleId: z.string().min(1, 'Role is required'),
  branchId: z.string().optional(),
})

const onboardingSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    phone: z.string().trim().optional(),
    businessName: z.string().trim().min(1, 'Business name is required'),
    displayName: z.string().trim().optional(),
    legalName: z.string().trim().optional(),
    countryId: z.string().min(1, 'Country selection is required'),
    activity: z.enum(
      ['market', 'pharmacy', 'restuarant', 'clothes', 'electronic'],
      { message: 'Please select a business activity' }
    ),
    paymentMethod: z.enum(['cash', 'visa', 'mobile_transfer'], {
      message: 'Please select a payment method',
    }),
    transferRef: z.string().trim().optional(),
    subscriptionId: z.number({ required_error: 'Please select a subscription plan' }),
    branches: z.array(branchSchema).optional(),
    users: z.array(onboardingUserSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === 'mobile_transfer' && !data.transferRef) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Transfer reference is required for mobile transfers',
        path: ['transferRef'],
      })
    }
  })

type OnboardingFormValues = z.infer<typeof onboardingSchema>

// ─── Constants ───────────────────────────────────────────────────────────────

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
  { id: 'cash', icon: Banknote, color: 'from-emerald-500 to-green-500' },
  { id: 'visa', icon: CreditCard, color: 'from-blue-500 to-indigo-500' },
  {
    id: 'mobile_transfer',
    icon: Smartphone,
    color: 'from-purple-500 to-pink-500',
  },
] as const

const TOTAL_STEPS = 7

// ─── Component ───────────────────────────────────────────────────────────────

export function CompleteAccountFeature() {
  const { user } = useUser()
  const completeOnboardingMutation = useCompleteOnboarding()
  const [step, setStep] = useState(1)
  const { t } = useTranslation()
  const [tempPasswords, setTempPasswords] = useState<
    Array<{ email: string; password: string }>
  >([])
  const [showTempPasswords, setShowTempPasswords] = useState(false)

  // Fetch countries with default currency relation
  const { data: countries = [] } = useQuery({
    queryKey: ['countries', 'onboarding'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('id, name, code, currency_id, currencies(id, name, code, symbol)')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as Array<{
        id: string
        name: string
        code: string
        currency_id: string | null
        currencies: { id: string; name: string; code: string; symbol: string } | null
      }>
    },
  })

  // Fetch subscription plans for step 5
  const { data: subscriptionPlans = [] } = useQuery({
    queryKey: ['subscriptions', 'onboarding'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('price', { ascending: true })
      if (error) throw error
      return (data ?? []) as Array<{
        id: number
        name: string
        duration_months: number
        price: number
      }>
    },
  })

  // Fetch cities for branch creation
  const { data: cities = [] } = useQuery({
    queryKey: ['cities', 'onboarding'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, countries(name)')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as Array<{
        id: string
        name: string
        countries: { name: string } | null
      }>
    },
  })

  // Fetch roles for user creation
  const { data: roles = [] } = useQuery({
    queryKey: ['roles', 'onboarding'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as Array<{ id: string; name: string }>
    },
  })

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: user?.user_metadata?.firstName || '',
      lastName: user?.user_metadata?.lastName || '',
      phone: user?.phone || '',
      businessName: '',
      displayName: '',
      legalName: '',
      countryId: '',
      activity: undefined,
      paymentMethod: undefined,
      transferRef: '',
      subscriptionId: undefined,
      branches: [],
      users: [],
    },
    mode: 'onChange',
  })

  const selectedCountryId = form.watch('countryId')
  const selectedCountry = countries.find((c) => c.id === selectedCountryId)

  const {
    fields: branchFields,
    append: appendBranch,
    remove: removeBranch,
  } = useFieldArray({
    control: form.control,
    name: 'branches',
  })

  const {
    fields: userFields,
    append: appendUser,
    remove: removeUser,
  } = useFieldArray({
    control: form.control,
    name: 'users',
  })

  const onSubmit = (values: OnboardingFormValues) => {
    if (!user?.id) return

    completeOnboardingMutation.mutate(
      {
        userId: user.id,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        businessName: values.businessName,
        displayName: values.displayName,
        legalName: values.legalName,
        countryId: values.countryId,
        activity: values.activity,
        paymentMethod: values.paymentMethod,
        transferRef: values.transferRef,
        subscriptionId: values.subscriptionId,
        branches:
          values.branches && values.branches.length > 0
            ? values.branches
            : undefined,
        users:
          values.users && values.users.length > 0 ? values.users : undefined,
      },
      {
        onSuccess: (result: CompleteOnboardingResult) => {
          if (result.createdUsers && result.createdUsers.length > 0) {
            setTempPasswords(
              result.createdUsers.map((u) => ({
                email: u.email,
                password: u.temporaryPassword,
              }))
            )
            setShowTempPasswords(true)
          }
        },
      }
    )
  }

  const nextStep = async () => {
    if (step === 1) {
      const isValid = await form.trigger(['firstName', 'lastName', 'phone'])
      if (isValid) setStep(2)
    } else if (step === 2) {
      const isValid = await form.trigger(['businessName', 'countryId'])
      if (isValid) setStep(3)
    } else if (step === 3) {
      const isValid = await form.trigger(['activity'])
      if (isValid) setStep(4)
    } else if (step === 4) {
      const isValid = await form.trigger(['paymentMethod', 'transferRef'])
      if (isValid) setStep(5)
    } else if (step === 5) {
      const isValid = await form.trigger(['subscriptionId'])
      if (isValid) setStep(6)
    } else if (step === 6) {
      setStep(7)
    }
  }

  const prevStep = () => setStep((s) => Math.max(1, s - 1))

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm'>
      {/* Background */}
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

      {/* Temp passwords modal for created users */}
      {showTempPasswords && tempPasswords.length > 0 && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm'>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className='w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl'
          >
            <h3 className='mb-2 text-lg font-bold'>
              {t('completeAccount.tempPasswordsTitle', 'User Credentials')}
            </h3>
            <p className='mb-4 text-sm text-muted-foreground'>
              {t(
                'completeAccount.tempPasswordsDesc',
                'Share these temporary passwords with your team members. They will be asked to change them on first login.'
              )}
            </p>
            <div className='max-h-60 space-y-3 overflow-y-auto'>
              {tempPasswords.map((tp, i) => (
                <div
                  key={i}
                  className='flex items-center justify-between rounded-lg border bg-muted/30 p-3'
                >
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-medium'>{tp.email}</p>
                    <p className='font-mono text-xs text-muted-foreground'>
                      {tp.password}
                    </p>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='ml-2 h-8 w-8 shrink-0'
                    onClick={() =>
                      copyToClipboard(`${tp.email}\n${tp.password}`)
                    }
                  >
                    <Copy className='h-4 w-4' />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              className='mt-4 w-full'
              onClick={() => setShowTempPasswords(false)}
            >
              {t('completeAccount.done', 'Done')}
            </Button>
          </motion.div>
        </div>
      )}

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
                {t('completeAccount.title', 'Complete Account Setup')}
              </h2>
              <p className='text-sm text-muted-foreground'>
                {t('completeAccount.subtitle', 'Configure your organization and start managing your business')}
              </p>
            </div>

            {/* Stepper — 7 steps */}
            <div className='mt-4 flex items-center justify-center gap-2'>
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div
                  key={i}
                  className={`h-2 w-6 rounded-full transition-colors duration-500 ${
                    step >= i + 1 ? 'bg-primary' : 'bg-primary/20'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className='max-h-[60vh] overflow-y-auto p-8'>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className='space-y-6'
              >
                <AnimatePresence mode='wait' initial={false}>
                  {/* ─── Step 1: Personal Info ─── */}
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
                        {t('completeAccount.personalInfo', 'Personal Details')}
                      </div>
                      <FormField
                        control={form.control}
                        name='firstName'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t('completeAccount.firstName', 'First Name')}
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
                              {t('completeAccount.lastName', 'Last Name')}
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
                              {t('completeAccount.phoneOptional', 'Phone Number (Optional)')}
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
                        {t('completeAccount.continue', 'Continue')}
                        <ChevronRight className='ml-2 h-5 w-5' />
                      </Button>
                    </motion.div>
                  )}

                  {/* ─── Step 2: Business Info ─── */}
                  {step === 2 && (
                    <motion.div
                      key='step2'
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className='space-y-4'
                    >
                      <div className='flex items-center gap-2 text-lg font-medium'>
                        <Building2 className='h-5 w-5 text-primary' />
                        {t('completeAccount.businessInfo', 'Organization Information')}
                      </div>

                      <FormField
                        control={form.control}
                        name='businessName'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t('completeAccount.businessName', 'Business / Organization Name *')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder='Acme Foods & Retail'
                                className='h-12 bg-background/50 text-lg'
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='countryId'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='flex items-center gap-1.5'>
                              <Globe className='h-4 w-4 text-primary' />
                              {t('completeAccount.country', 'Country & Currency *')}
                            </FormLabel>
                            <SelectDropdown
                              defaultValue={field.value}
                              onValueChange={field.onChange}
                              placeholder={t('completeAccount.selectCountry', 'Select Country')}
                              className='h-12 text-base'
                              items={countries.map((c) => ({
                                label: `${c.name} (${c.code})${c.currencies ? ` — Currency: ${c.currencies.code} (${c.currencies.symbol})` : ''}`,
                                value: c.id,
                              }))}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {selectedCountry && (
                        <div className='rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex items-center gap-2'>
                          <Globe className='h-4 w-4 shrink-0 text-primary' />
                          <span>
                            Selected Country: <strong className='text-foreground'>{selectedCountry.name} ({selectedCountry.code})</strong>. 
                            Default Currency: <strong className='text-foreground'>{selectedCountry.currencies?.code ?? 'USD'} ({selectedCountry.currencies?.symbol ?? '$'})</strong>.
                          </span>
                        </div>
                      )}

                      <div className='grid grid-cols-2 gap-3'>
                        <FormField
                          control={form.control}
                          name='displayName'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t('completeAccount.displayName', 'Display Name')}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder='Acme Brand'
                                  className='h-10 bg-background/50'
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name='legalName'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t('completeAccount.legalName', 'Legal Name')}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder='Acme LLC'
                                  className='h-10 bg-background/50'
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className='flex gap-3 pt-4'>
                        <Button
                          type='button'
                          variant='outline'
                          size='lg'
                          className='w-1/3 text-base'
                          onClick={prevStep}
                        >
                          {t('completeAccount.back', 'Back')}
                        </Button>
                        <Button
                          type='button'
                          size='lg'
                          className='w-2/3 bg-primary text-base transition-all hover:bg-primary/90'
                          onClick={nextStep}
                          disabled={
                            !form.watch('businessName') || !form.watch('countryId')
                          }
                        >
                          {t('completeAccount.continue', 'Continue')}
                          <ChevronRight className='ml-2 h-5 w-5' />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* ─── Step 3: Activity Selection ─── */}
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
                        name='activity'
                        render={({ field }) => (
                          <FormItem className='space-y-4'>
                            <FormLabel className='flex items-center gap-2 text-lg font-medium'>
                              <Store className='h-5 w-5 text-primary' />
                              {t('completeAccount.selectActivity', 'Select Business Category')}
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
                                          `completeAccount.activities.${act.id}`,
                                          act.name
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
                          {t('completeAccount.back', 'Back')}
                        </Button>
                        <Button
                          type='button'
                          size='lg'
                          className='w-2/3 bg-primary text-base transition-all hover:bg-primary/90'
                          onClick={nextStep}
                          disabled={!form.watch('activity')}
                        >
                          {t('completeAccount.continue', 'Continue')}
                          <ChevronRight className='ml-2 h-5 w-5' />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* ─── Step 4: Payment Method ─── */}
                  {step === 4 && (
                    <motion.div
                      key='step4'
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
                              {t('completeAccount.selectPayment', 'Preferred Payment Method')}
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
                                          `completeAccount.paymentMethods.${method.id}`,
                                          method.id.replace('_', ' ')
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
                                  {t('completeAccount.transferRef', 'Transfer Reference Number *')}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder={t(
                                      'completeAccount.transferRefPlaceholder',
                                      'TRX-12345678'
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
                          {t('completeAccount.back', 'Back')}
                        </Button>
                        <Button
                          type='button'
                          size='lg'
                          className='w-2/3 bg-primary text-base transition-all hover:bg-primary/90'
                          onClick={nextStep}
                          disabled={!form.watch('paymentMethod')}
                        >
                          {t('completeAccount.continue', 'Continue')}
                          <ChevronRight className='ml-2 h-5 w-5' />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* ─── Step 5: Subscription Plan Selection ─── */}
                  {step === 5 && (
                    <motion.div
                      key='step5'
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className='space-y-4'
                    >
                      <FormField
                        control={form.control}
                        name='subscriptionId'
                        render={({ field }) => (
                          <FormItem className='space-y-4'>
                            <FormLabel className='flex items-center gap-2 text-lg font-medium'>
                              <Sparkles className='h-5 w-5 text-primary' />
                              {t('completeAccount.selectPlan', 'Select Subscription Plan')}
                            </FormLabel>
                            <FormControl>
                              <div className='grid gap-3'>
                                {subscriptionPlans.length === 0 ? (
                                  <div className='flex flex-col items-center justify-center p-6 border rounded-xl bg-muted/20 text-center'>
                                    <Loader2Icon className='h-6 w-6 animate-spin text-primary mb-2' />
                                    <p className='text-sm text-muted-foreground'>Loading available plans...</p>
                                  </div>
                                ) : (
                                  subscriptionPlans.map((plan) => {
                                    const isSelected = field.value === plan.id
                                    return (
                                      <button
                                        key={plan.id}
                                        type='button'
                                        onClick={() => field.onChange(plan.id)}
                                        className={cn(
                                          'relative flex items-center justify-between rounded-2xl border p-4 text-left transition-all duration-300 hover:border-primary/50',
                                          isSelected
                                            ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary'
                                            : 'border-border/50 bg-background/30 hover:bg-background/50'
                                        )}
                                      >
                                        <div className='space-y-1'>
                                          <div className='flex items-center gap-2'>
                                            <span className='font-bold text-base text-foreground'>
                                              {plan.name}
                                            </span>
                                            {plan.price === 0 && (
                                              <span className='rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500'>
                                                Free Trial
                                              </span>
                                            )}
                                          </div>
                                          <p className='text-xs text-muted-foreground'>
                                            {plan.duration_months} {plan.duration_months === 1 ? 'Month' : 'Months'} duration
                                          </p>
                                        </div>
                                        <div className='flex items-center gap-3'>
                                          <div className='text-right'>
                                            <span className='text-lg font-extrabold text-foreground'>
                                              ${Number(plan.price).toFixed(2)}
                                            </span>
                                            <p className='text-[10px] text-muted-foreground'>/ cycle</p>
                                          </div>
                                          <div
                                            className={cn(
                                              'flex h-6 w-6 items-center justify-center rounded-full border transition-colors',
                                              isSelected
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-border bg-background'
                                            )}
                                          >
                                            {isSelected && <Check className='h-3.5 w-3.5' />}
                                          </div>
                                        </div>
                                      </button>
                                    )
                                  })
                                )}
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
                          {t('completeAccount.back', 'Back')}
                        </Button>
                        <Button
                          type='button'
                          size='lg'
                          className='w-2/3 bg-primary text-base transition-all hover:bg-primary/90'
                          onClick={nextStep}
                          disabled={!form.watch('subscriptionId')}
                        >
                          {t('completeAccount.continue', 'Continue')}
                          <ChevronRight className='ml-2 h-5 w-5' />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* ─── Step 6: Branch Setup ─── */}
                  {step === 6 && (
                    <motion.div
                      key='step6'
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className='space-y-4'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2 text-lg font-medium'>
                          <GitBranchPlus className='h-5 w-5 text-primary' />
                          {t('completeAccount.branchSetup', 'Define Initial Branches')}
                        </div>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            appendBranch({
                              name: '',
                              cityId: '',
                              address: '',
                              phone: '',
                            })
                          }
                        >
                          <Plus className='mr-1 h-4 w-4' />
                          {t('completeAccount.addBranch', 'Add Branch')}
                        </Button>
                      </div>

                      <p className='text-sm text-muted-foreground'>
                        {t(
                          'completeAccount.branchDesc',
                          'Add your business locations now, or skip and manage them later in settings.'
                        )}
                      </p>

                      {branchFields.length === 0 && (
                        <div className='flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 py-8 text-center'>
                          <MapPin className='h-10 w-10 text-muted-foreground/40' />
                          <p className='text-sm text-muted-foreground'>
                            {t('completeAccount.noBranches', 'No branches added yet')}
                          </p>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() =>
                              appendBranch({
                                name: '',
                                cityId: '',
                                address: '',
                                phone: '',
                              })
                            }
                          >
                            <Plus className='mr-1 h-4 w-4' />
                            {t('completeAccount.addFirst', 'Add your first branch')}
                          </Button>
                        </div>
                      )}

                      <div className='max-h-52 space-y-3 overflow-y-auto'>
                        {branchFields.map((field, index) => (
                          <motion.div
                            key={field.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className='space-y-3 rounded-xl border border-border/50 bg-background/30 p-4'
                          >
                            <div className='flex items-center justify-between'>
                              <span className='text-sm font-medium text-muted-foreground'>
                                Branch #{index + 1}
                              </span>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='h-7 w-7 text-destructive hover:text-destructive'
                                onClick={() => removeBranch(index)}
                              >
                                <Trash2 className='h-4 w-4' />
                              </Button>
                            </div>
                            <div className='grid grid-cols-2 gap-3'>
                              <FormField
                                control={form.control}
                                name={`branches.${index}.name`}
                                render={({ field: f }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        {...f}
                                        placeholder='Branch name'
                                        className='h-10 bg-background/50'
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`branches.${index}.cityId`}
                                render={({ field: f }) => (
                                  <FormItem>
                                    <SelectDropdown
                                      defaultValue={f.value}
                                      onValueChange={f.onChange}
                                      placeholder='Select city'
                                      className='h-10'
                                      items={cities.map((c) => ({
                                        label: `${c.name}${c.countries ? ` (${c.countries.name})` : ''}`,
                                        value: c.id,
                                      }))}
                                    />
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className='grid grid-cols-2 gap-3'>
                              <FormField
                                control={form.control}
                                name={`branches.${index}.address`}
                                render={({ field: f }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        {...f}
                                        placeholder='Address'
                                        className='h-10 bg-background/50'
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`branches.${index}.phone`}
                                render={({ field: f }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        {...f}
                                        placeholder='Phone'
                                        className='h-10 bg-background/50'
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <div className='flex gap-3 pt-4'>
                        <Button
                          type='button'
                          variant='outline'
                          size='lg'
                          className='w-1/3 text-base'
                          onClick={prevStep}
                        >
                          {t('completeAccount.back', 'Back')}
                        </Button>
                        <Button
                          type='button'
                          size='lg'
                          className='w-2/3 bg-primary text-base transition-all hover:bg-primary/90'
                          onClick={nextStep}
                        >
                          {branchFields.length === 0 ? (
                            <>
                              <SkipForward className='mr-2 h-4 w-4' />
                              {t('completeAccount.skip', 'Skip for now')}
                            </>
                          ) : (
                            <>
                              {t('completeAccount.continue', 'Continue')}
                              <ChevronRight className='ml-2 h-5 w-5' />
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* ─── Step 7: Team Setup & Final Submission ─── */}
                  {step === 7 && (
                    <motion.div
                      key='step7'
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className='space-y-4'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2 text-lg font-medium'>
                          <UserPlus className='h-5 w-5 text-primary' />
                          {t('completeAccount.teamSetup', 'Add Team Members')}
                        </div>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            appendUser({
                              email: '',
                              firstName: '',
                              lastName: '',
                              roleId: '',
                              branchId: '',
                            })
                          }
                        >
                          <Plus className='mr-1 h-4 w-4' />
                          {t('completeAccount.addUser', 'Add User')}
                        </Button>
                      </div>

                      <p className='text-sm text-muted-foreground'>
                        {t(
                          'completeAccount.teamDesc',
                          'Create accounts for your team. Temporary credentials will be generated.'
                        )}
                      </p>

                      {userFields.length === 0 && (
                        <div className='flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 py-8 text-center'>
                          <UserPlus className='h-10 w-10 text-muted-foreground/40' />
                          <p className='text-sm text-muted-foreground'>
                            {t('completeAccount.noUsers', 'No team members added yet')}
                          </p>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() =>
                              appendUser({
                                email: '',
                                firstName: '',
                                lastName: '',
                                roleId: '',
                                branchId: '',
                              })
                            }
                          >
                            <Plus className='mr-1 h-4 w-4' />
                            {t('completeAccount.addFirstUser', 'Add team member')}
                          </Button>
                        </div>
                      )}

                      <div className='max-h-52 space-y-3 overflow-y-auto'>
                        {userFields.map((field, index) => {
                          const formBranches = form.watch('branches') ?? []

                          return (
                            <motion.div
                              key={field.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className='space-y-3 rounded-xl border border-border/50 bg-background/30 p-4'
                            >
                              <div className='flex items-center justify-between'>
                                <span className='text-sm font-medium text-muted-foreground'>
                                  Team Member #{index + 1}
                                </span>
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='icon'
                                  className='h-7 w-7 text-destructive hover:text-destructive'
                                  onClick={() => removeUser(index)}
                                >
                                  <Trash2 className='h-4 w-4' />
                                </Button>
                              </div>
                              <FormField
                                control={form.control}
                                name={`users.${index}.email`}
                                render={({ field: f }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        {...f}
                                        type='email'
                                        placeholder='Email address'
                                        className='h-10 bg-background/50'
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className='grid grid-cols-2 gap-3'>
                                <FormField
                                  control={form.control}
                                  name={`users.${index}.firstName`}
                                  render={({ field: f }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          {...f}
                                          placeholder='First name'
                                          className='h-10 bg-background/50'
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`users.${index}.lastName`}
                                  render={({ field: f }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          {...f}
                                          placeholder='Last name'
                                          className='h-10 bg-background/50'
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className='grid grid-cols-2 gap-3'>
                                <FormField
                                  control={form.control}
                                  name={`users.${index}.roleId`}
                                  render={({ field: f }) => (
                                    <FormItem>
                                      <SelectDropdown
                                        defaultValue={f.value}
                                        onValueChange={f.onChange}
                                        placeholder='Select role'
                                        className='h-10'
                                        items={roles.map((r) => ({
                                          label: r.name,
                                          value: r.id,
                                        }))}
                                      />
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`users.${index}.branchId`}
                                  render={({ field: f }) => (
                                    <FormItem>
                                      <SelectDropdown
                                        defaultValue={f.value ?? ''}
                                        onValueChange={f.onChange}
                                        placeholder='Select branch'
                                        className='h-10'
                                        items={formBranches
                                          .filter((b) => b.name)
                                          .map((b, bIdx) => ({
                                            label: b.name,
                                            value: `pending_branch_${bIdx}`,
                                          }))}
                                      />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>

                      <div className='flex gap-3 pt-4'>
                        <Button
                          type='button'
                          variant='outline'
                          size='lg'
                          className='w-1/3 text-base'
                          onClick={prevStep}
                        >
                          {t('completeAccount.back', 'Back')}
                        </Button>
                        <Button
                          type='submit'
                          size='lg'
                          className='w-2/3 bg-linear-to-r from-blue-500 to-cyan-500 text-base shadow-blue-500/20 transition-all hover:from-blue-600 hover:to-cyan-600 hover:shadow-blue-500/30'
                          disabled={completeOnboardingMutation.isPending}
                        >
                          {completeOnboardingMutation.isPending ? (
                            <Loader2Icon className='mr-2 h-5 w-5 animate-spin' />
                          ) : (
                            <CheckCircle2 className='mr-2 h-5 w-5' />
                          )}
                          {t('completeAccount.completeSetup', 'Complete Setup')}
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
