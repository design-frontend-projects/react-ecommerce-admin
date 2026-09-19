'use client'

import { useMemo, useState } from 'react'
import { Filter, Key, Layers, Lock, Search, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import type { PermissionRecord } from '@/features/users/data/types'
import { useRBACCatalog } from '@/features/users/hooks/use-roles-permissions'

function extractModule(permissionName: string): string {
  const parts = permissionName.split('.')
  if (parts.length >= 2) return parts[0]
  return 'general'
}

export function PermissionsPage() {
  const { t } = useTranslation()
  const { data: catalog, isLoading } = useRBACCatalog()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModule, setSelectedModule] = useState('all')

  const permissions = useMemo(() => catalog?.allPermissions ?? [], [catalog])
  const roles = useMemo(() => catalog?.roles ?? [], [catalog])

  // Map permissionId -> list of role names that hold it
  const rolesByPermissionId = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const role of roles) {
      for (const p of role.permissions) {
        if (!map.has(p.id)) {
          map.set(p.id, [])
        }
        map.get(p.id)!.push(role.name)
      }
    }
    return map
  }, [roles])

  const modules = useMemo(() => {
    const set = new Set<string>()
    for (const p of permissions) {
      set.add(extractModule(p.name))
    }
    return Array.from(set).sort()
  }, [permissions])

  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description &&
          p.description.toLowerCase().includes(searchQuery.toLowerCase()))

      const mod = extractModule(p.name)
      const matchesModule = selectedModule === 'all' || mod === selectedModule

      return matchesSearch && matchesModule
    })
  }, [permissions, searchQuery, selectedModule])

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
              {t('accessControl.permissions.title', 'Permissions Catalog')}
            </h1>
            <p className='text-sm text-muted-foreground'>
              {t(
                'accessControl.permissions.desc',
                'Explore all security permissions registered across system modules and inspect role assignments.'
              )}
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
          <Card className='flex items-center gap-3 p-3.5'>
            <div className='rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400'>
              <Key className='h-5 w-5' />
            </div>
            <div>
              <p className='text-xs font-medium text-muted-foreground'>
                Total Permissions
              </p>
              <p className='text-lg leading-tight font-bold'>
                {permissions.length}
              </p>
            </div>
          </Card>

          <Card className='flex items-center gap-3 p-3.5'>
            <div className='rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400'>
              <Layers className='h-5 w-5' />
            </div>
            <div>
              <p className='text-xs font-medium text-muted-foreground'>
                Active Modules
              </p>
              <p className='text-lg leading-tight font-bold'>
                {modules.length}
              </p>
            </div>
          </Card>

          <Card className='flex items-center gap-3 p-3.5'>
            <div className='rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400'>
              <Shield className='h-5 w-5' />
            </div>
            <div>
              <p className='text-xs font-medium text-muted-foreground'>
                Defined Roles
              </p>
              <p className='text-lg leading-tight font-bold'>{roles.length}</p>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className='flex flex-col items-stretch justify-between gap-2.5 sm:flex-row sm:items-center'>
          <div className='relative max-w-md flex-1'>
            <Search className='absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder={t(
                'accessControl.permissions.searchPlaceholder',
                'Search permissions...'
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='h-9 pl-8 text-xs'
            />
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
                  All Modules ({permissions.length})
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

        {/* Permissions list grouped by module */}
        {isLoading ? (
          <div className='space-y-4'>
            <Skeleton className='h-24 w-full' />
            <Skeleton className='h-24 w-full' />
          </div>
        ) : filteredPermissions.length === 0 ? (
          <Card className='p-12 text-center text-muted-foreground'>
            <Lock className='mx-auto mb-2 h-8 w-8 opacity-50' />
            <p>No permissions match your filter criteria.</p>
          </Card>
        ) : (
          <div className='space-y-6'>
            {Array.from(permissionsByModule.entries()).map(
              ([moduleCode, perms]) => (
                <Card
                  key={`module-card-${moduleCode}`}
                  className='overflow-hidden shadow-xs'
                >
                  <CardHeader className='flex flex-row items-center justify-between border-b bg-muted/40 px-4 py-3'>
                    <div className='flex items-center gap-2'>
                      <span className='h-2 w-2 rounded-full bg-primary' />
                      <CardTitle className='text-sm font-bold tracking-wider uppercase'>
                        {moduleCode.replace(/_/g, ' ')} Module
                      </CardTitle>
                    </div>
                    <Badge variant='secondary' className='text-[11px]'>
                      {perms.length} permissions
                    </Badge>
                  </CardHeader>
                  <CardContent className='divide-y p-0'>
                    {perms.map((p) => {
                      const assignedRoles = rolesByPermissionId.get(p.id) ?? []
                      return (
                        <div
                          key={p.id}
                          className='flex flex-col justify-between gap-3 p-3.5 transition-colors hover:bg-muted/10 sm:flex-row sm:items-center'
                        >
                          <div className='min-w-0 space-y-0.5'>
                            <div className='flex items-center gap-2'>
                              <code className='font-mono text-xs font-bold text-foreground'>
                                {p.name}
                              </code>
                            </div>
                            {p.description && (
                              <p className='text-xs text-muted-foreground'>
                                {p.description}
                              </p>
                            )}
                          </div>

                          <div className='flex shrink-0 flex-wrap items-center gap-1.5'>
                            <span className='me-1 text-[11px] text-muted-foreground'>
                              Roles:
                            </span>
                            {assignedRoles.length === 0 ? (
                              <span className='text-[11px] text-muted-foreground/60 italic'>
                                None assigned
                              </span>
                            ) : (
                              assignedRoles.map((roleName) => (
                                <Badge
                                  key={roleName}
                                  variant='outline'
                                  className='bg-background text-[10px] capitalize'
                                >
                                  {roleName}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )
            )}
          </div>
        )}
      </Main>
    </>
  )
}
