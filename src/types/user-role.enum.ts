/**
 * Canonical role identifiers for the entire application.
 * Values match the `roles.name` column in the database.
 *
 * When adding a new role:
 * 1. Add the enum member here
 * 2. Add its default permissions in `DEFAULT_ROLE_PERMISSION_NAMES`
 * 3. Add its priority in `ROLE_PRIORITY`
 * 4. Add its display metadata in `ROLE_DISPLAY_NAMES`
 */
export enum UserRole {
  SuperAdmin = 'super_admin',
  Admin = 'admin',
  Manager = 'manager',
  Cashier = 'cashier',
  Captain = 'captain',
  Kitchen = 'kitchen',
  Staff = 'staff',
}

/** All role values as an array — useful for Zod enums, select options, etc. */
export const USER_ROLE_VALUES = Object.values(UserRole) as [
  UserRole,
  ...UserRole[],
]

/** Type guard: narrows an unknown string to UserRole */
export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === 'string' && USER_ROLE_VALUES.includes(value as UserRole)
  )
}

/** Admin-tier roles that bypass most permission checks */
export const ADMIN_ROLES: readonly UserRole[] = [
  UserRole.SuperAdmin,
  UserRole.Admin,
] as const
