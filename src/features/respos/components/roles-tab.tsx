import { useState } from 'react'
import { Plus, Shield, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      toast.success(t('respos.role.success.created'))
      setIsRoleDialogOpen(false)
    } catch (error) {
      toast.error(
        `${t('respos.role.error.create')}: ${(error as Error).message}`
      )
    }
  }

  const handleUpdateRole = async (values: RoleFormValues) => {
    if (!selectedRole) return
    try {
      await updateRole.mutateAsync({ id: selectedRole.id, ...values })
      toast.success(t('respos.role.success.updated'))
      setIsRoleDialogOpen(false)
      setSelectedRole(null)
    } catch (error) {
      toast.error(
        `${t('respos.role.error.update')}: ${(error as Error).message}`
      )
    }
  }

  const handleDeleteRole = async () => {
    if (!deleteRoleId) return
    try {
      await deleteRole.mutateAsync(deleteRoleId)
      toast.success(t('respos.role.success.deleted'))
      setDeleteRoleId(null)
    } catch (error) {
      toast.error(
        `${t('respos.role.error.delete')}: ${(error as Error).message}`
      )
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
            <AlertDialogTitle>{t('respos.role.deleteRole')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('respos.role.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('respos.role.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {t('respos.role.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className='flex flex-col gap-4'>
        <div className='flex items-center justify-end'>
          <Button onClick={() => setIsRoleDialogOpen(true)}>
            <Plus className='mr-2 h-4 w-4' />
            {t('respos.role.addRole')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Shield className='h-5 w-5 text-orange-500' />
              {t('respos.role.roles')} ({roles?.length || 0})
            </CardTitle>
            <CardDescription>{t('respos.role.rolesDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('respos.role.table.roleName')}</TableHead>
                  <TableHead>{t('respos.role.table.displayName')}</TableHead>
                  <TableHead>{t('respos.role.table.permissions')}</TableHead>
                  <TableHead className='text-right'>
                    {t('respos.role.table.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className='text-center'>
                      {t('respos.role.table.loading')}
                    </TableCell>
                  </TableRow>
                ) : !roles || roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className='text-center'>
                      {t('respos.role.table.empty')}
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
                            <Badge variant='default'>
                              {t('respos.role.permissions.all')}
                            </Badge>
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
                                {t('respos.role.permissions.more', {
                                  count: role.permissions.length - 4,
                                })}
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
                            {t('respos.role.edit')}
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
