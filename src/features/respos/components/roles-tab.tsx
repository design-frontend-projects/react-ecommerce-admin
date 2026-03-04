import { useState } from 'react'
import { Plus, Shield, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCreateRole, useUpdateRole, useDeleteRole } from '../api/mutations'
import { useRoles } from '../api/queries'
import type { RoleFormValues } from '../schemas/role.schema'
import type { ResRole } from '../types'
import { RoleDialog } from './role-dialog'

export function RolesTab() {
  const { data: roles, isLoading } = useRoles()
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<ResRole | null>(null)
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null)

  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const deleteRole = useDeleteRole()

  const handleCreateRole = async (values: RoleFormValues) => {
    try {
      await createRole.mutateAsync(values)
      toast.success('Role created successfully')
      setIsRoleDialogOpen(false)
    } catch (error) {
      toast.error(`Failed to create role: ${(error as Error).message}`)
    }
  }

  const handleUpdateRole = async (values: RoleFormValues) => {
    if (!selectedRole) return
    try {
      await updateRole.mutateAsync({ id: selectedRole.id, ...values })
      toast.success('Role updated successfully')
      setIsRoleDialogOpen(false)
      setSelectedRole(null)
    } catch (error) {
      toast.error(`Failed to update role: ${(error as Error).message}`)
    }
  }

  const handleDeleteRole = async () => {
    if (!deleteRoleId) return
    try {
      await deleteRole.mutateAsync(deleteRoleId)
      toast.success('Role deleted successfully')
      setDeleteRoleId(null)
    } catch (error) {
      toast.error(`Failed to delete role: ${(error as Error).message}`)
    }
  }

  const handleEditRole = (role: ResRole) => {
    setSelectedRole(role)
    setIsRoleDialogOpen(true)
  }

  return (
    <>
      <RoleDialog
        open={isRoleDialogOpen}
        onOpenChange={(open) => {
          setIsRoleDialogOpen(open)
          if (!open) setSelectedRole(null)
        }}
        role={selectedRole}
        onSubmit={selectedRole ? handleUpdateRole : handleCreateRole}
      />

      <AlertDialog
        open={!!deleteRoleId}
        onOpenChange={(open) => {
          if (!open) setDeleteRoleId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this role? This action cannot be
              undone. Users assigned this role may lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              className='text-destructive-foreground bg-destructive hover:bg-destructive/90'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className='flex flex-col gap-4'>
        <div className='flex items-center justify-end'>
          <Button onClick={() => setIsRoleDialogOpen(true)}>
            <Plus className='mr-2 h-4 w-4' />
            Add Role
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Shield className='h-5 w-5 text-orange-500' />
              Roles ({roles?.length || 0})
            </CardTitle>
            <CardDescription>
              Define roles and their permissions for the POS system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className='text-center'>
                      Loading roles...
                    </TableCell>
                  </TableRow>
                ) : !roles || roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className='text-center'>
                      No roles defined yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <Badge variant='secondary'>
                          {role.name.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className='font-medium'>
                        {role.display_name}
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-wrap gap-1'>
                          {role.permissions.includes('*') ? (
                            <Badge variant='default'>All Permissions</Badge>
                          ) : (
                            role.permissions.slice(0, 4).map((perm) => (
                              <Badge key={perm} variant='outline'>
                                {perm}
                              </Badge>
                            ))
                          )}
                          {!role.permissions.includes('*') &&
                            role.permissions.length > 4 && (
                              <Badge variant='outline'>
                                +{role.permissions.length - 4} more
                              </Badge>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex items-center justify-end gap-1'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleEditRole(role)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => setDeleteRoleId(role.id)}
                            className='text-destructive hover:text-destructive'
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
