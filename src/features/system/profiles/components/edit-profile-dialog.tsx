import * as React from 'react'
import { useTranslation } from 'react-i18next'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { type Profile, useUpdateProfile } from '../queries'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name is too short').max(100).nullable(),
  avatar_url: z.string().url('Invalid URL').nullable().or(z.literal('')),
})

type ProfileFormValues = z.infer<typeof profileSchema>

interface EditProfileDialogProps {
  profile: Profile | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditProfileDialog({
  profile,
  open,
  onOpenChange,
}: EditProfileDialogProps) {
  const { t } = useTranslation()
  const updateProfile = useUpdateProfile()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      avatar_url: profile?.avatar_url || '',
    },
  })

  React.useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name || '',
        avatar_url: profile.avatar_url || '',
      })
    }
  }, [profile, form])

  const onSubmit = (values: ProfileFormValues) => {
    if (!profile) return

    updateProfile.mutate(
      { id: profile.id, ...values },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>{t('system.profiles.editDialog.title')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='full_name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('system.profiles.editDialog.fullName')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('system.profiles.editDialog.fullNamePlaceholder')}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='avatar_url'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('system.profiles.editDialog.avatarUrl')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('system.profiles.editDialog.avatarUrlPlaceholder')}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={updateProfile.isPending}
              >
                {t('system.profiles.editDialog.cancel')}
              </Button>
              <Button type='submit' disabled={updateProfile.isPending}>
                {updateProfile.isPending ? t('system.profiles.editDialog.saving') : t('system.profiles.editDialog.saveChanges')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
