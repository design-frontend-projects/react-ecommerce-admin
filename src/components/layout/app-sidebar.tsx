import { useLayout } from '@/context/layout-provider'
import { useAuth } from '@/hooks/use-auth'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useSystemOwner } from '@/features/auth/hooks/use-system-owner'
import { normalizeRoleName } from '@/features/users/data/rbac'
import { useRBACStore } from '@/features/users/data/store'
import { AppTitle } from './app-title'
import { useSidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import type { NavItem } from './types'

function canAccessItem(
  item: { roles?: string[]; isSystemOwner?: boolean },
  normalizedRoleNames: string[],
  isSystemOwner: boolean,
  isSignedIn: boolean
): boolean {
  // System owner restriction
  if (item.isSystemOwner && !isSystemOwner) return false

  // No roles defined → everyone can access
  if (!item.roles || item.roles.length === 0) return true

  // Roles defined but user not signed in → deny
  if (!isSignedIn) return false

  // Check if any of the user's roles match the route's allowed roles
  return item.roles.some((role) =>
    normalizedRoleNames.includes(normalizeRoleName(role))
  )
}

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { isSignedIn } = useAuth()
  const { isSystemOwner } = useSystemOwner()
  const currentRoleNames = useRBACStore((state) => state.currentRoleNames)
  const sidebarData = useSidebarData()

  const normalizedRoleNames = currentRoleNames.map(normalizeRoleName)

  // Filter navigation items based on user roles and system ownership
  const filteredNavGroups = sidebarData.navGroups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) =>
          canAccessItem(item, normalizedRoleNames, isSystemOwner, !!isSignedIn)
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
