import { useEffect, useState } from 'react'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DEFAULT_ROLE_PERMISSION_NAMES } from '../data/rbac'
import type { RoleWithPermissions } from '../data/types'

interface RolesManagementProps {
  roles: RoleWithPermissions[]
  isLoading?: boolean
  onCreateRole: (input: { name: string; description?: string }) => void
  onUpdateRole: (input: {
    id: string
    name: string
    description?: string
    is_active?: boolean
  }) => void
  onDeleteRole: (roleId: string) => void
  isMutating?: boolean
}

function isSystemRole(roleName: string) {
  return Object.prototype.hasOwnProperty.call(DEFAULT_ROLE_PERMISSION_NAMES, roleName)
}

export function RolesManagement({
  roles,
  isLoading = false,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  isMutating = false,
}: RolesManagementProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (!dialogOpen) {
      setEditingRole(null)
      setName('')
      setDescription('')
      setIsActive(true)
      return
    }

    if (editingRole) {
      setName(editingRole.name)
      setDescription(editingRole.description ?? '')
      setIsActive(editingRole.is_active ?? true)
    }
  }, [dialogOpen, editingRole])

  const submit = () => {
    if (!name.trim()) {
      return
    }

    if (editingRole) {
      onUpdateRole({
        id: editingRole.id,
        name,
        description,
        is_active: isActive,
      })
    } else {
      onCreateRole({
        name,
        description,
      })
    }

    setDialogOpen(false)
  }

  if (isLoading) {
    return (
      <div className='flex flex-col gap-3'>
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className='h-14 w-full' />
        ))}
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between rounded-xl border border-border/70 bg-card/60 px-4 py-4'>
        <div className='flex flex-col gap-1'>
          <h3 className='text-base font-semibold'>Role catalog</h3>
          <p className='text-sm text-muted-foreground'>
            Create tenant-specific roles or edit the default operational roles.
          </p>
        </div>
        <Button
          type='button'
          onClick={() => {
            setEditingRole(null)
            setDialogOpen(true)
          }}
        >
          <PlusIcon data-icon='inline-start' />
          New role
        </Button>
      </div>
      <div className='overflow-hidden rounded-xl border border-border/70'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>
                  <div className='flex flex-col gap-1'>
                    <span className='font-medium'>{role.name}</span>
                    {isSystemRole(role.name) ? (
                      <span className='text-xs text-muted-foreground'>
                        Default system role
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>{role.description || 'No description'}</TableCell>
                <TableCell>{role.permissions.length}</TableCell>
                <TableCell>{role.is_active ? 'Active' : 'Inactive'}</TableCell>
                <TableCell className='text-right'>
                  <div className='flex items-center justify-end gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        setEditingRole(role)
                        setDialogOpen(true)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      disabled={isSystemRole(role.name)}
                      onClick={() => onDeleteRole(role.id)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit role' : 'Create role'}</DialogTitle>
            <DialogDescription>
              Role permissions are edited separately so the catalog stays easy to
              scan.
            </DialogDescription>
          </DialogHeader>
          <div className='flex flex-col gap-5'>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='role-name'>Role name</Label>
              <Input
                id='role-name'
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder='branch_supervisor'
                disabled={isMutating}
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='role-description'>Description</Label>
              <Input
                id='role-description'
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder='Operational lead for a single branch.'
                disabled={isMutating}
              />
            </div>
            {editingRole ? (
              <div className='flex items-center justify-between rounded-lg border border-border/60 px-3 py-3'>
                <div className='flex flex-col gap-1'>
                  <span className='text-sm font-medium'>Active status</span>
                  <span className='text-xs text-muted-foreground'>
                    Inactive roles remain visible but should not be assigned.
                  </span>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            ) : null}
            <div className='flex items-center justify-end gap-3'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setDialogOpen(false)}
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button type='button' onClick={submit} disabled={isMutating}>
                {editingRole ? 'Save role' : 'Create role'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
