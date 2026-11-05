import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Mail, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useUser } from '@/hooks/use-auth'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useProfile, useUpdateProfile } from './profile-queries'

const profileFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters.')
    .max(50, 'First name must not be longer than 50 characters.'),
  lastName: z
    .string()
    .trim()
    .min(2, 'Last name must be at least 2 characters.')
    .max(50, 'Last name must not be longer than 50 characters.'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9\s\-()]{7,20})?$/, 'Please enter a valid phone number.')
    .optional()
    .or(z.literal('')),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export function ProfileForm() {
  const { t } = useTranslation()
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
      <div className='flex h-[200px] items-center justify-center'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    )
  }

  const profileData = data?.profile
  const email = profileData?.email || user?.email || ''
  const roleName = profileData?.default_role || profileData?.role || 'Staff'
  const displayName = `${profileData?.first_name || ''} ${profileData?.last_name || ''}`.trim() || 'User'
  const initials = `${profileData?.first_name?.[0] || 'U'}${profileData?.last_name?.[0] || ''}`.toUpperCase()

  function onSubmit(values: ProfileFormValues) {
    if (!userId) return

    updateProfile.mutate(
      {
        userId,
        ...values,
      },
      {
        onSuccess: () => {
          toast.success(t('settings.profile.updated', 'Profile updated successfully'), {
            description: t(
              'settings.common.savedSuccess',
              'Your profile has been successfully updated.'
            ),
          })
        },
        onError: (error) => {
          toast.error(t('settings.common.savedError', 'Error'), {
            description: error.message || t('settings.common.savedError', 'Failed to update profile.'),
          })
        },
      }
    )
  }

  return (
    <div className='space-y-6'>
      {/* ─── Identity Summary Card ─────────────────────────────────── */}
      <Card className='border bg-muted/30'>
        <CardContent className='flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-4'>
            <Avatar className='h-14 w-14 border-2 border-primary/20'>
              <AvatarImage src={profileData?.avatar_url} alt={displayName} />
              <AvatarFallback className='bg-primary/10 text-base font-semibold text-primary'>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className='space-y-1'>
              <h4 className='text-base font-semibold leading-none'>
                {displayName}
              </h4>
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                <Mail className='h-3.5 w-3.5' />
                <span>{email || t('settings.profile.emailReadOnly', 'No email registered')}</span>
              </div>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='gap-1 border-primary/30 px-2.5 py-1 text-xs'>
              <Shield className='h-3 w-3 text-primary' />
              <span className='capitalize'>{roleName}</span>
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ─── Profile Form ──────────────────────────────────────────── */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <FormField
              control={form.control}
              name='firstName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.profile.firstName', 'First Name')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('settings.profile.firstNamePlaceholder', 'John')}
                      {...field}
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
                  <FormLabel>{t('settings.profile.lastName', 'Last Name')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('settings.profile.lastNamePlaceholder', 'Doe')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name='phone'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settings.profile.phone', 'Phone Number')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('settings.profile.phonePlaceholder', '+1 (555) 000-0000')}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormDescription>
                  {t(
                    'settings.profile.phoneDesc',
                    'We will use this to contact you about your account.'
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type='submit'
            disabled={updateProfile.isPending}
            className='flex items-center gap-2'
          >
            {updateProfile.isPending ? (
              <>
                <Loader2 className='me-2 h-4 w-4 animate-spin' />
                {t('settings.profile.updating', 'Updating profile...')}
              </>
            ) : (
              t('settings.profile.submit', 'Update profile')
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
