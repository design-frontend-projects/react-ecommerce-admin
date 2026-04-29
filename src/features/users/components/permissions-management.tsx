import { useMemo, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PermissionEditor } from '../blocks/permission-editor'
import type { PermissionRecord, RoleWithPermissions } from '../data/types'

interface PermissionsManagementProps {
  roles: RoleWithPermissions[]
  permissions: PermissionRecord[]
  isLoading?: boolean
  isSaving?: boolean
  onSave: (roleId: string, permissionIds: string[]) => void
}

export function PermissionsManagement({
  roles,
  permissions,
  isLoading = false,
  isSaving = false,
  onSave,
}: PermissionsManagementProps) {
  const initialRoleId = roles[0]?.id ?? ''
  const [selectedRoleId, setSelectedRoleId] = useState(initialRoleId)

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? roles[0],
    [roles, selectedRoleId]
  )

  if (isLoading) {
    return (
      <div className='flex flex-col gap-3'>
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className='h-14 w-full' />
        ))}
      </div>
    )
  }

  if (!selectedRole) {
    return null
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-4 md:flex-row md:items-center md:justify-between'>
        <div className='flex flex-col gap-1'>
          <h3 className='text-base font-semibold'>Permission mapping</h3>
          <p className='text-sm text-muted-foreground'>
            Choose a role, then assign the exact actions it can perform.
          </p>
        </div>
        <Select value={selectedRole.id} onValueChange={setSelectedRoleId}>
          <SelectTrigger className='w-full md:w-64'>
            <SelectValue placeholder='Select role' />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <PermissionEditor
        role={selectedRole}
        allPermissions={permissions}
        isSaving={isSaving}
        onSave={onSave}
      />
    </div>
  )
}
