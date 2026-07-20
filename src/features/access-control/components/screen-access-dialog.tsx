import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Can } from '@/components/rbac/Can'
import type { Permission, Role } from '@/features/users/data/schema'
import type { PermissionButton, Screen } from '../data/schema'
import { useSetScreenAccess, useSetScreenButtons } from '../hooks/use-screens'

interface CheckboxListProps {
  idPrefix: string
  items: Array<{ id: string; label: string; hint?: string | null }>
  selected: ReadonlySet<string>
  onToggle: (id: string, checked: boolean) => void
  emptyMessage: string
}

function CheckboxList({
  idPrefix,
  items,
  selected,
  onToggle,
  emptyMessage,
}: CheckboxListProps) {
  if (items.length === 0) {
    return <p className='text-sm text-muted-foreground'>{emptyMessage}</p>
  }

  return (
    <ScrollArea className='h-48 rounded-md border p-3'>
      <div className='flex flex-col gap-2'>
        {items.map((item) => {
          const inputId = `${idPrefix}-${item.id}`
          return (
            <div key={item.id} className='flex items-start gap-2'>
              <Checkbox
                id={inputId}
                checked={selected.has(item.id)}
                onCheckedChange={(checked) =>
                  onToggle(item.id, checked === true)
                }
              />
              <Label
                htmlFor={inputId}
                className='flex cursor-pointer flex-col items-start gap-0.5 text-sm font-normal'
              >
                <span>{item.label}</span>
                {item.hint ? (
                  <span className='text-xs text-muted-foreground'>
                    {item.hint}
                  </span>
                ) : null}
              </Label>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

/** Immutable Set toggle — returns a new Set, never mutates the previous one. */
function toggleInSet(
  current: ReadonlySet<string>,
  id: string,
  checked: boolean
): Set<string> {
  const next = new Set(current)
  if (checked) {
    next.add(id)
  } else {
    next.delete(id)
  }
  return next
}

interface ScreenAccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  screen: Screen | null
  roles: Role[]
  permissions: Permission[]
  buttons: PermissionButton[]
}

/**
 * Manage which roles/permissions unlock a screen (PUT /api/rbac/screens/access)
 * and which permission buttons are active on it (PUT /api/rbac/screen-buttons).
 * The two saves are separate because they sit behind different permissions
 * (`screens.manage` vs `buttons.manage`).
 */
export function ScreenAccessDialog({
  open,
  onOpenChange,
  screen,
  roles,
  permissions,
  buttons,
}: ScreenAccessDialogProps) {
  const accessMutation = useSetScreenAccess()
  const buttonsMutation = useSetScreenButtons()

  const [roleIds, setRoleIds] = useState<Set<string>>(new Set())
  const [permissionIds, setPermissionIds] = useState<Set<string>>(new Set())
  const [buttonIds, setButtonIds] = useState<Set<string>>(new Set())

  // Reset the working sets when a (re)opened dialog targets a screen —
  // state-during-render reset instead of an effect, so in-progress edits are
  // not clobbered by background refetches while the dialog stays open.
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const targetKey = open && screen ? screen.id : null
  if (targetKey !== editingKey) {
    setEditingKey(targetKey)
    if (open && screen) {
      setRoleIds(new Set(screen.roleIds))
      setPermissionIds(new Set(screen.permissionIds))
      setButtonIds(
        new Set(
          screen.buttons
            .filter((link) => link.isActive)
            .map((link) => link.buttonId)
        )
      )
    }
  }

  if (!screen) return null

  const isPending = accessMutation.isPending || buttonsMutation.isPending

  const handleSaveAccess = () => {
    accessMutation.mutate({
      screenId: screen.id,
      roleIds: [...roleIds],
      permissionIds: [...permissionIds],
    })
  }

  const handleSaveButtons = () => {
    buttonsMutation.mutate({
      screenId: screen.id,
      buttonIds: [...buttonIds],
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => !isPending && onOpenChange(value)}
    >
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Manage access — {screen.name}</DialogTitle>
          <DialogDescription>
            Grant this screen to roles and/or permissions, and choose which
            action buttons are available on it.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='flex flex-col gap-2'>
            <div className='flex items-center justify-between'>
              <h3 className='text-sm font-medium'>Roles</h3>
              <Badge variant='secondary'>{roleIds.size} selected</Badge>
            </div>
            <CheckboxList
              idPrefix='screen-role'
              items={roles.map((role) => ({
                id: role.id,
                label: role.name,
                hint: role.description,
              }))}
              selected={roleIds}
              onToggle={(id, checked) =>
                setRoleIds((current) => toggleInSet(current, id, checked))
              }
              emptyMessage='No roles available.'
            />
          </div>
          <div className='flex flex-col gap-2'>
            <div className='flex items-center justify-between'>
              <h3 className='text-sm font-medium'>Permissions</h3>
              <Badge variant='secondary'>{permissionIds.size} selected</Badge>
            </div>
            <CheckboxList
              idPrefix='screen-permission'
              items={permissions.map((permission) => ({
                id: permission.id,
                label: permission.name,
                hint: permission.description,
              }))}
              selected={permissionIds}
              onToggle={(id, checked) =>
                setPermissionIds((current) => toggleInSet(current, id, checked))
              }
              emptyMessage='No permissions available.'
            />
          </div>
        </div>

        <div className='flex justify-end'>
          <Button
            type='button'
            onClick={handleSaveAccess}
            disabled={isPending}
          >
            Save access
          </Button>
        </div>

        <Can permission='buttons.manage'>
          <Separator />
          <div className='flex flex-col gap-2'>
            <div className='flex items-center justify-between'>
              <h3 className='text-sm font-medium'>Screen buttons</h3>
              <Badge variant='secondary'>{buttonIds.size} active</Badge>
            </div>
            <p className='text-xs text-muted-foreground'>
              Each active button generates a{' '}
              <code>{screen.code}.&lt;button&gt;</code> permission. Deselected
              buttons are deactivated, not deleted.
            </p>
            <CheckboxList
              idPrefix='screen-button'
              items={buttons.map((button) => ({
                id: button.id,
                label: button.name,
                hint: button.code,
              }))}
              selected={buttonIds}
              onToggle={(id, checked) =>
                setButtonIds((current) => toggleInSet(current, id, checked))
              }
              emptyMessage='No permission buttons defined yet.'
            />
            <div className='flex justify-end'>
              <Button
                type='button'
                variant='outline'
                onClick={handleSaveButtons}
                disabled={isPending}
              >
                Save buttons
              </Button>
            </div>
          </div>
        </Can>

        <DialogFooter>
          <Button
            type='button'
            variant='ghost'
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
