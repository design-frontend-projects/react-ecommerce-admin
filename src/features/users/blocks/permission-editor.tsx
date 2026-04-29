import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { PermissionRecord, RoleWithPermissions } from '../data/types'

interface PermissionEditorProps {
  role: RoleWithPermissions
  allPermissions: PermissionRecord[]
  isSaving?: boolean
  onSave: (roleId: string, permissionIds: string[]) => void
}

function groupPermissions(permissions: PermissionRecord[]) {
  return permissions.reduce<Record<string, PermissionRecord[]>>((groups, permission) => {
    const [resource] = permission.name.split('.')
    if (!groups[resource]) {
      groups[resource] = []
    }
    groups[resource].push(permission)
    return groups
  }, {})
}

export function PermissionEditor({
  role,
  allPermissions,
  isSaving = false,
  onSave,
}: PermissionEditorProps) {
  const groupedPermissions = useMemo(
    () => groupPermissions(allPermissions),
    [allPermissions]
  )
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>(
    role.permissions.map((permission) => permission.id)
  )

  useEffect(() => {
    setSelectedPermissionIds(role.permissions.map((permission) => permission.id))
  }, [role.id, role.permissions])

  return (
    <div className='flex flex-col gap-5 rounded-xl border border-border/70 bg-background p-5'>
      <div className='flex flex-col gap-1'>
        <h3 className='text-base font-semibold'>{role.name}</h3>
        <p className='text-sm text-muted-foreground'>
          Adjust granular access for this role. Changes propagate to active
          sessions through Supabase realtime updates.
        </p>
      </div>
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {Object.entries(groupedPermissions)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([resource, permissions]) => (
            <div
              key={resource}
              className='flex flex-col gap-3 rounded-lg border border-border/60 p-4'
            >
              <div className='flex flex-col gap-1'>
                <p className='text-sm font-medium capitalize'>{resource}</p>
                <p className='text-xs text-muted-foreground'>
                  {permissions.length} permission
                  {permissions.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className='flex flex-col gap-3'>
                {permissions
                  .slice()
                  .sort((left, right) => left.name.localeCompare(right.name))
                  .map((permission) => {
                    const checked = selectedPermissionIds.includes(permission.id)

                    return (
                      <label
                        key={permission.id}
                        className='flex items-start gap-3 rounded-md border border-border/50 px-3 py-2'
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            setSelectedPermissionIds((current) =>
                              value
                                ? [...current, permission.id]
                                : current.filter((id) => id !== permission.id)
                            )
                          }}
                          disabled={isSaving}
                        />
                        <span className='flex flex-col gap-1'>
                          <span className='text-sm font-medium'>{permission.name}</span>
                          {permission.description ? (
                            <span className='text-xs text-muted-foreground'>
                              {permission.description}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    )
                  })}
              </div>
            </div>
          ))}
      </div>
      <div className='flex items-center justify-end'>
        <Button
          type='button'
          disabled={isSaving}
          onClick={() => onSave(role.id, selectedPermissionIds)}
        >
          Save permissions
        </Button>
      </div>
    </div>
  )
}
