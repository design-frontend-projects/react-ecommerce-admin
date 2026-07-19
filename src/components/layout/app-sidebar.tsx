import { useLayout } from '@/context/layout-provider'
import { useAuth } from '@/hooks/use-auth'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
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

const DB_NAV_ENABLED = import.meta.env.VITE_DB_NAV === 'true'

function canAccessItem(
  item: { roles?: string[]; permissions?: string[]; isSystemOwner?: boolean },
  normalizedRoleNames: string[],
  permissionNames: string[],
  isSystemOwner: boolean,
  isSignedIn: boolean
): boolean {
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

  // Alias/wildcard-aware permission match (shared with the server gate).
  if (hasPermissions && hasAnyPermission(permissionNames, item.permissions!)) {
    return true
  }

  return false
}

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { isSignedIn } = useAuth()
  const { isSystemOwner } = useSystemOwner()
  const currentRoleNames = useRBACStore((state) => state.currentRoleNames)
  const currentPermissionNames = useRBACStore(
    (state) => state.currentPermissionNames
  )
  const sidebarData = useSidebarData()

  // DB-driven navigation (feature-flagged). Falls back to the hardcoded
  // sidebar while loading, on error, or when the catalog is empty.
  const navigationQuery = useNavigation(DB_NAV_ENABLED)
  const dbNavGroups =
    DB_NAV_ENABLED && navigationQuery.data
      ? buildNavGroupsFromNavigation(navigationQuery.data)
      : null

  const normalizedRoleNames = currentRoleNames.map(normalizeRoleName)

  const sourceNavGroups =
    dbNavGroups && dbNavGroups.length > 0
      ? dbNavGroups
      : sidebarData.navGroups

  // Filter navigation items based on user roles and system ownership
  const filteredNavGroups = sourceNavGroups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) =>
          canAccessItem(
            item,
            normalizedRoleNames,
            currentPermissionNames,
            isSystemOwner,
            !!isSignedIn
          )
        )
        .map((item): NavItem => {
          // Filter nested sub-items for collapsible menus
          if ('items' in item && item.items) {
            return {
              ...item,
              items: item.items.filter((subItem) =>
                canAccessItem(
                  subItem,
                  normalizedRoleNames,
                  currentPermissionNames,
                  isSystemOwner,
                  !!isSignedIn
                )
              ),
            }
          }
          return item
        })
        .filter((item) => {
          // Remove collapsible items that have no accessible sub-items
          if ('items' in item && item.items) {
            return item.items.length > 0
          }
          return true
        }),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        {/* <TeamSwitcher teams={sidebarData.teams} /> */}

        {/* Replace <TeamSwitch /> with the following <AppTitle />
         /* if you want to use the normal app title instead of TeamSwitch dropdown */}
        <AppTitle />
      </SidebarHeader>
      <SidebarContent>
        {filteredNavGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
