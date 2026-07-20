import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { hasPermission } from '../data/rbac'
import type { Permission, User } from '../data/schema'
import {
  useSetUserPermissionOverrides,
  useUserPermissionOverrides,
} from '../hooks/use-user-permissions'

type OverrideState = 'inherit' | 'grant' | 'deny'

interface UserPermissionOverridesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  permissions: Permission[]
  /** Permission names the user's roles already grant, for the effective column. */
  rolePermissionNames: string[]
}

const STATE_LABELS: Record<OverrideState, string> = {
  inherit: 'Inherit',
  grant: 'Grant',
  deny: 'Deny',
}

/**
 * Per-user permission overrides. Each permission is inherit (from roles),
 * explicitly granted, or explicitly denied — deny always wins over both role
 * grants and the super-admin wildcard, matching `resolveEffectivePermissions`.
 */
export function UserPermissionOverridesDialog({
  open,
  onOpenChange,
  user,
  permissions,
  rolePermissionNames,
}: UserPermissionOverridesDialogProps) {
  const tenantUserId = user?.id
  const overridesQuery = useUserPermissionOverrides(tenantUserId, open)
  const saveMutation = useSetUserPermissionOverrides()

  const [states, setStates] = useState<Record<string, OverrideState>>({})
  const [search, setSearch] = useState('')

  // Hydrate from the server payload when the dialog targets a user; keyed on
  // user + fetch status so background refetches never clobber pending edits.
  const hydrationKey =
    open && tenantUserId && overridesQuery.data
      ? `${tenantUserId}:${overridesQuery.dataUpdatedAt}`
      : null
  const [hydratedKey, setHydratedKey] = useState<string | null>(null)
  if (hydrationKey && hydrationKey !== hydratedKey) {
    setHydratedKey(hydrationKey)
    const next: Record<string, OverrideState> = {}
    for (const id of overridesQuery.data!.grants) next[id] = 'grant'
    for (const id of overridesQuery.data!.denies) next[id] = 'deny'
    setStates(next)
  }
  if (!open && hydratedKey) {
    setHydratedKey(null)
    setSearch('')
  }

  if (!user) return null

  const term = search.trim().toLowerCase()
  const visible = term
    ? permissions.filter(
        (permission) =>
          permission.name.toLowerCase().includes(term) ||
          (permission.description ?? '').toLowerCase().includes(term)
      )
    : permissions

  const overrideCount = Object.values(states).filter(
    (state) => state !== 'inherit'
  ).length

  const handleSave = () => {
    const grants: string[] = []
    const denies: string[] = []
    for (const [permissionId, state] of Object.entries(states)) {
      if (state === 'grant') grants.push(permissionId)
      if (state === 'deny') denies.push(permissionId)
    }

    saveMutation.mutate(
      { tenantUserId: user.id, grants, denies },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => !saveMutation.isPending && onOpenChange(value)}
    >
      <DialogContent className='max-h-[85vh] overflow-hidden sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>Permission overrides — {user.email}</DialogTitle>
          <DialogDescription>
            Overrides apply on top of the user's roles. A denial always wins,
            including over a super-admin wildcard.
          </DialogDescription>
        </DialogHeader>

        <div className='flex items-center justify-between gap-3'>
          <Input
            placeholder='Search permissions…'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className='max-w-sm'
          />
          <Badge variant={overrideCount > 0 ? 'default' : 'secondary'}>
            {overrideCount} override{overrideCount === 1 ? '' : 's'}
          </Badge>
        </div>

        <Separator />

        {overridesQuery.isLoading ? (
          <p className='py-6 text-sm text-muted-foreground'>
            Loading overrides…
          </p>
        ) : (
          <ScrollArea className='h-[45vh] pr-3'>
            <div className='flex flex-col gap-1'>
              {visible.map((permission) => {
                const state = states[permission.id] ?? 'inherit'
                const inheritedFromRole = hasPermission(
                  rolePermissionNames,
                  permission.name
                )
                const effective =
                  state === 'deny'
                    ? false
                    : state === 'grant'
                      ? true
                      : inheritedFromRole

                return (
                  <div
                    key={permission.id}
                    className='flex items-center justify-between gap-3 rounded-md border px-3 py-2'
                  >
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-medium'>
                        {permission.name}
                      </p>
                      {permission.description ? (
                        <p className='truncate text-xs text-muted-foreground'>
                          {permission.description}
                        </p>
                      ) : null}
                    </div>

                    <div className='flex shrink-0 items-center gap-2'>
                      <Badge variant={effective ? 'default' : 'outline'}>
                        {effective ? 'Allowed' : 'Blocked'}
                      </Badge>
                      <div className='flex overflow-hidden rounded-md border'>
                        {(
                          ['inherit', 'grant', 'deny'] as const
                        ).map((option) => (
                          <button
                            key={option}
                            type='button'
                            aria-pressed={state === option}
                            onClick={() =>
                              setStates((current) => ({
                                ...current,
                                [permission.id]: option,
                              }))
                            }
                            className={`px-2 py-1 text-xs transition-colors ${
                              state === option
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-background hover:bg-muted'
                            }`}
                          >
                            {STATE_LABELS[option]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
              {visible.length === 0 ? (
                <p className='py-6 text-sm text-muted-foreground'>
                  No permissions match “{search}”.
                </p>
              ) : null}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Save overrides'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
