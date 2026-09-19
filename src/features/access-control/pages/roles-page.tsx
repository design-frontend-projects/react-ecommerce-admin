'use client'

import { useState } from 'react'
import { WandSparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search as TopSearch } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { RoleWizardDialog } from '@/features/users/components/role-wizard-dialog'
import { RolesManagement } from '@/features/users/components/roles-management'
import {
  useCreateRole,
  useDeleteRole,
  useRBACCatalog,
  useSetRolePermissions,
  useUpdateRole,
} from '@/features/users/hooks/use-roles-permissions'

export function RolesPage() {
  const { t } = useTranslation()
  const { data: catalog, isLoading } = useRBACCatalog()
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const deleteRole = useDeleteRole()
  const setRolePermissions = useSetRolePermissions()

  const [isWizardOpen, setIsWizardOpen] = useState(false)

  const roles = catalog?.roles ?? []
  const permissions = catalog?.allPermissions ?? []

  const handleCreateRoleWithPermissions = async (input: {
    name: string
    description?: string
    permissionIds: string[]
  }) => {
    const newRole = await createRole.mutateAsync({
      name: input.name,
      description: input.description,
    })

    if (input.permissionIds.length > 0 && newRole?.id) {
      await setRolePermissions.mutateAsync({
        roleId: newRole.id,
        permissionIds: input.permissionIds,
      })
    }
  }

  return (
    <>
      <Header fixed>
        <TopSearch />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>
              {t('accessControl.roles.title', 'Roles Management')}
            </h1>
            <p className='text-sm text-muted-foreground'>
              {t(
                'accessControl.roles.desc',
                'Create and configure tenant roles, assign permissions, and structure access.'
              )}
            </p>
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              onClick={() => setIsWizardOpen(true)}
              className='gap-2'
            >
              <WandSparkles className='h-4 w-4 text-primary' />
              <span>
                {t('accessControl.roles.wizardBtn', 'Guided Role Wizard')}
              </span>
            </Button>
          </div>
        </div>

        <RolesManagement
          roles={roles}
          isLoading={isLoading}
          isMutating={
            createRole.isPending || updateRole.isPending || deleteRole.isPending
          }
          onCreateRole={(input) => createRole.mutate(input)}
          onUpdateRole={(input) => updateRole.mutate(input)}
          onDeleteRole={(roleId) => deleteRole.mutate(roleId)}
          permissions={permissions}
          onCreateRoleWithPermissions={handleCreateRoleWithPermissions}
        />

        <RoleWizardDialog
          open={isWizardOpen}
          onOpenChange={setIsWizardOpen}
          permissions={permissions}
          isSubmitting={createRole.isPending || setRolePermissions.isPending}
          onSubmit={async (input) => {
            await handleCreateRoleWithPermissions(input)
            setIsWizardOpen(false)
          }}
        />
      </Main>
    </>
  )
}
