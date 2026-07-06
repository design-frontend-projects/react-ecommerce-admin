import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useUser } from '@/hooks/use-auth'
import { useProfile, useUpdateProfile } from './profile-queries'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

const profileFormSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters.')
    .max(50, 'First name must not be longer than 50 characters.'),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters.')
    .max(50, 'Last name must not be longer than 50 characters.'),
  phone: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export function ProfileForm() {
  const { user } = useUser()
  const userId = user?.id

  const { data, isLoading } = useProfile(userId)
  const updateProfile = useUpdateProfile()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
    },
    mode: 'onChange',
  })

  useEffect(() => {
    if (data?.profile) {
      form.reset({
        firstName: data.profile.first_name || '',
        lastName: data.profile.last_name || '',
        phone: data.profile.phone || '',
      })
    }
  }, [data, form])

  if (isLoading || !userId) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  function onSubmit(values: ProfileFormValues) {
    if (!userId) return

    updateProfile.mutate(
      {
        userId,
        ...values,
      },
      {
        onSuccess: () => {
          toast.success('Profile updated', {
            description: 'Your profile has been successfully updated.',
          })
        },
        onError: (error) => {
          toast.error('Error', {
            description: error.message || 'Failed to update profile.',
          })
        },
      }
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="+1 (555) 000-0000" {...field} />
              </FormControl>
              <FormDescription>
                We will use this to contact you about your account.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Update profile
        </Button>
      </form>
    </Form>
  )
}
