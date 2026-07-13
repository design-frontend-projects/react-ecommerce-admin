import type { Role } from './schema'
import { UserRole } from '@/types/user-role.enum'

export const BASE_PERMISSION_DEFINITIONS = [
  { name: 'dashboard.view', description: 'View the main dashboard surface.' },
  { name: 'users.view', description: 'View users, invitations, and role assignments.' },
  { name: 'users.manage', description: 'Invite users and change assigned roles.' },
  { name: 'roles.manage', description: 'Create, update, activate, and delete roles.' },
  {
    name: 'permissions.manage',
    description: 'Map granular permissions to roles.',
  },
  { name: 'settings.manage', description: 'Manage privileged application settings.' },
  { name: 'products.view', description: 'View product records and catalog data.' },
  { name: 'products.manage', description: 'Create, edit, and archive products.' },
  { name: 'inventory.view', description: 'View stock balances and inventory states.' },
  { name: 'inventory.manage', description: 'Adjust inventory and stock configuration.' },
  { name: 'orders.view', description: 'View order history and live order state.' },
  { name: 'orders.manage', description: 'Manage order lifecycles and fulfillment.' },
  { name: 'orders.create', description: 'Create new orders and draft transactions.' },
  { name: 'reports.view', description: 'View reporting and operational analytics.' },
  { name: 'pos.access', description: 'Access point-of-sale and service surfaces.' },
  { name: 'screens.view', description: 'View the application screen and module registry.' },
  { name: 'screens.manage', description: 'Register and edit application screens and their access.' },
  { name: 'buttons.manage', description: 'Manage the permission-button catalog and screen mappings.' },
  { name: 'shifts.use', description: 'Open and close own shifts and record cash movements.' },
  { name: 'shifts.view', description: 'View all shifts, live staffing, and shift analytics.' },
  { name: 'shifts.manage', description: 'Force-close, correct, review shifts and manage shift settings.' },
  { name: 'purchasing.view', description: 'View purchase orders, requisitions, and goods receipts.' },
  { name: 'purchasing.manage', description: 'Create and post purchasing documents and replenishment.' },
  { name: 'sales.view', description: 'View sales orders and stock reservations.' },
  { name: 'sales.manage', description: 'Create, fulfil, invoice, and cancel sales orders.' },
] as const

export type PermissionName = (typeof BASE_PERMISSION_DEFINITIONS)[number]['name'] | '*'

export const DEFAULT_ROLE_PERMISSION_NAMES: Record<string, PermissionName[]> = {
  [UserRole.SuperAdmin]: ['*'],
  [UserRole.Admin]: [
    'dashboard.view',
    'users.view',
    'users.manage',
    'roles.manage',
    'permissions.manage',
    'settings.manage',
    'products.view',
    'products.manage',
    'inventory.view',
    'inventory.manage',
    'orders.view',
    'orders.manage',
    'reports.view',
    'pos.access',
    'screens.view',
    'screens.manage',
    'buttons.manage',
    'shifts.use',
    'shifts.view',
    'shifts.manage',
    'purchasing.view',
    'purchasing.manage',
    'sales.view',
    'sales.manage',
  ],
  [UserRole.Manager]: [
    'dashboard.view',
    'users.view',
    'products.view',
    'products.manage',
    'inventory.view',
    'inventory.manage',
    'orders.view',
    'orders.manage',
    'reports.view',
    'pos.access',
    'shifts.use',
    'shifts.view',
    'purchasing.view',
    'purchasing.manage',
    'sales.view',
    'sales.manage',
  ],
  [UserRole.Staff]: ['dashboard.view', 'products.view', 'inventory.view', 'orders.view', 'orders.create', 'pos.access', 'shifts.use'],
  [UserRole.Cashier]: ['dashboard.view', 'orders.view', 'orders.create', 'pos.access', 'shifts.use'],
  [UserRole.Captain]: ['dashboard.view', 'orders.view', 'orders.manage', 'pos.access', 'shifts.use'],
  [UserRole.Kitchen]: ['dashboard.view', 'orders.view', 'pos.access'],
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

  for (const permissionName of permissionNames) {
    if (permissionName === '*') {
      expanded.add('*')
      for (const permission of BASE_PERMISSION_DEFINITIONS) {
        expanded.add(permission.name)
      }
      continue
    }

    expanded.add(permissionName)
  }

  return [...expanded]
}



export function getFallbackPermissionNamesForRoles(roleNames: string[]): string[] {
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
  if (!normalizedAction || normalizedAction === 'manage') return `${normalizedResource}.manage`
  if (normalizedAction === 'read' || normalizedAction === 'view') return `${normalizedResource}.view`
  if (normalizedAction === 'create' || normalizedAction === 'update' || normalizedAction === 'delete') {
    return `${normalizedResource}.manage`
  }

  return `${normalizedResource}.${normalizedAction}`
}

export function permissionNamesFromRoles(roles: Array<Role | Pick<Role, 'permissions'>>) {
  const permissionNames = roles.flatMap((role) => role.permissions.map((permission) => permission.name))
  return expandPermissionNames(permissionNames)
}

export function hasPermission(permissionNames: string[], requiredPermission: string) {
  if (!requiredPermission) return true

  const expandedPermissions = new Set(expandPermissionNames(permissionNames))
  if (expandedPermissions.has('*')) return true
  if (expandedPermissions.has(requiredPermission)) return true

  const [resource] = requiredPermission.split('.')
  return expandedPermissions.has(`${resource}.*`)
}

export function hasAnyPermission(permissionNames: string[], requiredPermissions: string[]) {
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
  if (hasWildcard && denied.size > 0 && allPermissionNames && allPermissionNames.length > 0) {
    for (const name of allPermissionNames) granted.add(name)
  } else {
    for (const name of expandPermissionNames(rolePermissionNames)) granted.add(name)
  }

  for (const grant of userGrants) {
    const normalized = grant.trim()
    if (normalized) granted.add(normalized)
  }

  // Explicit deny wins over everything, including a wildcard.
  if (denied.size > 0) granted.delete('*')
  for (const deny of denied) granted.delete(deny)

  return [...granted]
}

export function serializeRolePermissions(roles: Role[]) {
  return roles.map((role) => ({
    ...role,
    permissions: [...role.permissions].sort((left, right) => left.name.localeCompare(right.name)),
  }))
}
