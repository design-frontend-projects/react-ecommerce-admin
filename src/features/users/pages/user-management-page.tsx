import { useEffect, useMemo, useState } from 'react'
import { ShieldPlusIcon, UsersIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { InviteForm } from '../blocks/invite-form'
import { UserList } from '../blocks/user-list'
import { RolesManagement } from '../components/roles-management'
import { PermissionsManagement } from '../components/permissions-management'
import { RBACGuard } from '../components/rbac-guard'
import { useRBACCatalog } from '../hooks/use-roles-permissions'
import {
  useCreateRole,
  useDeleteRole,
  useSetRolePermissions,
  useUpdateRole,
} from '../hooks/use-roles-permissions'
import { useRBAC } from '../hooks/use-rbac'
import { useUpdateUserRole, useUsersList } from '../hooks/use-users'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { useRBACStore } from '../data/store'

export function UserManagementPage() {
  const [inviteOpen, setInviteOpen] = useState(false)
  const canViewUsers = useRBAC('users', 'read')
  const canManageUsers = useRBAC('users', 'manage')
  const canManageRoles = useRBAC('roles', 'manage')
  const canManagePermissions = useRBAC('permissions', 'manage')

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
          <AlertTitle>Access restricted</AlertTitle>
          <AlertDescription>
            Your account can use the product, but it does not have permission to
            view tenant users or RBAC settings.
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
            <p className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>
              Tenant security
            </p>
            <h1 className='truncate text-lg font-semibold'>Users and access</h1>
          </div>
          <RBACGuard resource='users' action='manage'>
            <Button type='button' onClick={() => setInviteOpen(true)}>
              <ShieldPlusIcon data-icon='inline-start' />
              Invite user
            </Button>
          </RBACGuard>
        </div>
      </Header>
      <Main className='flex flex-1 flex-col gap-6'>
        <section className='flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 px-5 py-5'>
          <div className='flex flex-col gap-2'>
            <h2 className='text-2xl font-semibold tracking-tight'>
              Access stays explicit, visible, and reversible.
            </h2>
            <p className='max-w-3xl text-sm text-muted-foreground'>
              Invite teammates, assign operational roles, and update permission
              maps without leaving the dashboard. Realtime updates keep active
              sessions aligned with the latest role model.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-3'>
            <Badge variant='outline'>{stats.total} users</Badge>
            <Badge variant='outline'>{stats.active} active</Badge>
            <Badge variant='outline'>{stats.invited} invited</Badge>
            <Badge variant='outline'>{stats.roles} roles</Badge>
          </div>
        </section>

        <Tabs defaultValue='users' className='flex flex-col gap-4'>
          <TabsList className='grid w-full max-w-xl grid-cols-3'>
            <TabsTrigger value='users'>Users</TabsTrigger>
            <TabsTrigger value='roles'>Roles</TabsTrigger>
            <TabsTrigger value='permissions'>Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value='users' className='m-0'>
            <UserList
              users={users}
              roles={roles}
              isLoading={usersQuery.isLoading}
              canManageUsers={canManageUsers}
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
              onCreateRole={(input) => createRoleMutation.mutate(input)}
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
                <AlertTitle>Permission editing is restricted</AlertTitle>
                <AlertDescription>
                  Only administrators with both role and permission management
                  rights can change the RBAC matrix.
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
    </>
  )
}
