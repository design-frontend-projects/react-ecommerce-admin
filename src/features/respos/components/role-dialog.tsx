import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PERMISSIONS,
  ROLE_NAMES,
  roleFormSchema,
  type RoleFormValues,
} from '../schemas/role.schema'
import type { ResRole } from '../types'

interface RoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: ResRole | null
  onSubmit: (values: RoleFormValues) => void
}

export function RoleDialog({
  open,
  onOpenChange,
  role,
  onSubmit,
}: RoleDialogProps) {
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: 'cashier',
      display_name: '',
      permissions: [],
    },
  })

  useEffect(() => {
    if (role) {
      form.reset({
        name: role.name,
        display_name: role.display_name,
        permissions: role.permissions,
      })
    } else {
      form.reset({
        name: 'cashier',
        display_name: '',
        permissions: [],
      })
    }
  }, [role, form])

  const handleSubmit = (values: RoleFormValues) => {
    onSubmit(values)
  }

  const permissionLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    pos: 'POS',
    orders: 'Orders',
    menu: 'Menu',
    floors: 'Floors',
    reservations: 'Reservations',
    reservations_view: 'View Reservations',
    analytics: 'Analytics',
    shifts: 'Shifts',
    settings: 'Settings',
    payments: 'Payments',
    void_approve: 'Approve Voids',
    void_request: 'Request Voids',
    kitchen: 'Kitchen',
    notifications: 'Notifications',
    '*': 'All Permissions',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>{role ? 'Edit Role' : 'Create Role'}</DialogTitle>
          <DialogDescription>
            {role
              ? 'Update the role details and permissions.'
              : 'Define a new role with specific permissions.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className='space-y-4'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select a role name' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLE_NAMES.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name.replace('_', ' ').toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='display_name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g. Kitchen Staff' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='permissions'
              render={() => (
                <FormItem>
                  <FormLabel>Permissions</FormLabel>
                  <div className='grid grid-cols-2 gap-2 rounded-md border p-3'>
                    {PERMISSIONS.map((permission) => (
                      <FormField
                        key={permission}
                        control={form.control}
                        name='permissions'
                        render={({ field }) => (
                          <FormItem className='flex items-center gap-2 space-y-0'>
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(permission)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, permission])
                                  } else {
                                    field.onChange(
                                      field.value?.filter(
                                        (v) => v !== permission
                                      )
                                    )
                                  }
                                }}
                              />
                            </FormControl>
                            <Badge variant='outline' className='cursor-pointer'>
                              {permissionLabels[permission] || permission}
                            </Badge>
                          </FormItem>
                        )}
                      />
                    ))}
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
              <Button type='submit'>{role ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
