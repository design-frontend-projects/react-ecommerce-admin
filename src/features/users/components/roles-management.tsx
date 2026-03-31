import { Plus, Shield, ShieldAlert, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useRoles } from '../hooks/use-invitations'
import { Badge } from '@/components/ui/badge'

import { Skeleton } from '@/components/ui/skeleton'

export function RolesManagement() {
  const { data: roles = [], isLoading } = useRoles()

  if (isLoading) {
    return (
      <div className='space-y-4 rounded-md border p-4'>
        <div className='flex items-center justify-between'>
          <div>
            <Skeleton className='h-6 w-32 mb-2' />
            <Skeleton className='h-4 w-64' />
          </div>
          <Skeleton className='h-10 w-28' />
        </div>
        <div className='space-y-2 mt-4'>
          <Skeleton className='h-12 w-full' />
          <Skeleton className='h-12 w-full' />
          <Skeleton className='h-12 w-full' />
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-4 rounded-md border p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='text-lg font-medium'>System Roles</h3>
          <p className='text-sm text-muted-foreground'>
            Roles determine what permissions are automatically granted to users.
          </p>
        </div>
        <Button>
          <Plus className='mr-2 h-4 w-4' />
          Add Role
        </Button>
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className='font-medium'>
                  <div className='flex items-center gap-2'>
                    {role.name === 'superadmin' ? (
                      <ShieldAlert className='h-4 w-4 text-red-500' />
                    ) : (
                      <Shield className='h-4 w-4 text-blue-500' />
                    )}
                    {role.name}
                  </div>
                </TableCell>
                <TableCell>{role.description}</TableCell>
                <TableCell>
                  <Badge variant={role.is_active ? 'default' : 'secondary'}>
                    {role.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className='text-right'>
                  <Button variant='ghost' size='icon'>
                    <Edit className='h-4 w-4' />
                    <span className='sr-only'>Edit</span>
                  </Button>
                  <Button variant='ghost' size='icon'>
                    <Trash2 className='h-4 w-4 text-destructive' />
                    <span className='sr-only'>Delete</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
