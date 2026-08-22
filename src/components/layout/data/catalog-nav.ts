import type { TFunction } from 'i18next'
import type { NavModule } from '@/features/access-control/hooks/use-nav-catalog'
import { resolveNavIcon } from './icon-map'
import { type NavGroup } from '../types'

export type TranslateFn =
  | TFunction
  | ((key: string, defaultVal?: string | Record<string, unknown>, ...args: unknown[]) => string)

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
function toCamelCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toLowerCase())
}

const MODULE_TRANSLATION_KEYS: Record<string, string> = {
  general: 'sidebar.general',
  restaurant: 'sidebar.restaurantPos',
  inventory: 'sidebar.inventory',
  lookups: 'sidebar.lookups',
  access_control: 'sidebar.accessControl',
  system: 'sidebar.system',
  other: 'sidebar.other',
}

const SCREEN_TRANSLATION_KEYS: Record<string, string> = {
  pos: 'sidebar.posSystem',
  inventory: 'sidebar.inventoryItems',
  inventory_shipments: 'sidebar.shipments',
  users: 'sidebar.usersRoles',
  respos_dashboard: 'sidebar.posDashboard',
  respos_pos: 'sidebar.posScreen',
  respos_captain: 'sidebar.captainStation',
  respos_kitchen: 'sidebar.kitchenDisplay',
  respos_menu: 'sidebar.menuManagement',
  respos_floors: 'sidebar.floorsTables',
  respos_reservations: 'sidebar.reservations',
  respos_analytics: 'sidebar.analytics',
  respos_shifts: 'sidebar.shifts',
  respos_cashier: 'sidebar.cashierCheckout',
  respos_payments: 'sidebar.payments',
  respos_shipments: 'sidebar.shipments',
  system_management: 'sidebar.systemManagement',
  audit_logs: 'sidebar.auditLogs',
  rbac_audit: 'sidebar.rbacAudit',
}

export function buildCatalogNavGroups(
  modules: NavModule[] | undefined,
  t?: TranslateFn
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
    .map((module) => {
      const moduleKey =
        MODULE_TRANSLATION_KEYS[module.code] ??
        `sidebar.${toCamelCase(module.code)}`
      const moduleTitle = t ? t(moduleKey, module.name) : module.name

      return {
        title: moduleTitle,
        items: module.screens
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((screen) => {
            const screenKey =
              SCREEN_TRANSLATION_KEYS[screen.code] ??
              `sidebar.${toCamelCase(screen.code)}`
            const screenTitle = t ? t(screenKey, screen.name) : screen.name

            return {
              title: screenTitle,
              url: screen.route as string,
              icon: resolveNavIcon(screen.icon),
              ...(screen.roleNames.length > 0
                ? { roles: screen.roleNames }
                : {}),
              ...(screen.permissionNames.length > 0
                ? { permissions: screen.permissionNames }
                : {}),
            }
          }),
      }
    })
}
