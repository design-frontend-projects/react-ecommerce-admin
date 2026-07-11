import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useRoles } from '../api/queries'
import type { ResEmployeeWithRoles } from '../types'

const createUserFormSchema = (t: TFunction) => z.object({
  firstName: z.string().min(2, t('respos.users.error.firstName')),
  lastName: z.string().min(2, t('respos.users.error.lastName')),
  email: z.string().email(t('respos.users.error.email')),
  password: z
    .string()
    .min(8, t('respos.users.error.password'))
    .optional(),
  phone: z.string().optional(),
  pinCode: z.string().length(6, t('respos.users.error.pin')).optional(),
  roles: z.array(z.string()).min(1, t('respos.users.error.roles')),
})

type UserFormValues = z.infer<ReturnType<typeof createUserFormSchema>>

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: ResEmployeeWithRoles | null
  onSubmit: (values: UserFormValues & { id?: string }) => Promise<void>
}

export function UserDialog({
  open,
  onOpenChange,
  user,
  onSubmit,
}: UserDialogProps) {
  const { t } = useTranslation()
  const { data: roles, isLoading: rolesLoading } = useRoles()

  const form = useForm<UserFormValues>({
    resolver: zodResolver(createUserFormSchema(t)),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      pinCode: '',
      roles: [],
    },
  })

  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone || '',
        pinCode: user.pin_code || '',
        roles: user.roles.map((r) => r.id),
      })
    } else {
      form.reset({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        pinCode: '',
        roles: [],
      })
    }
  }, [user, form])

  const handleSubmit = async (values: UserFormValues) => {
    await onSubmit({ ...values, id: user?.id })
    onOpenChange(false)
  }

  const isEditing = !!user

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{isEditing ? t('respos.users.editUser') : t('respos.users.createUser')}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('respos.users.editDesc')
              : t('respos.users.createDesc')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className='space-y-4'
          >
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='firstName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('respos.users.firstName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('respos.users.firstNamePlaceholder')} {...field} />
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
                    <FormLabel>{t('respos.users.lastName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('respos.users.lastNamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('respos.users.email')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('respos.users.emailPlaceholder')}
                      type='email'
                      {...field}
                      disabled={isEditing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('respos.users.password')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='••••••••'
                        type='password'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='phone'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('respos.users.phone')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('respos.users.phonePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='pinCode'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('respos.users.pinCode')}</FormLabel>
                    <FormControl>
                      <Input placeholder='123456' maxLength={6} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='roles'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('respos.users.roles')}</FormLabel>
                  <div className='grid grid-cols-2 gap-2 rounded-md border p-3'>
                    {rolesLoading ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      roles?.map((role) => (
                        <div
                          key={role.id}
                          className='flex items-center space-x-2'
                        >
                          <input
                            type='checkbox'
                            id={role.id}
                            checked={field.value.includes(role.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                field.onChange([...field.value, role.id])
                              } else {
                                field.onChange(
                                  field.value.filter((id) => id !== role.id)
                                )
                              }
                            }}
                            className='h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500'
                          />
                          <label
                            htmlFor={role.id}
                            className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                          >
                            {role.display_name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
              >
                {t('respos.users.cancel')}
              </Button>
              <Button type='submit' disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                {isEditing ? t('respos.users.saveChanges') : t('respos.users.createUser')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
