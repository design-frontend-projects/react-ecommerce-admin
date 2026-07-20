import type { NavModule } from '@/features/access-control/hooks/use-nav-catalog'
import { resolveNavIcon } from './icon-map'
import { type NavGroup } from '../types'

/**
 * Build sidebar groups from the DB nav catalog (module → group, screen → item), carrying each
 * screen's required role/permission names so `canAccessItem` filters exactly as it does for
 * the static array.
 *
 * Returns `null` when the catalog is not yet ready to own the sidebar — no modules with
 * screens, or screens without icons — so `useSidebarData` keeps using its curated static
 * array. This is the deliberate migration gate: the catalog takes over only once an admin has
 * enriched screens (icons + screen_permissions) via the Access Control screens admin.
 */
export function buildCatalogNavGroups(
  modules: NavModule[] | undefined
): NavGroup[] | null {
  if (!modules || modules.length === 0) return null

  const modulesWithScreens = modules.filter(
    (module) => module.screens.length > 0
  )
  if (modulesWithScreens.length === 0) return null

  // Gate: every screen must carry an icon before the catalog drives the sidebar. Seeded
  // screens have null icons, so this keeps the static array in charge until enrichment.
  const everyScreenHasIcon = modulesWithScreens.every((module) =>
    module.screens.every((screen) => Boolean(screen.icon))
  )
  if (!everyScreenHasIcon) return null

  return modulesWithScreens
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((module) => ({
      title: module.name,
      items: module.screens
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((screen) => ({
          title: screen.name,
          url: screen.route as string,
          icon: resolveNavIcon(screen.icon),
          ...(screen.roleNames.length > 0 ? { roles: screen.roleNames } : {}),
          ...(screen.permissionNames.length > 0
            ? { permissions: screen.permissionNames }
            : {}),
        })),
    }))
}
