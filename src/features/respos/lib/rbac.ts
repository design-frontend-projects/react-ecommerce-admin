// RBAC Utilities for ResPOS
// Permission checking and role-based access control
import { ROLE_PERMISSIONS } from '../constants'
import type { Permission, ResEmployeeWithRoles, RoleName } from '../types'

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  employee: ResEmployeeWithRoles | null,
  permission: Permission
): boolean {
  if (!employee || !employee.roles || employee.roles.length === 0) {
    return false
  }

  // Check if any role has the wildcard permission
  const hasWildcard = employee.roles.some((role) =>
    role.permissions.includes('*')
  )
  if (hasWildcard) return true

  // Check if any role has the specific permission
  return employee.roles.some((role) => role.permissions.includes(permission))
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(
  employee: ResEmployeeWithRoles | null,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(employee, p))
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(
  employee: ResEmployeeWithRoles | null,
  permissions: Permission[]
): boolean {
  return permissions.every((p) => hasPermission(employee, p))
}

/**
 * Check if a user has a specific role
 */
export function hasRole(
  employee: ResEmployeeWithRoles | null,
  roleName: RoleName
): boolean {
  if (!employee || !employee.roles) return false
  return employee.roles.some((role) => role.name === roleName)
}

/**
 * Check if a user has any of the specified roles
 */
export function hasAnyRole(
  employee: ResEmployeeWithRoles | null,
  roleNames: RoleName[]
): boolean {
  return roleNames.some((r) => hasRole(employee, r))
}

/**
 * Check if a user can access the payment screen
 * Only admin and cashier roles
 */
export function canAccessPayment(
  employee: ResEmployeeWithRoles | null
): boolean {
  return hasPermission(employee, 'payments')
}

/**
 * Check if a user can approve void requests
 * Only admin and cashier roles during active shift
 */
export function canApproveVoid(employee: ResEmployeeWithRoles | null): boolean {
  return hasPermission(employee, 'void_approve')
}

/**
 * Check if a user can only request void (not approve)
 * Captain role
 */
export function canOnlyRequestVoid(
  employee: ResEmployeeWithRoles | null
): boolean {
  return (
    hasPermission(employee, 'void_request') &&
    !hasPermission(employee, 'void_approve')
  )
}

/**
 * Check if user is admin or super_admin
 */
export function isAdmin(employee: ResEmployeeWithRoles | null): boolean {
  return hasAnyRole(employee, ['admin', 'super_admin'])
}

/**
 * Check if user is shift opener (admin/cashier)
 */
export function canOpenShift(employee: ResEmployeeWithRoles | null): boolean {
  return hasPermission(employee, 'shifts')
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(roleName: RoleName): Permission[] {
  return ROLE_PERMISSIONS[roleName] || []
}

/**
 * Get the highest role of an employee
 */
export function getHighestRole(
  employee: ResEmployeeWithRoles | null
): RoleName | null {
  if (!employee || !employee.roles || employee.roles.length === 0) {
    return null
  }

  const roleOrder: RoleName[] = [
    'super_admin',
    'admin',
    'cashier',
    'captain',
    'kitchen',
  ]

  for (const role of roleOrder) {
    if (employee.roles.some((r) => r.name === role)) {
      return role
    }
  }

  return null
}
