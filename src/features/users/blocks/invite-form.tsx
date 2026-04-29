import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { inviteUserInputSchema } from '../data/schema'
import type { RoleWithPermissions } from '../data/types'
import { useInviteUser } from '../hooks/use-invitations'

const inviteFormSchema = inviteUserInputSchema.extend({
  roleId: z.string().min(1, 'Select a role'),
})

type InviteFormValues = z.infer<typeof inviteFormSchema>

interface InviteFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roles: RoleWithPermissions[]
}

export function InviteForm({
  open,
  onOpenChange,
  roles,
}: InviteFormProps) {
  const inviteMutation = useInviteUser()
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: '',
      roleId: '',
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset({
        email: '',
        roleId: '',
      })
    }
  }, [form, open])

  const onSubmit = (values: InviteFormValues) => {
    const selectedRole = roles.find((role) => role.id === values.roleId)
    inviteMutation.mutate(
      {
        email: values.email,
        roleId: values.roleId,
        roleName: selectedRole?.name,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>
            Send an email invitation and assign the initial role before the user
            joins the tenant.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex flex-col gap-5'
          >
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='manager@restaurant.com'
                      disabled={inviteMutation.isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='roleId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial role</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={inviteMutation.isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select a role' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='flex items-center justify-end gap-3'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={inviteMutation.isPending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={inviteMutation.isPending}>
                Send invitation
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
