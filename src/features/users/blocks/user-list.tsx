import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RoleWithPermissions, User } from '../data/types'

interface UserListProps {
  users: User[]
  roles: RoleWithPermissions[]
  isLoading?: boolean
  canManageUsers: boolean
  pendingUserId?: string | null
  onUpdateUserRole: (userId: string, roleId: string) => void
}

function statusVariant(status: User['status']) {
  switch (status) {
    case 'active':
      return 'default'
    case 'invited':
      return 'secondary'
    default:
      return 'outline'
  }
}

export function UserList({
  users,
  roles,
  isLoading = false,
  canManageUsers,
  pendingUserId,
  onUpdateUserRole,
}: UserListProps) {
  if (isLoading) {
    return (
      <div className='flex flex-col gap-3'>
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className='h-14 w-full' />
        ))}
      </div>
    )
  }

  return (
    <div className='overflow-hidden rounded-xl border border-border/70'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Team member</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className='text-right'>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className='py-12 text-center text-sm text-muted-foreground'>
                No users found for this tenant yet.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => {
              const fullName =
                `${user.firstName} ${user.lastName}`.trim() || user.username
              const selectedRoleId =
                roles.find((role) => role.name === user.role)?.id ??
                user.roleIds[0] ??
                ''

              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className='flex flex-col gap-1'>
                      <span className='font-medium'>{fullName}</span>
                      <span className='text-xs text-muted-foreground'>
                        {user.roleNames.join(', ') || 'No assigned role'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(user.status)}>{user.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {canManageUsers ? (
                      <Select
                        value={selectedRoleId}
                        onValueChange={(roleId) => onUpdateUserRole(user.id, roleId)}
                        disabled={pendingUserId === user.id}
                      >
                        <SelectTrigger className='w-44'>
                          <SelectValue placeholder='Choose role' />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant='outline'>{user.role}</Badge>
                    )}
                  </TableCell>
                  <TableCell className='text-sm text-muted-foreground'>
                    {new Date(user.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className='text-right'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      disabled
                    >
                      {user.status === 'invited' ? 'Pending invite' : 'Managed'}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
