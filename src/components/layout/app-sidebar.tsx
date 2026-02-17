import { useAuth } from '@clerk/clerk-react'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import type { RoleName } from '@/features/respos/types'
import { AppTitle } from './app-title'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { has, isSignedIn } = useAuth()

  // Filter navigation items based on user roles
  const filteredNavGroups = sidebarData.navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        // If no roles specified, everyone can access
        if (!item.roles || item.roles.length === 0) return true

        // If roles specified but no employee (not authenticated in POS), hid
        if (!isSignedIn) return false

        // Check if employee has any of the required roles
        return item.roles.some((role) => has({ role: role as RoleName }))
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
