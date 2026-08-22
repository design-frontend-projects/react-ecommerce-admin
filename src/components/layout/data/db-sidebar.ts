import type { TFunction } from 'i18next'
import type { NavigationPayload } from '@/features/access-control/data/navigation'
import { resolveNavIcon } from './icon-registry'
import type { NavGroup } from '../types'

export type TranslateFn =
  | TFunction
  | ((key: string, defaultVal?: string | Record<string, unknown>, ...args: unknown[]) => string)

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

/**
 * Map the server-filtered navigation payload (access-control catalog) onto
 * the `NavGroup[]` shape the sidebar renders. Screens arrive pre-filtered by
 * the caller's RBAC (roles/permissions) and ABAC (tenant capabilities/module assignments).
 */
export function buildNavGroupsFromNavigation(
  navigation: NavigationPayload,
  t?: TranslateFn
): NavGroup[] {
  return navigation.modules.map((module) => {
    const moduleKey = MODULE_TRANSLATION_KEYS[module.code] ?? `sidebar.${toCamelCase(module.code)}`
    const moduleTitle = t ? t(moduleKey, module.name) : module.name

    return {
      title: moduleTitle,
      items: module.screens.map((screen) => {
        const screenKey = SCREEN_TRANSLATION_KEYS[screen.code] ?? `sidebar.${toCamelCase(screen.code)}`
        const screenTitle = t ? t(screenKey, screen.name) : screen.name

        return {
          title: screenTitle,
          url: screen.route,
          icon: resolveNavIcon(screen.icon, screen.code),
        }
      }),
    }
  })
}

