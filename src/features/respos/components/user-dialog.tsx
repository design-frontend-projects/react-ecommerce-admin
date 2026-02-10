import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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

const userFormSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .optional(),
  phone: z.string().optional(),
  pinCode: z.string().length(6, 'PIN must be exactly 6 digits').optional(),
  roles: z.array(z.string()).min(1, 'At least one role must be selected'),
})

type UserFormValues = z.infer<typeof userFormSchema>

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
  const { data: roles, isLoading: rolesLoading } = useRoles()

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
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
          <DialogTitle>{isEditing ? 'Edit User' : 'Create User'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update user details and role assignments.'
              : 'Add a new user to the system. This will create a Clerk account and restaurant profile.'}
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
                    <FormLabel>Password</FormLabel>
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
                    <FormLabel>Phone (Optional)</FormLabel>
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
                    <FormLabel>PIN Code (6 digits)</FormLabel>
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
                  <FormLabel>Roles</FormLabel>
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
                Cancel
              </Button>
              <Button type='submit' disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                {isEditing ? 'Save Changes' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
