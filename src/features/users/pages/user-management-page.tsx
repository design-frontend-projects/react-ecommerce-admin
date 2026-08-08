import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldPlusIcon, UsersIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { InviteForm } from '../blocks/invite-form'
import { UserList } from '../blocks/user-list'
import { PermissionsManagement } from '../components/permissions-management'
import { UsersActionDialog } from '../components/users-action-dialog'
import { RolesManagement } from '../components/roles-management'
import { useRBACStore } from '../data/store'
import { useHasRole, useRBAC } from '../hooks/use-rbac'
import {
  useCreateRole,
  useDeleteRole,
  useRBACCatalog,
  useSetRolePermissions,
  useUpdateRole,
} from '../hooks/use-roles-permissions'
import { useUpdateUserRole, useUsersList } from '../hooks/use-users'

import { useSystemOwner } from '@/features/auth/hooks/use-system-owner'

export function UserManagementPage() {
  const { t } = useTranslation()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  
  const { isSuperAdminOwner } = useSystemOwner()
  const isSuperAdmin = useHasRole('super_admin')
  const isNormalAdmin = useHasRole('admin')
  const isAdmin = isSuperAdminOwner || isSuperAdmin || isNormalAdmin

  const hasUserReadAccess = useRBAC('users', 'read')
  const hasUserManageAccess = useRBAC('users', 'manage')
  const hasRolesManageAccess = useRBAC('roles', 'manage')
  const hasPermissionsManageAccess = useRBAC('permissions', 'manage')

  const canViewUsers = isSuperAdminOwner || hasUserReadAccess || isAdmin
  const canManageUsers = isSuperAdminOwner || hasUserManageAccess || isAdmin
  const canManageRoles = isSuperAdminOwner || hasRolesManageAccess || isAdmin
  const canManagePermissions = isSuperAdminOwner || hasPermissionsManageAccess || isAdmin

  const usersQuery = useUsersList(canViewUsers)
  const rbacCatalogQuery = useRBACCatalog(canViewUsers)
  const updateUserRoleMutation = useUpdateUserRole()
  const createRoleMutation = useCreateRole()
  const updateRoleMutation = useUpdateRole()
  const deleteRoleMutation = useDeleteRole()
  const setRolePermissionsMutation = useSetRolePermissions()
  const setCatalog = useRBACStore((state) => state.setCatalog)

  useEffect(() => {
    if (rbacCatalogQuery.data) {
      setCatalog({
        roles: rbacCatalogQuery.data.roles,
        permissions: rbacCatalogQuery.data.allPermissions,
      })
    }
  }, [rbacCatalogQuery.data, setCatalog])

  const roles = rbacCatalogQuery.data?.roles ?? []
  const permissions = rbacCatalogQuery.data?.allPermissions ?? []
  const users = usersQuery.data ?? []

  const stats = useMemo(() => {
    const invited = users.filter((user) => user.status === 'invited').length
    const active = users.filter((user) => user.status === 'active').length
    return {
      total: users.length,
      active,
      invited,
      roles: roles.length,
    }
  }, [roles.length, users])

  if (!canViewUsers) {
    return (
      <Main className='flex flex-1 items-center justify-center'>
        <Alert className='max-w-xl'>
          <AlertTitle>{t('users.accessRestrictedTitle')}</AlertTitle>
          <AlertDescription>
            {t('users.accessRestrictedDesc')}
          </AlertDescription>
        </Alert>
      </Main>
    )
  }

  return (
    <>
      <Header fixed>
        <div className='flex min-w-0 flex-1 items-center justify-between gap-4'>
          <div className='flex min-w-0 flex-col gap-1'>
            <p className='text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase'>
              {t('users.tenantSecurity')}
            </p>
            <h1 className='truncate text-lg font-semibold'>{t('users.title')}</h1>
          </div>
          {(canManageUsers || isAdmin) && (
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setCreateOpen(true)}
              >
                <ShieldPlusIcon className='mr-2 size-4' />
                {t('users.createUser')}
              </Button>
              <Button type='button' onClick={() => setInviteOpen(true)}>
                <UsersIcon className='mr-2 size-4' />
                {t('users.inviteUser')}
              </Button>
            </div>
          )}
        </div>
      </Header>
      <Main className='flex flex-1 flex-col gap-6'>
        <section className='flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 px-5 py-5'>
          <div className='flex flex-col gap-2'>
            <h2 className='text-2xl font-semibold tracking-tight'>
              {t('users.bannerTitle')}
            </h2>
            <p className='max-w-3xl text-sm text-muted-foreground'>
              {t('users.bannerDesc')}
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-3'>
            <Badge variant='outline'>{t('users.stats.users', { count: stats.total })}</Badge>
            <Badge variant='outline'>{t('users.stats.active', { count: stats.active })}</Badge>
            <Badge variant='outline'>{t('users.stats.invited', { count: stats.invited })}</Badge>
            <Badge variant='outline'>{t('users.stats.roles', { count: stats.roles })}</Badge>
          </div>
        </section>

        <Tabs defaultValue='users' className='flex flex-col gap-4'>
          <TabsList className='grid w-full max-w-xl grid-cols-3'>
            <TabsTrigger value='users'>{t('users.tabs.users')}</TabsTrigger>
            <TabsTrigger value='roles'>{t('users.tabs.roles')}</TabsTrigger>
            <TabsTrigger value='permissions'>{t('users.tabs.permissions')}</TabsTrigger>
          </TabsList>

          <TabsContent value='users' className='m-0'>
            <UserList
              users={users}
              roles={roles}
              isLoading={usersQuery.isLoading}
              canManageUsers={canManageUsers}
              permissions={canManagePermissions ? permissions : []}
              pendingUserId={updateUserRoleMutation.variables?.userId ?? null}
              onUpdateUserRole={(userId, roleId) =>
                updateUserRoleMutation.mutate({
                  userId,
                  roleIds: [roleId],
                })
              }
            />
          </TabsContent>

          <TabsContent value='roles' className='m-0'>
            <RolesManagement
              roles={roles}
              isLoading={rbacCatalogQuery.isLoading}
              isMutating={
                createRoleMutation.isPending ||
                updateRoleMutation.isPending ||
                deleteRoleMutation.isPending
              }
              permissions={permissions}
              onCreateRole={(input) => createRoleMutation.mutate(input)}
              onCreateRoleWithPermissions={
                canManagePermissions
                  ? async ({ name, description, permissionIds }) => {
                      const role = await createRoleMutation.mutateAsync({
                        name,
                        description,
                      })
                      if (permissionIds.length > 0) {
                        await setRolePermissionsMutation.mutateAsync({
                          roleId: role.id,
                          permissionIds,
                        })
                      }
                    }
                  : undefined
              }
              onUpdateRole={(input) => updateRoleMutation.mutate(input)}
              onDeleteRole={(roleId) => deleteRoleMutation.mutate(roleId)}
            />
          </TabsContent>

          <TabsContent value='permissions' className='m-0'>
            {canManageRoles && canManagePermissions ? (
              <PermissionsManagement
                roles={roles}
                permissions={permissions}
                isLoading={rbacCatalogQuery.isLoading}
                isSaving={setRolePermissionsMutation.isPending}
                onSave={(roleId, permissionIds) =>
                  setRolePermissionsMutation.mutate({
                    roleId,
                    permissionIds,
                  })
                }
              />
            ) : (
              <Alert>
                <UsersIcon className='size-4' />
                <AlertTitle>{t('users.permissionEditingRestrictedTitle')}</AlertTitle>
                <AlertDescription>
                  {t('users.permissionEditingRestrictedDesc')}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </Main>

      <InviteForm
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        roles={roles}
      />
      <UsersActionDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
