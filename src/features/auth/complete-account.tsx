import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUser } from '@clerk/clerk-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ChevronRight, Loader2Icon, User, Phone } from 'lucide-react'
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
import { Logo } from '@/assets/logo'

const onboardingSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  phone: z.string().trim().optional(),
})

type OnboardingFormValues = z.infer<typeof onboardingSchema>

export function CompleteAccountFeature() {
  const { user } = useUser()
  const completeOnboardingMutation = useCompleteOnboarding()
  const [step, setStep] = useState(1)

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.primaryPhoneNumber?.phoneNumber ?? '',
    },
    mode: 'onChange',
  })

  const onSubmit = (values: OnboardingFormValues) => {
    if (!user?.id) return

    completeOnboardingMutation.mutate({
      clerkId: user.id,
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
    })
  }

  const nextStep = async () => {
    const isValid = await form.trigger(['firstName', 'lastName'])
    if (isValid) setStep(2)
  }

  const prevStep = () => setStep(1)

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
                Complete Your Profile
              </h2>
              <p className='text-sm text-muted-foreground'>
                Welcome to Bluewave POS! Let's get you set up.
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
            </div>
          </div>

          {/* Form Content */}
          <div className='p-8'>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
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
                        Personal Information
                      </div>
                      <FormField
                        control={form.control}
                        name='firstName'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
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
                            <FormLabel>Last Name</FormLabel>
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
                      <Button
                        type='button'
                        size='lg'
                        className='w-full text-base'
                        onClick={nextStep}
                        disabled={
                          !form.watch('firstName') || !form.watch('lastName')
                        }
                      >
                        Continue
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
                      <div className='flex items-center gap-2 text-lg font-medium'>
                        <Phone className='h-5 w-5 text-primary' />
                        Contact Details
                      </div>
                      <p className='text-sm text-muted-foreground'>
                        Optionally provide a phone number for your account.
                      </p>
                      <FormField
                        control={form.control}
                        name='phone'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
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
                      <div className='flex gap-3 pt-2'>
                        <Button
                          type='button'
                          variant='outline'
                          size='lg'
                          className='w-1/3 text-base'
                          onClick={prevStep}
                        >
                          Back
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
                          Complete Setup
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
