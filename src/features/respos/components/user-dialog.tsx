import { useRef, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useUploadAvatar, useDeleteAvatar } from '../api/mutations'
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
  pinCode: z
    .string()
    .length(6, 'PIN must be exactly 6 digits')
    .optional()
    .or(z.literal('')),
  idNumber: z.string().optional(),
  isActive: z.boolean().optional(),
  roles: z.array(z.string()).min(1, 'At least one role must be selected'),
})

type UserFormValues = z.infer<typeof userFormSchema>

interface UserFormProps {
  user?: ResEmployeeWithRoles | null
  onSubmit: (values: UserFormValues) => Promise<void>
  onCancel: () => void
}

function UserForm({ user, onSubmit, onCancel }: UserFormProps) {
  const { data: roles, isLoading: rolesLoading } = useRoles()
  const uploadAvatar = useUploadAvatar()
  const deleteAvatar = useDeleteAvatar()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize state directly from props since we use a key to remount
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatar_url || null
  )

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: user?.first_name || '',
      lastName: user?.last_name || '',
      email: user?.email || '',
      password: '',
      phone: user?.phone || '',
      pinCode: user?.pin_code || '',
      idNumber: user?.id_number || '',
      isActive: user?.is_active ?? true,
      roles: user?.roles.map((r) => r.id) || [],
    },
  })

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Preview immediately
    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)

    try {
      await uploadAvatar.mutateAsync({
        employeeId: user.id,
        file,
      })
      toast.success('Avatar updated successfully')
    } catch {
      toast.error('Failed to upload avatar')
      setAvatarPreview(user.avatar_url || null)
    }
  }

  const handleDeleteAvatar = async () => {
    if (!user?.avatar_url) return

    try {
      await deleteAvatar.mutateAsync({
        employeeId: user.id,
        avatarUrl: user.avatar_url,
      })
      setAvatarPreview(null)
      toast.success('Avatar removed')
    } catch {
      toast.error('Failed to remove avatar')
    }
  }

  const isEditing = !!user
  const initials = user
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : ''

  return (
    <div className='flex flex-col gap-6'>
      <DialogHeader>
        <DialogTitle>
          {isEditing ? 'Edit Employee' : 'Create Employee'}
        </DialogTitle>
        <DialogDescription>
          {isEditing
            ? 'Update employee profile, roles, and avatar.'
            : 'Add a new employee. This will create a Clerk account and restaurant profile.'}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-5'>
          {/* Avatar Section */}
          {isEditing && (
            <div className='flex items-center gap-4 rounded-lg border p-4'>
              <div className='group relative'>
                <Avatar className='h-16 w-16'>
                  <AvatarImage src={avatarPreview || ''} alt={initials} />
                  <AvatarFallback className='bg-orange-100 text-lg font-semibold text-orange-700'>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  type='button'
                  onClick={() => fileInputRef.current?.click()}
                  className='absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100'
                >
                  <Camera className='h-5 w-5 text-white' />
                </button>
              </div>
              <div className='flex flex-col gap-1.5'>
                <p className='text-sm font-medium'>Profile Photo</p>
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadAvatar.isPending}
                  >
                    {uploadAvatar.isPending ? (
                      <Loader2 className='mr-1 h-3 w-3 animate-spin' />
                    ) : (
                      <Upload className='mr-1 h-3 w-3' />
                    )}
                    Upload
                  </Button>
                  {user?.avatar_url && (
                    <Button
                      type='button'
                      size='sm'
                      variant='destructive'
                      onClick={handleDeleteAvatar}
                      disabled={deleteAvatar.isPending}
                    >
                      {deleteAvatar.isPending ? (
                        <Loader2 className='mr-1 h-3 w-3 animate-spin' />
                      ) : (
                        <Trash2 className='mr-1 h-3 w-3' />
                      )}
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/jpeg,image/png,image/webp'
                onChange={handleAvatarChange}
                className='hidden'
              />
            </div>
          )}

          {/* Name Fields */}
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

          {/* Email */}
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

          {/* Password (Create Only) */}
          {!isEditing && (
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input placeholder='••••••••' type='password' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Phone + PIN */}
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

          {/* ID Number */}
          <FormField
            control={form.control}
            name='idNumber'
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID Number (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder='National ID or passport number'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Active Status Toggle */}
          {isEditing && (
            <FormField
              control={form.control}
              name='isActive'
              render={({ field }) => (
                <FormItem>
                  <div className='flex items-center gap-3'>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <Label className='text-sm'>
                      {field.value ? 'Active' : 'Inactive'}
                    </Label>
                  </div>
                </FormItem>
              )}
            />
          )}

          {/* Roles */}
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
            <Button type='button' variant='outline' onClick={onCancel}>
              Cancel
            </Button>
            <Button type='submit' disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              {isEditing ? 'Save Changes' : 'Create Employee'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </div>
  )
}

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[550px]'>
        <UserForm
          key={user?.id ?? 'new'}
          user={user}
          onSubmit={async (values) => {
            await onSubmit({ ...values, id: user?.id })
            onOpenChange(false)
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
