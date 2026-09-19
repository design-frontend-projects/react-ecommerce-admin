import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Users as UsersIcon,
  UserCheck,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { LanguageSwitch } from '@/components/language-switch'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { type NavigateFn } from '@/hooks/use-table-url-state'
import { UsersTable } from '../components/users-table'
import { UsersPrimaryButtons } from '../components/users-primary-buttons'
import { UsersDialogs } from '../components/users-dialogs'
import { UsersProvider } from '../components/users-provider'
import { PermissionsManagement } from '../components/permissions-management'
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
import { useUsersList } from '../hooks/use-users'
import { useSystemOwner } from '@/features/auth/hooks/use-system-owner'

type UserManagementPageProps = {
  search?: Record<string, unknown>
  navigate?: NavigateFn
}

function UserManagementContent({ search = {}, navigate = (() => {}) as NavigateFn }: UserManagementPageProps) {
  const { t } = useTranslation()

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
        <Search />
        <div className='ms-auto flex items-center space-x-3 sm:space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-6 p-4 md:p-6'>
        {/* Title & Primary Action Buttons */}
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2'>
              <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <UsersIcon className='h-5 w-5' />
              </div>
              <h2 className='text-2xl sm:text-3xl font-bold tracking-tight text-foreground'>
                {t('users.title')}
              </h2>
            </div>
            <p className='text-xs sm:text-sm text-muted-foreground'>
              {t(
                'users.subtitle',
                'Manage tenant users, assign roles, enforce location boundaries, and monitor security.'
              )}
            </p>
          </div>
          {(canManageUsers || isAdmin) && <UsersPrimaryButtons />}
        </div>

        {/* Analytics & KPI Cards */}
        <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
          <Card className='p-4'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-medium text-muted-foreground'>
                {t('users.stats.totalUsers', 'Total Users')}
              </span>
              <UsersIcon className='h-4 w-4 text-muted-foreground' />
            </div>
            <div className='mt-2 text-2xl font-bold'>{stats.total}</div>
          </Card>
          <Card className='p-4'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-medium text-muted-foreground'>
                {t('users.stats.activeUsers', 'Active Users')}
              </span>
              <UserCheck className='h-4 w-4 text-emerald-500' />
            </div>
            <div className='mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400'>
              {stats.active}
            </div>
          </Card>
          <Card className='p-4'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-medium text-muted-foreground'>
                {t('users.stats.pendingInvites', 'Invited')}
              </span>
              <Mail className='h-4 w-4 text-amber-500' />
            </div>
            <div className='mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400'>
              {stats.invited}
            </div>
          </Card>
          <Card className='p-4'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-medium text-muted-foreground'>
                {t('users.stats.rolesCount', 'Roles')}
              </span>
              <ShieldCheck className='h-4 w-4 text-primary' />
            </div>
            <div className='mt-2 text-2xl font-bold'>{stats.roles}</div>
          </Card>
        </div>

        {/* Tabs for Users, Roles, and Permissions */}
        <Tabs defaultValue='users' className='flex flex-col gap-4'>
          <TabsList className='grid w-full max-w-xl grid-cols-3'>
            <TabsTrigger value='users'>{t('users.tabs.users')}</TabsTrigger>
            <TabsTrigger value='roles'>{t('users.tabs.roles')}</TabsTrigger>
            <TabsTrigger value='permissions'>{t('users.tabs.permissions')}</TabsTrigger>
          </TabsList>

          <TabsContent value='users' className='m-0'>
            <UsersTable
              data={users}
              search={search}
              navigate={navigate}
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

      <UsersDialogs />
    </>
  )
}

export function UserManagementPage(props: UserManagementPageProps) {
  return (
    <UsersProvider>
      <UserManagementContent {...props} />
    </UsersProvider>
  )
}
