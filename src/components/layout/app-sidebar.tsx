import { useAuth } from '@clerk/clerk-react'
import { useLayout } from '@/context/layout-provider'
import { useSystemOwner } from '@/features/auth/hooks/use-system-owner'
import { normalizeRoleName } from '@/features/users/data/rbac'
import { useRBACStore } from '@/features/users/data/store'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import type { RoleName } from '@/features/respos/types'
import { AppTitle } from './app-title'
import { useSidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { has, isSignedIn } = useAuth()
  const { isSystemOwner } = useSystemOwner()
  const currentRoleNames = useRBACStore((state) => state.currentRoleNames)
  const sidebarData = useSidebarData()

  // Filter navigation items based on user roles and system ownership
  const filteredNavGroups = sidebarData.navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        // Check for system owner restriction
        if (item.isSystemOwner && !isSystemOwner) return false

        // If no roles specified, everyone can access (provided it passed isSystemOwner check)
        if (!item.roles || item.roles.length === 0) return true

        // If roles specified but no employee (not authenticated in POS), hid
        if (!isSignedIn) return false

        const normalizedRoleNames = currentRoleNames.map(normalizeRoleName)

        return item.roles.some((role) => {
          const normalizedRole = normalizeRoleName(role)
          return (
            normalizedRoleNames.includes(normalizedRole) ||
            has({ role: role as RoleName })
          )
        })
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
