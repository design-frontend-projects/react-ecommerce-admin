import type { NavigationPayload } from '@/features/access-control/data/navigation'
import { resolveNavIcon } from './icon-registry'
import type { NavGroup } from '../types'

/**
 * Map the server-filtered navigation payload (access-control catalog) onto
 * the `NavGroup[]` shape the sidebar renders. Screens arrive pre-filtered by
 * the caller's roles/permissions, so items carry no client-side
 * roles/permissions rules — `canAccessItem` passes them through.
 */
export function buildNavGroupsFromNavigation(
  navigation: NavigationPayload
): NavGroup[] {
  return navigation.modules.map((module) => ({
    title: module.name,
    items: module.screens.map((screen) => ({
      title: screen.name,
      url: screen.route,
      icon: resolveNavIcon(screen.icon, screen.code),
    })),
  }))
}
