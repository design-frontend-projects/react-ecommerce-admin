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
        const screenKey = `sidebar.${toCamelCase(screen.code)}`
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

