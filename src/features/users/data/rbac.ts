import type { Role } from './schema'

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
] as const

export type PermissionName = (typeof BASE_PERMISSION_DEFINITIONS)[number]['name'] | '*'

export const DEFAULT_ROLE_PERMISSION_NAMES: Record<string, PermissionName[]> = {
  super_admin: ['*'],
  admin: [
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
  ],
  manager: [
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
  ],
  staff: ['dashboard.view', 'products.view', 'inventory.view', 'orders.view', 'orders.create', 'pos.access'],
  cashier: ['dashboard.view', 'orders.view', 'orders.create', 'pos.access'],
  captain: ['dashboard.view', 'orders.view', 'orders.manage', 'pos.access'],
  kitchen: ['dashboard.view', 'orders.view', 'pos.access'],
}

export const ROLE_PRIORITY = [
  'super_admin',
  'admin',
  'manager',
  'cashier',
  'captain',
  'kitchen',
  'staff',
] as const

export function normalizeRoleName(roleName: string | null | undefined) {
  return (roleName ?? '').trim().toLowerCase()
}

export function extractRoleNames(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((value) => normalizeRoleName(typeof value === 'string' ? value : ''))
      .filter(Boolean)
  }

  if (typeof input === 'string') {
    const role = normalizeRoleName(input)
    return role ? [role] : []
  }

  return []
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

export function getFallbackPermissionNamesForRoles(roleNames: string[]) {
  const permissionNames = new Set<string>()

  for (const roleName of roleNames.map(normalizeRoleName)) {
    for (const permissionName of DEFAULT_ROLE_PERMISSION_NAMES[roleName] ?? []) {
      permissionNames.add(permissionName)
    }
  }

  return expandPermissionNames([...permissionNames])
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

export function serializeRolePermissions(roles: Role[]) {
  return roles.map((role) => ({
    ...role,
    permissions: [...role.permissions].sort((left, right) => left.name.localeCompare(right.name)),
  }))
}
