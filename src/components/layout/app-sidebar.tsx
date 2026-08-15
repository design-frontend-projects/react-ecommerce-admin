import { useTranslation } from 'react-i18next'
import { useLocation } from '@tanstack/react-router'
import { useLayout } from '@/context/layout-provider'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavigation } from '@/features/access-control/hooks/use-navigation'
import { useSystemOwner } from '@/features/auth/hooks/use-system-owner'
import { hasAnyPermission, normalizeRoleName } from '@/features/users/data/rbac'
import { useRBACStore } from '@/features/users/data/store'
import { AppTitle } from './app-title'
import { buildNavGroupsFromNavigation } from './data/db-sidebar'
import { useSidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import type { NavItem } from './types'

// Default to enabled unless explicitly set to false
const DB_NAV_ENABLED = import.meta.env.VITE_DB_NAV !== 'false'

function canAccessItem(
  item: { roles?: string[]; permissions?: string[]; isSystemOwner?: boolean },
  normalizedRoleNames: string[],
  permissionNames: string[],
  isSystemOwner: boolean,
  isSignedIn: boolean,
  isSuperAdminOwner: boolean
): boolean {
  // System owner + super_admin bypasses ALL access restrictions
  if (isSuperAdminOwner) return true

  // System owner restriction
  if (item.isSystemOwner && !isSystemOwner) return false

  const hasRoles = item.roles && item.roles.length > 0
  const hasPermissions = item.permissions && item.permissions.length > 0

  // No roles or permissions defined → everyone can access
  if (!hasRoles && !hasPermissions) return true

  // Rules defined but user not signed in → deny
  if (!isSignedIn) return false

  // Check if any of the user's roles match the route's allowed roles
  if (
    hasRoles &&
    item.roles!.some((role) =>
      normalizedRoleNames.includes(normalizeRoleName(role))
    )
  ) {
    return true
  }

  // Alias/wildcard-aware permission match
  if (hasPermissions && hasAnyPermission(permissionNames, item.permissions!)) {
    return true
  }

  return false
}

export function AppSidebar() {
  const { t } = useTranslation()
  const { collapsible, variant } = useLayout()
  const { isSignedIn } = useAuth()
  const { isSystemOwner, isSuperAdminOwner } = useSystemOwner()
  const { pathname } = useLocation()
  const isCompleteAccount = pathname === '/complete-account'
  const currentRoleNames = useRBACStore((state) => state.currentRoleNames)
  const currentPermissionNames = useRBACStore(
    (state) => state.currentPermissionNames
  )
  const lastSyncedAt = useRBACStore((state) => state.lastSyncedAt)
  const sidebarData = useSidebarData()

  const isRBACReady = !isSignedIn || lastSyncedAt !== null

  // DB-driven dynamic RBAC + ABAC navigation
  const navigationQuery = useNavigation(DB_NAV_ENABLED && !!isSignedIn)
  const dbNavGroups =
    DB_NAV_ENABLED && navigationQuery.data
      ? buildNavGroupsFromNavigation(navigationQuery.data, t)
      : null

  const normalizedRoleNames = currentRoleNames.map(normalizeRoleName)

  // Use dynamic DB navigation if available; otherwise fallback to filtered static navigation
  const renderedNavGroups =
    dbNavGroups && dbNavGroups.length > 0
      ? dbNavGroups
      : sidebarData.navGroups
          .map((group) => ({
            ...group,
            items: group.items
              .filter((item) =>
                canAccessItem(
                  item,
                  normalizedRoleNames,
                  currentPermissionNames,
                  isSystemOwner,
                  !!isSignedIn,
                  isSuperAdminOwner
                )
              )
              .map((item): NavItem => {
                if ('items' in item && item.items) {
                  return {
                    ...item,
                    items: item.items.filter((subItem) =>
                      canAccessItem(
                        subItem,
                        normalizedRoleNames,
                        currentPermissionNames,
                        isSystemOwner,
                        !!isSignedIn,
                        isSuperAdminOwner
                      )
                    ),
                  }
                }
                return item
              })
              .filter((item) => {
                if ('items' in item && item.items) {
                  return item.items.length > 0
                }
                return true
              }),
          }))
          .filter((group) => group.items.length > 0)

  const isLoading = isSignedIn && navigationQuery.isLoading && !dbNavGroups

  return (
    <Sidebar
      collapsible={collapsible}
      variant={variant}
      className={cn(
        'transition-[filter,opacity] duration-300',
        isCompleteAccount && 'pointer-events-none select-none blur-sm opacity-80'
      )}
    >
      <SidebarHeader>
        <AppTitle />
      </SidebarHeader>
      <SidebarContent>
        {isLoading || !isRBACReady ? (
          <div className='flex flex-col gap-4 p-4'>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className='flex items-center gap-3'>
                <Skeleton className='h-7 w-7 rounded-md' />
                <Skeleton className='h-4 w-32' />
              </div>
            ))}
          </div>
        ) : (
          renderedNavGroups.map((props) => (
            <NavGroup key={props.title} {...props} />
          ))
        )}
      </SidebarContent>
      <SidebarFooter>
        {sidebarData.user && <NavUser user={sidebarData.user} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

