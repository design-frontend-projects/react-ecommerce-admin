import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useUpdateUser } from '../api/mutations'
import { useResposAuth } from '../hooks'

const profileFormSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  pinCode: z.string().length(6, 'PIN must be exactly 6 digits').optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export function ResposProfile() {
  const { employee } = useResposAuth()
  const updateUser = useUpdateUser()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      pinCode: '',
    },
    mode: 'onChange',
  })

  useEffect(() => {
    if (employee) {
      form.reset({
        firstName: employee.first_name,
        lastName: employee.last_name,
        email: employee.email,
        phone: employee.phone || '',
        pinCode: employee.pin_code || '',
      })
    }
  }, [employee, form])

  const onSubmit = async (values: ProfileFormValues) => {
    if (!employee) return

    try {
      await updateUser.mutateAsync({
        id: employee.id,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        pinCode: values.pinCode,
        roles: employee.roles.map((r) => r.id), // Keep existing roles
      })
      toast.success('Profile updated successfully')
    } catch (error: unknown) {
      toast.error((error as Error).message)
    }
  }

  if (!employee) {
    return (
      <div className='flex h-screen items-center justify-center'>
        Loading profile...
      </div>
    )
  }

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <UserIcon className='h-5 w-5 text-orange-500' />
          <h1 className='text-lg font-semibold'>My Profile</h1>
        </div>
        <div className='ml-auto flex items-center gap-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mx-auto max-w-2xl space-y-6'>
          <div>
            <h3 className='text-lg font-medium'>Profile</h3>
            <p className='text-sm text-muted-foreground'>
              Manage your personal information and preferences.
            </p>
          </div>
          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your contact details and security PIN.
              </CardDescription>
            </CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4'>
                    <FormField
                      control={form.control}
                      name='firstName'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder='John' {...field} />
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
                  </div>

                  <FormField
                    control={form.control}
                    name='email'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='john.doe@example.com'
                            type='email'
                            {...field}
                            disabled
                          />
                        </FormControl>
                        <FormDescription>
                          Email address is managed by the administrator.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className='grid grid-cols-2 gap-4'>
                    <FormField
                      control={form.control}
                      name='phone'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder='+1234567890' {...field} />
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
                          <FormLabel>PIN Code</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='123456'
                              maxLength={6}
                              type='password'
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Your 6-digit PIN for POS access.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className='space-y-2'>
                    <FormLabel>Roles</FormLabel>
                    <div className='flex flex-wrap gap-2'>
                      {employee.roles.map((role) => (
                        <div
                          key={role.id}
                          className='rounded-md border bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground'
                        >
                          {role.display_name}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className='flex justify-end'>
                  <Button type='submit' disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </div>
      </Main>
    </>
  )
}
