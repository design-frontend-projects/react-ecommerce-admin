'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Filter,
  Layers,
  RotateCcw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search as TopSearch } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { DEFAULT_ROLE_PERMISSION_NAMES } from '@/features/users/data/rbac'
import type { PermissionRecord } from '@/features/users/data/types'
import {
  useRBACCatalog,
  useSetRolePermissions,
} from '@/features/users/hooks/use-roles-permissions'

function extractModule(permissionName: string): string {
  const parts = permissionName.split('.')
  if (parts.length >= 2) {
    return parts[0]
  }
  return 'general'
}

function formatPermissionLabel(name: string): string {
  const parts = name.split('.')
  if (parts.length >= 2) {
    const resource = parts.slice(1, -1).join(' ') || parts[1]
    const action = parts[parts.length - 1]
    return `${resource.replace(/_/g, ' ')}: ${action}`
  }
  return name.replace(/_/g, ' ')
}

export function PermissionMatrixPage() {
  const { t } = useTranslation()
  const { data: catalog, isLoading } = useRBACCatalog()
  const setRolePermissionsMutation = useSetRolePermissions()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModule, setSelectedModule] = useState<string>('all')
  // state: map of roleId -> Set of permissionIds
  const [rolePermissionsMap, setRolePermissionsMap] = useState<
    Record<string, Set<string>>
  >({})
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize state from fetched catalog
  useEffect(() => {
    if (catalog?.roles && !isInitialized) {
      const initialMap: Record<string, Set<string>> = {}
      for (const role of catalog.roles) {
        initialMap[role.id] = new Set(role.permissions.map((p) => p.id))
      }
      setRolePermissionsMap(initialMap)
      setIsInitialized(true)
    }
  }, [catalog, isInitialized])

  const roles = useMemo(() => catalog?.roles ?? [], [catalog])
  const allPermissions = useMemo(() => catalog?.allPermissions ?? [], [catalog])

  // Group permissions by module
  const modules = useMemo(() => {
    const set = new Set<string>()
    for (const p of allPermissions) {
      set.add(extractModule(p.name))
    }
    return Array.from(set).sort()
  }, [allPermissions])

  // Filter permissions by search and module
  const filteredPermissions = useMemo(() => {
    return allPermissions.filter((p) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description &&
          p.description.toLowerCase().includes(searchQuery.toLowerCase()))

      const mod = extractModule(p.name)
      const matchesModule = selectedModule === 'all' || mod === selectedModule

      return matchesSearch && matchesModule
    })
  }, [allPermissions, searchQuery, selectedModule])

  // Group filtered permissions by module for structured display
  const permissionsByModule = useMemo(() => {
    const map = new Map<string, PermissionRecord[]>()
    for (const p of filteredPermissions) {
      const mod = extractModule(p.name)
      if (!map.has(mod)) {
        map.set(mod, [])
      }
      map.get(mod)!.push(p)
    }
    return map
  }, [filteredPermissions])

  // Determine dirty/modified roles
  const dirtyRoleIds = useMemo(() => {
    if (!catalog?.roles) return new Set<string>()
    const dirty = new Set<string>()

    for (const role of catalog.roles) {
      const originalSet = new Set(role.permissions.map((p) => p.id))
      const currentSet = rolePermissionsMap[role.id] ?? new Set()

      if (originalSet.size !== currentSet.size) {
        dirty.add(role.id)
        continue
      }

      for (const id of currentSet) {
        if (!originalSet.has(id)) {
          dirty.add(role.id)
          break
        }
      }
    }

    return dirty
  }, [catalog, rolePermissionsMap])

  // Toggle single permission for a role
  const handleToggle = (roleId: string, permissionId: string) => {
    setRolePermissionsMap((prev) => {
      const currentSet = new Set(prev[roleId] ?? [])
      if (currentSet.has(permissionId)) {
        currentSet.delete(permissionId)
      } else {
        currentSet.add(permissionId)
      }
      return {
        ...prev,
        [roleId]: currentSet,
      }
    })
  }

  // Toggle all permissions in a module for a specific role
  const handleToggleModuleForRole = (roleId: string, moduleCode: string) => {
    const modulePermIds = (permissionsByModule.get(moduleCode) ?? []).map(
      (p) => p.id
    )
    if (modulePermIds.length === 0) return

    setRolePermissionsMap((prev) => {
      const currentSet = new Set(prev[roleId] ?? [])
      const allModuleGranted = modulePermIds.every((id) => currentSet.has(id))

      if (allModuleGranted) {
        // Deselect all in this module
        for (const id of modulePermIds) {
          currentSet.delete(id)
        }
      } else {
        // Select all in this module
        for (const id of modulePermIds) {
          currentSet.add(id)
        }
      }

      return {
        ...prev,
        [roleId]: currentSet,
      }
    })
  }

  // Toggle all permissions for a role across the entire matrix
  const handleToggleAllForRole = (roleId: string) => {
    const targetPermIds = filteredPermissions.map((p) => p.id)
    if (targetPermIds.length === 0) return

    setRolePermissionsMap((prev) => {
      const currentSet = new Set(prev[roleId] ?? [])
      const allGranted = targetPermIds.every((id) => currentSet.has(id))

      if (allGranted) {
        for (const id of targetPermIds) {
          currentSet.delete(id)
        }
      } else {
        for (const id of targetPermIds) {
          currentSet.add(id)
        }
      }

      return {
        ...prev,
        [roleId]: currentSet,
      }
    })
  }

  // Toggle a single permission for all roles
  const handleTogglePermissionForAllRoles = (permissionId: string) => {
    setRolePermissionsMap((prev) => {
      const allGranted = roles.every((r) =>
        (prev[r.id] ?? new Set()).has(permissionId)
      )
      const nextMap = { ...prev }

      for (const r of roles) {
        const set = new Set(nextMap[r.id] ?? [])
        if (allGranted) {
          set.delete(permissionId)
        } else {
          set.add(permissionId)
        }
        nextMap[r.id] = set
      }

      return nextMap
    })
  }

  // Discard changes and revert to catalog
  const handleDiscard = () => {
    if (!catalog?.roles) return
    const initialMap: Record<string, Set<string>> = {}
    for (const role of catalog.roles) {
      initialMap[role.id] = new Set(role.permissions.map((p) => p.id))
    }
    setRolePermissionsMap(initialMap)
    toast.info('Changes discarded.')
  }

  // Save changes for all dirty roles
  const handleSave = async () => {
    if (dirtyRoleIds.size === 0) return

    setIsSaving(true)
    try {
      const promises = Array.from(dirtyRoleIds).map((roleId) => {
        const permissionIds = Array.from(rolePermissionsMap[roleId] ?? [])
        return setRolePermissionsMutation.mutateAsync({
          roleId,
          permissionIds,
        })
      })

      await Promise.all(promises)
      toast.success(
        t(
          'accessControl.matrix.savedToast',
          `Successfully saved permissions for ${dirtyRoleIds.size} role(s)!`
        )
      )
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save role permissions.'
      )
    } finally {
      setIsSaving(false)
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
        {/* Page Title & Actions */}
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-2xl font-bold tracking-tight'>
                {t('accessControl.matrix.title', 'Permission Matrix')}
              </h1>
              <Badge
                variant='outline'
                className='border-primary/20 bg-primary/10 text-xs font-semibold text-primary'
              >
                RBAC & ABAC
              </Badge>
            </div>
            <p className='text-sm text-muted-foreground'>
              {t(
                'accessControl.matrix.desc',
                'Comprehensive security matrix: manage and inspect module permissions across all tenant roles.'
              )}
            </p>
          </div>

          <div className='flex items-center gap-2'>
            {dirtyRoleIds.size > 0 && (
              <Button
                variant='outline'
                size='sm'
                onClick={handleDiscard}
                disabled={isSaving}
                className='gap-1.5 text-muted-foreground hover:text-foreground'
              >
                <RotateCcw className='h-4 w-4' />
                <span>{t('common.discard', 'Discard')}</span>
              </Button>
            )}

            <Button
              size='sm'
              onClick={handleSave}
              disabled={dirtyRoleIds.size === 0 || isSaving}
              className='relative gap-2 shadow-sm'
            >
              {isSaving ? (
                <span className='flex items-center gap-2'>
                  <span className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                  {t('common.saving', 'Saving...')}
                </span>
              ) : (
                <>
                  <Save className='h-4 w-4' />
                  <span>{t('common.saveChanges', 'Save Changes')}</span>
                  {dirtyRoleIds.size > 0 && (
                    <span className='py-0.2 ml-1 rounded-full bg-primary-foreground px-1.5 text-[11px] font-bold text-primary'>
                      {dirtyRoleIds.size}
                    </span>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
          <Card className='flex items-center gap-3 p-3.5'>
            <div className='rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400'>
              <Users className='h-5 w-5' />
            </div>
            <div>
              <p className='text-xs font-medium text-muted-foreground'>Roles</p>
              <p className='text-lg leading-tight font-bold'>{roles.length}</p>
            </div>
          </Card>

          <Card className='flex items-center gap-3 p-3.5'>
            <div className='rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400'>
              <Shield className='h-5 w-5' />
            </div>
            <div>
              <p className='text-xs font-medium text-muted-foreground'>
                Permissions
              </p>
              <p className='text-lg leading-tight font-bold'>
                {allPermissions.length}
              </p>
            </div>
          </Card>

          <Card className='flex items-center gap-3 p-3.5'>
            <div className='rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400'>
              <Layers className='h-5 w-5' />
            </div>
            <div>
              <p className='text-xs font-medium text-muted-foreground'>
                Modules
              </p>
              <p className='text-lg leading-tight font-bold'>
                {modules.length}
              </p>
            </div>
          </Card>

          <Card className='flex items-center gap-3 p-3.5'>
            <div className='rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400'>
              <Sparkles className='h-5 w-5' />
            </div>
            <div>
              <p className='text-xs font-medium text-muted-foreground'>
                Unsaved Roles
              </p>
              <p className='text-lg leading-tight font-bold text-amber-600 dark:text-amber-400'>
                {dirtyRoleIds.size}
              </p>
            </div>
          </Card>
        </div>

        {/* Filter & Search Bar */}
        <div className='flex flex-col items-stretch justify-between gap-2.5 sm:flex-row sm:items-center'>
          <div className='flex max-w-md flex-1 items-center gap-2'>
            <div className='relative flex-1'>
              <Search className='absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder={t(
                  'accessControl.matrix.searchPlaceholder',
                  'Filter by permission name or description...'
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='h-9 pl-8 text-xs'
              />
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
              <Filter className='h-3.5 w-3.5' />
              <span>Module:</span>
            </div>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className='h-9 w-44 text-xs capitalize'>
                <SelectValue placeholder='All Modules' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>
                  All Modules ({allPermissions.length})
                </SelectItem>
                {modules.map((m) => (
                  <SelectItem key={m} value={m} className='capitalize'>
                    {m.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Permission Matrix Table */}
        <Card className='overflow-hidden border shadow-sm'>
          {isLoading ? (
            <div className='space-y-4 p-8'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
            </div>
          ) : roles.length === 0 ? (
            <div className='p-12 text-center text-muted-foreground'>
              <ShieldAlert className='mx-auto mb-2 h-8 w-8' />
              <p>No roles found. Please configure tenant roles first.</p>
            </div>
          ) : (
            <div className='max-h-[68vh] overflow-x-auto'>
              <table className='w-full border-collapse text-left text-sm'>
                <thead className='sticky top-0 z-20 border-b bg-muted/90 text-xs font-semibold text-muted-foreground uppercase backdrop-blur-md'>
                  <tr>
                    {/* Sticky Permission Column Header */}
                    <th className='sticky left-0 z-30 max-w-[340px] min-w-[280px] bg-muted/95 px-4 py-3 shadow-[1px_0_0_0_theme(colors.border)]'>
                      <div className='flex items-center justify-between'>
                        <span>
                          {t(
                            'accessControl.matrix.permissionHeader',
                            'Module & Permission'
                          )}
                        </span>
                        <span className='text-[10px] font-normal text-muted-foreground lowercase'>
                          {filteredPermissions.length} items
                        </span>
                      </div>
                    </th>

                    {/* Role Columns */}
                    {roles.map((role) => {
                      const isDirty = dirtyRoleIds.has(role.id)
                      const isSystem = Object.prototype.hasOwnProperty.call(
                        DEFAULT_ROLE_PERMISSION_NAMES,
                        role.name
                      )
                      return (
                        <th
                          key={role.id}
                          className={`min-w-[130px] border-s px-3 py-3 text-center ${
                            isDirty
                              ? 'bg-amber-500/10 dark:bg-amber-950/20'
                              : ''
                          }`}
                        >
                          <div className='flex flex-col items-center gap-1'>
                            <div className='flex items-center gap-1'>
                              <span className='text-xs font-bold text-foreground capitalize'>
                                {role.name}
                              </span>
                              {isDirty && (
                                <span
                                  className='h-2 w-2 animate-pulse rounded-full bg-amber-500'
                                  title='Unsaved modifications'
                                />
                              )}
                            </div>
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              onClick={() => handleToggleAllForRole(role.id)}
                              className='h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground'
                              title={`Toggle all visible permissions for ${role.name}`}
                            >
                              Toggle All
                            </Button>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>

                <tbody className='divide-y divide-border'>
                  {Array.from(permissionsByModule.entries()).map(
                    ([moduleCode, perms]) => (
                      <tbody
                        key={`module-section-${moduleCode}`}
                        className='divide-y divide-border'
                      >
                        {/* Module Section Header Row */}
                        <tr className='bg-muted/40 text-xs font-semibold tracking-wider uppercase'>
                          <td className='sticky left-0 z-10 bg-muted/50 px-4 py-2 font-bold text-foreground shadow-[1px_0_0_0_theme(colors.border)]'>
                            <div className='flex items-center gap-2'>
                              <span className='h-2 w-2 rounded-full bg-primary' />
                              <span>
                                {moduleCode.replace(/_/g, ' ')} Module
                              </span>
                              <span className='text-[10px] font-normal text-muted-foreground lowercase'>
                                ({perms.length} perms)
                              </span>
                            </div>
                          </td>

                          {/* Per-Module Role Quick-Toggles */}
                          {roles.map((role) => (
                            <td
                              key={`mod-${moduleCode}-role-${role.id}`}
                              className='border-s px-2 py-1.5 text-center'
                            >
                              <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                onClick={() =>
                                  handleToggleModuleForRole(role.id, moduleCode)
                                }
                                className='h-5 px-1 text-[10px] font-normal text-muted-foreground hover:text-primary'
                                title={`Toggle all ${moduleCode} permissions for ${role.name}`}
                              >
                                Toggle
                              </Button>
                            </td>
                          ))}
                        </tr>

                        {/* Permission Rows */}
                        {perms.map((permission) => {
                          return (
                            <tr
                              key={permission.id}
                              className='group transition-colors hover:bg-muted/20'
                            >
                              {/* Permission Name and Code */}
                              <td className='sticky left-0 z-10 bg-background px-4 py-2.5 shadow-[1px_0_0_0_theme(colors.border)] group-hover:bg-muted/30'>
                                <div className='flex items-start justify-between gap-2'>
                                  <div className='min-w-0 space-y-0.5'>
                                    <p className='truncate text-xs font-medium text-foreground capitalize'>
                                      {permission.description ||
                                        formatPermissionLabel(permission.name)}
                                    </p>
                                    <code className='block truncate font-mono text-[10px] text-muted-foreground'>
                                      {permission.name}
                                    </code>
                                  </div>
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    onClick={() =>
                                      handleTogglePermissionForAllRoles(
                                        permission.id
                                      )
                                    }
                                    className='h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground'
                                    title='Toggle this permission for all roles'
                                  >
                                    <Check className='h-3 w-3' />
                                  </Button>
                                </div>
                              </td>

                              {/* Role Checkboxes */}
                              {roles.map((role) => {
                                const granted = (
                                  rolePermissionsMap[role.id] ?? new Set()
                                ).has(permission.id)
                                const originalGranted = role.permissions.some(
                                  (p) => p.id === permission.id
                                )
                                const isCellDirty = granted !== originalGranted

                                return (
                                  <td
                                    key={`cell-${role.id}-${permission.id}`}
                                    onClick={() =>
                                      handleToggle(role.id, permission.id)
                                    }
                                    className={`cursor-pointer border-s px-3 py-2 text-center transition-colors select-none ${
                                      isCellDirty
                                        ? 'bg-amber-500/10 dark:bg-amber-950/30'
                                        : granted
                                          ? 'hover:bg-primary/5'
                                          : 'hover:bg-muted/30'
                                    }`}
                                  >
                                    <div className='flex items-center justify-center'>
                                      <div
                                        className={`flex h-5 w-5 items-center justify-center rounded-md transition-all ${
                                          granted
                                            ? 'bg-primary text-primary-foreground shadow-xs'
                                            : 'border border-muted-foreground/30 bg-background hover:border-primary/50'
                                        } ${isCellDirty ? 'ring-2 ring-amber-500' : ''}`}
                                      >
                                        {granted && (
                                          <Check className='h-3.5 w-3.5 stroke-[3]' />
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Main>
    </>
  )
}
