import { UserRole } from '@/types/user-role.enum'
import type { Role } from './schema'

/**
 * Canonical permission catalog — 3-part `module.resource.action` names.
 * Module segments mirror the access-control module catalog
 * (`src/features/access-control/data/seed-data.ts`): general, restaurant,
 * inventory, lookups, access_control, system.
 *
 * The former 2-part names live on as aliases in `LEGACY_PERMISSION_ALIASES`
 * until every check site is migrated (see the RBAC refactor plan, phase 6).
 */
export const BASE_PERMISSION_DEFINITIONS = [
  {
    name: 'general.dashboard.view',
    description: 'View the main dashboard surface.',
  },
  {
    name: 'access_control.users.view',
    description: 'View users, invitations, and role assignments.',
  },
  {
    name: 'access_control.users.manage',
    description: 'Invite users and change assigned roles.',
  },
  {
    name: 'access_control.roles.manage',
    description: 'Create, update, activate, and delete roles.',
  },
  {
    name: 'access_control.permissions.manage',
    description: 'Map granular permissions to roles.',
  },
  {
    name: 'general.settings.manage',
    description: 'Manage privileged application settings.',
  },
  {
    name: 'general.products.view',
    description: 'View product records and catalog data.',
  },
  {
    name: 'general.products.manage',
    description: 'Create, edit, and archive products.',
  },
  {
    name: 'inventory.stock.view',
    description: 'View stock balances and inventory states.',
  },
  {
    name: 'inventory.stock.manage',
    description: 'Adjust inventory and stock configuration.',
  },
  {
    name: 'restaurant.orders.view',
    description: 'View order history and live order state.',
  },
  {
    name: 'restaurant.orders.manage',
    description: 'Manage order lifecycles and fulfillment.',
  },
  {
    name: 'restaurant.orders.create',
    description: 'Create new orders and draft transactions.',
  },
  {
    name: 'general.reports.view',
    description: 'View reporting and operational analytics.',
  },
  {
    name: 'general.pos.access',
    description: 'Access point-of-sale and service surfaces.',
  },
  {
    name: 'access_control.screens.view',
    description: 'View the application screen and module registry.',
  },
  {
    name: 'access_control.screens.manage',
    description: 'Register and edit application screens and their access.',
  },
  {
    name: 'access_control.buttons.manage',
    description: 'Manage the permission-button catalog and screen mappings.',
  },
  {
    name: 'restaurant.shifts.use',
    description: 'Open and close own shifts and record cash movements.',
  },
  {
    name: 'restaurant.shifts.view',
    description: 'View all shifts, live staffing, and shift analytics.',
  },
  {
    name: 'restaurant.shifts.manage',
    description:
      'Force-close, correct, review shifts and manage shift settings.',
  },
  {
    name: 'inventory.purchasing.view',
    description: 'View purchase orders, requisitions, and goods receipts.',
  },
  {
    name: 'inventory.purchasing.manage',
    description: 'Create and post purchasing documents and replenishment.',
  },
  {
    name: 'inventory.sales.view',
    description: 'View sales orders and stock reservations.',
  },
  {
    name: 'inventory.sales.manage',
    description: 'Create, fulfil, invoice, and cancel sales orders.',
  },
] as const

export type PermissionName =
  | (typeof BASE_PERMISSION_DEFINITIONS)[number]['name']
  | '*'

/**
 * Old 2-part name → canonical 3-part name. Covers the base catalog plus the
 * seed-generated `<screen>.<button>` permissions. Checks and stores accept
 * both spellings during the transition (see `expandPermissionNames`); the DB
 * rows are renamed in place by migration 20260719130000 (id-preserving, so
 * role/user assignments are untouched).
 */
export const LEGACY_PERMISSION_ALIASES: Record<string, string> = {
  'dashboard.view': 'general.dashboard.view',
  'users.view': 'access_control.users.view',
  'users.manage': 'access_control.users.manage',
  'roles.manage': 'access_control.roles.manage',
  'permissions.manage': 'access_control.permissions.manage',
  'settings.manage': 'general.settings.manage',
  'products.view': 'general.products.view',
  'products.manage': 'general.products.manage',
  'inventory.view': 'inventory.stock.view',
  'inventory.manage': 'inventory.stock.manage',
  'orders.view': 'restaurant.orders.view',
  'orders.manage': 'restaurant.orders.manage',
  'orders.create': 'restaurant.orders.create',
  'reports.view': 'general.reports.view',
  'pos.access': 'general.pos.access',
  'screens.view': 'access_control.screens.view',
  'screens.manage': 'access_control.screens.manage',
  'buttons.manage': 'access_control.buttons.manage',
  'shifts.use': 'restaurant.shifts.use',
  'shifts.view': 'restaurant.shifts.view',
  'shifts.manage': 'restaurant.shifts.manage',
  'purchasing.view': 'inventory.purchasing.view',
  'purchasing.manage': 'inventory.purchasing.manage',
  'sales.view': 'inventory.sales.view',
  'sales.manage': 'inventory.sales.manage',
  // Seed-generated screen-button permissions (`<screen>.<button>` →
  // `<module>.<screen>.<button>`, module from the screen catalog).
  'orders.pay': 'restaurant.orders.pay',
  'orders.update': 'restaurant.orders.update',
  'stock_transfers.create': 'inventory.stock_transfers.create',
  'stock_transfers.approve': 'inventory.stock_transfers.approve',
  'stock_adjustments.create': 'inventory.stock_adjustments.create',
  'stock_adjustments.approve': 'inventory.stock_adjustments.approve',
}

/** Canonical 3-part name → old 2-part alias (reverse of the map above). */
export const PERMISSION_LEGACY_NAMES: Record<string, string> =
  Object.fromEntries(
    Object.entries(LEGACY_PERMISSION_ALIASES).map(([legacy, canonical]) => [
      canonical,
      legacy,
    ])
  )

/** Resolve any permission spelling to its canonical 3-part name. */
export function toCanonicalPermissionName(name: string): string {
  return LEGACY_PERMISSION_ALIASES[name] ?? name
}

export const DEFAULT_ROLE_PERMISSION_NAMES: Record<string, PermissionName[]> = {
  [UserRole.SuperAdmin]: ['*'],
  [UserRole.Admin]: [
    'general.dashboard.view',
    'access_control.users.view',
    'access_control.users.manage',
    'access_control.roles.manage',
    'access_control.permissions.manage',
    'general.settings.manage',
    'general.products.view',
    'general.products.manage',
    'inventory.stock.view',
    'inventory.stock.manage',
    'restaurant.orders.view',
    'restaurant.orders.manage',
    'general.reports.view',
    'general.pos.access',
    'access_control.screens.view',
    'access_control.screens.manage',
    'access_control.buttons.manage',
    'restaurant.shifts.use',
    'restaurant.shifts.view',
    'restaurant.shifts.manage',
    'inventory.purchasing.view',
    'inventory.purchasing.manage',
    'inventory.sales.view',
    'inventory.sales.manage',
  ],
  [UserRole.Manager]: [
    'general.dashboard.view',
    'access_control.users.view',
    'general.products.view',
    'general.products.manage',
    'inventory.stock.view',
    'inventory.stock.manage',
    'restaurant.orders.view',
    'restaurant.orders.manage',
    'general.reports.view',
    'general.pos.access',
    'restaurant.shifts.use',
    'restaurant.shifts.view',
    'inventory.purchasing.view',
    'inventory.purchasing.manage',
    'inventory.sales.view',
    'inventory.sales.manage',
  ],
  [UserRole.Staff]: [
    'general.dashboard.view',
    'general.products.view',
    'inventory.stock.view',
    'restaurant.orders.view',
    'restaurant.orders.create',
    'general.pos.access',
    'restaurant.shifts.use',
  ],
  [UserRole.Cashier]: [
    'general.dashboard.view',
    'restaurant.orders.view',
    'restaurant.orders.create',
    'general.pos.access',
    'restaurant.shifts.use',
  ],
  [UserRole.Captain]: [
    'general.dashboard.view',
    'restaurant.orders.view',
    'restaurant.orders.manage',
    'general.pos.access',
    'restaurant.shifts.use',
  ],
  [UserRole.Kitchen]: [
    'general.dashboard.view',
    'restaurant.orders.view',
    'general.pos.access',
  ],
}

export const ROLE_PRIORITY = [
  UserRole.SuperAdmin,
  UserRole.Admin,
  UserRole.Manager,
  UserRole.Cashier,
  UserRole.Captain,
  UserRole.Kitchen,
  UserRole.Staff,
] as const

export function normalizeRoleName(roleName: string | null | undefined) {
  return (roleName ?? '').trim().toLowerCase()
}

export function expandPermissionNames(permissionNames: string[]) {
  const expanded = new Set<string>()

  const addWithAliases = (name: string) => {
    expanded.add(name)
    // Transitional bidirectional aliasing: a store holding either spelling
    // satisfies checks written against the other (removed in phase 6).
    const canonical = LEGACY_PERMISSION_ALIASES[name]
    if (canonical) expanded.add(canonical)
    const legacy = PERMISSION_LEGACY_NAMES[name]
    if (legacy) expanded.add(legacy)
  }

  for (const permissionName of permissionNames) {
    if (permissionName === '*') {
      expanded.add('*')
      for (const permission of BASE_PERMISSION_DEFINITIONS) {
        addWithAliases(permission.name)
      }
      continue
    }

    addWithAliases(permissionName)
  }

  return [...expanded]
}

export function getFallbackPermissionNamesForRoles(
  roleNames: string[]
): string[] {
  const merged = new Set<string>()

  for (const roleName of roleNames) {
    const normalized = normalizeRoleName(roleName)
    const defaultPermissions = DEFAULT_ROLE_PERMISSION_NAMES[normalized]
    if (defaultPermissions) {
      for (const permission of defaultPermissions) {
        merged.add(permission)
      }
    }
  }

  return expandPermissionNames([...merged])
}

export function getPrimaryRoleName(roleNames: string[]) {
  const normalized = roleNames.map(normalizeRoleName)

  for (const roleName of ROLE_PRIORITY) {
    if (normalized.includes(roleName)) {
      return roleName
    }
  }

  return normalized[0] ?? null
}

export function toPermissionName(resource: string, action?: string) {
  const normalizedResource = resource.trim().toLowerCase()
  const normalizedAction = action?.trim().toLowerCase()

  if (!normalizedResource) return ''

  let name: string
  if (!normalizedAction || normalizedAction === 'manage') {
    name = `${normalizedResource}.manage`
  } else if (normalizedAction === 'read' || normalizedAction === 'view') {
    name = `${normalizedResource}.view`
  } else if (
    normalizedAction === 'create' ||
    normalizedAction === 'update' ||
    normalizedAction === 'delete'
  ) {
    name = `${normalizedResource}.manage`
  } else {
    name = `${normalizedResource}.${normalizedAction}`
  }

  // Callers pass legacy 2-part resources (e.g. `users`); resolve to the
  // canonical 3-part name when known.
  return toCanonicalPermissionName(name)
}

export function permissionNamesFromRoles(
  roles: Array<Role | Pick<Role, 'permissions'>>
) {
  const permissionNames = roles.flatMap((role) =>
    role.permissions.map((permission) => permission.name)
  )
  return expandPermissionNames(permissionNames)
}

export function hasPermission(
  permissionNames: string[],
  requiredPermission: string
) {
  if (!requiredPermission) return true

  const expandedPermissions = new Set(expandPermissionNames(permissionNames))
  if (expandedPermissions.has('*')) return true
  if (expandedPermissions.has(requiredPermission)) return true

  // Scope wildcards: `module.*` covers `module.resource.action` (and legacy
  // `module.action`); `module.resource.*` covers `module.resource.action`.
  const canonical = toCanonicalPermissionName(requiredPermission)
  if (
    canonical !== requiredPermission &&
    expandedPermissions.has(canonical)
  ) {
    return true
  }
  const segments = canonical.split('.')
  if (expandedPermissions.has(`${segments[0]}.*`)) return true
  if (
    segments.length >= 3 &&
    expandedPermissions.has(`${segments[0]}.${segments[1]}.*`)
  ) {
    return true
  }

  return false
}

export function hasAnyPermission(
  permissionNames: string[],
  requiredPermissions: string[]
) {
  return requiredPermissions.some((requiredPermission) =>
    hasPermission(permissionNames, requiredPermission)
  )
}

/**
 * Resolve a user's effective permission names from their role-derived permissions
 * plus per-user grant/deny overrides.
 *
 * Precedence (highest first): explicit user deny > explicit user grant > role grant > wildcard.
 *
 * Wildcard handling: a bare `*` grants everything, but an explicit deny must win over it
 * (spec US3 §3). When denies are present and the role set holds `*`, pass `allPermissionNames`
 * (the concrete permission universe) so the wildcard can be expanded and the specific denied
 * permissions subtracted precisely; without it the wildcard is dropped and only the expanded
 * base permissions (minus denies) remain.
 *
 * Shared verbatim by the server gate (`getDatabasePermissionNames`) and the client store
 * selector to prevent divergence (SC-005).
 */
export function resolveEffectivePermissions(
  rolePermissionNames: string[],
  userGrants: string[] = [],
  userDenies: string[] = [],
  allPermissionNames?: string[]
): string[] {
  const denied = new Set(userDenies.map((name) => name.trim()).filter(Boolean))
  const granted = new Set<string>()

  const hasWildcard = rolePermissionNames.includes('*')
  if (
    hasWildcard &&
    denied.size > 0 &&
    allPermissionNames &&
    allPermissionNames.length > 0
  ) {
    for (const name of allPermissionNames) granted.add(name)
  } else {
    for (const name of expandPermissionNames(rolePermissionNames))
      granted.add(name)
  }

  for (const grant of userGrants) {
    const normalized = grant.trim()
    if (normalized) granted.add(normalized)
  }

  // Explicit deny wins over everything, including a wildcard. A deny stored
  // under either spelling (legacy 2-part / canonical 3-part) removes both.
  if (denied.size > 0) granted.delete('*')
  for (const deny of denied) {
    granted.delete(deny)
    const canonical = LEGACY_PERMISSION_ALIASES[deny]
    if (canonical) granted.delete(canonical)
    const legacy = PERMISSION_LEGACY_NAMES[deny]
    if (legacy) granted.delete(legacy)
  }

  return [...granted]
}

export function serializeRolePermissions(roles: Role[]) {
  return roles.map((role) => ({
    ...role,
    permissions: [...role.permissions].sort((left, right) =>
      left.name.localeCompare(right.name)
    ),
  }))
}
