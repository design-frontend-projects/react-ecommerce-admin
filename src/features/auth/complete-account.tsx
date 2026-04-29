import { zodResolver } from '@hookform/resolvers/zod'
import { useUser } from '@clerk/clerk-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
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
import { Loader2Icon } from 'lucide-react'
import { useCompleteOnboarding } from './hooks/use-onboarding'

const onboardingSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  phone: z.string().trim().optional(),
})

type OnboardingFormValues = z.infer<typeof onboardingSchema>

export function CompleteAccountFeature() {
  const { user } = useUser()
  const completeOnboardingMutation = useCompleteOnboarding()

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.primaryPhoneNumber?.phoneNumber ?? '',
    },
  })

  const onSubmit = (values: OnboardingFormValues) => {
    if (!user?.id) {
      return
    }

    completeOnboardingMutation.mutate({
      clerkId: user.id,
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
    })
  }

  return (
    <>
      <Header fixed>
        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <p className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Invitation onboarding
          </p>
          <h1 className='truncate text-lg font-semibold'>Complete your account</h1>
        </div>
      </Header>
      <Main className='flex flex-1 items-center justify-center'>
        <section className='w-full max-w-lg rounded-2xl border border-border/70 bg-card/70 p-6 shadow-sm'>
          <div className='flex flex-col gap-2'>
            <h2 className='text-2xl font-semibold tracking-tight'>
              Finish the tenant setup
            </h2>
            <p className='text-sm text-muted-foreground'>
              Confirm your profile details so the invitation can be linked to the
              correct tenant record and role assignment.
            </p>
          </div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className='mt-6 flex flex-col gap-5'
            >
              <FormField
                control={form.control}
                name='firstName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder='Mariam' />
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
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder='Hassan' />
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
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder='+20 100 000 0000' />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type='submit' disabled={completeOnboardingMutation.isPending}>
                {completeOnboardingMutation.isPending ? (
                  <Loader2Icon data-icon='inline-start' className='animate-spin' />
                ) : null}
                Complete setup
              </Button>
            </form>
          </Form>
        </section>
      </Main>
    </>
  )
}
