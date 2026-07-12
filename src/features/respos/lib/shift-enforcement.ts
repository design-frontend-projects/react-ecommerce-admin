import { hasAnyPermission, normalizeRoleName } from '@/features/users/data/rbac'

export function isResposPath(pathname: string): boolean {
  return (
    pathname === '/respos' ||
    pathname.startsWith('/respos/') ||
    pathname === '/_authenticated/respos' ||
    pathname.startsWith('/_authenticated/respos/')
  )
}

/**
 * A user is shift-gated when they handle cash (shifts.use) but are not shift
 * managers (shifts.manage / admin roles). The cashier role stays gated even
 * without the shifts.use grant for backward compatibility with deployments
 * whose role_permissions were seeded before specs/026 added the permission.
 */
export function isShiftGatedUser(
  roleNames: string[],
  permissionNames: string[]
): boolean {
  const normalizedRoles = roleNames.map(normalizeRoleName)

  if (hasAnyPermission(permissionNames, ['shifts.manage'])) return false
  if (
    normalizedRoles.includes('admin') ||
    normalizedRoles.includes('super_admin')
  ) {
    return false
  }

  return (
    hasAnyPermission(permissionNames, ['shifts.use']) ||
    normalizedRoles.includes('cashier')
  )
}

export interface ShiftEnforcementParams {
  isSignedIn: boolean
  roleNames: string[]
  permissionNames: string[]
  pathname: string
  hasActiveShift: boolean
}

export function shouldEnforceShiftGate({
  isSignedIn,
  roleNames,
  permissionNames,
  pathname,
  hasActiveShift,
}: ShiftEnforcementParams): boolean {
  return (
    isSignedIn &&
    isResposPath(pathname) &&
    !hasActiveShift &&
    isShiftGatedUser(roleNames, permissionNames)
  )
}
