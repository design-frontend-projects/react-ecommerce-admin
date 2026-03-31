import { Key, Edit, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

import { usePermissions } from '../hooks/use-roles-permissions'

export function PermissionsManagement() {
  const { data: permissions = [], isLoading } = usePermissions()

  if (isLoading) {
    return (
      <div className='space-y-4 rounded-md border p-4'>
        <div className='flex items-center justify-between'>
          <div>
            <Skeleton className='h-6 w-40 mb-2' />
            <Skeleton className='h-4 w-72' />
          </div>
          <Skeleton className='h-10 w-36' />
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
          <h3 className='text-lg font-medium'>System Permissions</h3>
          <p className='text-sm text-muted-foreground'>
            Granular permissions that can be aggregated into roles.
          </p>
        </div>
        <Button>
          <Plus className='mr-2 h-4 w-4' />
          Add Permission
        </Button>
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Permission Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((perm) => (
              <TableRow key={perm.id}>
                <TableCell className='font-medium'>
                  <div className='flex items-center gap-2'>
                    <Key className='h-4 w-4 text-orange-500' />
                    {perm.name}
                  </div>
                </TableCell>
                <TableCell>{perm.description}</TableCell>
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
