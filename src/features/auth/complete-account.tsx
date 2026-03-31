import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUser } from '@clerk/clerk-react'
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
import { Main } from '@/components/layout/main'
import { Header } from '@/components/layout/header'
import { useCompleteOnboarding } from './hooks/use-onboarding'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
})

type OnboardingFormValues = z.infer<typeof formSchema>

export function CompleteAccountFeature() {
  const { user } = useUser()
  const completeOnboarding = useCompleteOnboarding()

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phoneNumber: user?.primaryPhoneNumber?.phoneNumber || '',
    },
  })

  // Using optional chaining because clerk user object loads asynchronously
  const isPending = completeOnboarding.isPending

  const onSubmit = (values: OnboardingFormValues) => {
    completeOnboarding.mutate({
      userId: user?.id,
      ...values,
    })
  }

  return (
    <>
      <Header fixed>
        <div className='flex items-center space-x-4'>
          <h2 className='text-lg font-semibold'>Complete Account Setup</h2>
        </div>
      </Header>
      <Main className='flex flex-1 items-center justify-center p-4 sm:p-6'>
        <div className='w-full max-w-md space-y-8 rounded-lg border bg-card p-6 shadow-sm'>
          <div className='flex flex-col space-y-2 text-center'>
            <h1 className='text-2xl font-semibold tracking-tight'>Welcome aboard!</h1>
            <p className='text-sm text-muted-foreground'>
              Please confirm your details to finish setting up your account.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <div className='space-y-4'>
                <FormField
                  control={form.control}
                  name='firstName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder='Jane' {...field} />
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
                        <Input placeholder='Doe' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='phoneNumber'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder='+123456789' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type='submit' className='w-full' disabled={isPending}>
                {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Complete Setup
              </Button>
            </form>
          </Form>
        </div>
      </Main>
    </>
  )
}
