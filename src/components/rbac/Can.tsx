import type { ReactNode } from 'react'
import { useUser } from '@clerk/clerk-react'
import {
  extractRoleNames,
  getFallbackPermissionNamesForRoles,
  hasAnyPermission,
  normalizeRoleName,
} from '@/features/users/data/rbac'
import { useRBACStore } from '@/features/users/data/store'

interface CanProps {
  role?: string | string[]
  permission?: string | string[]
  children: ReactNode
  fallback?: ReactNode
}

export function Can({
  role,
  permission,
  children,
  fallback = null,
}: CanProps) {
  const { user, isLoaded } = useUser()
  const storeRoleNames = useRBACStore((state) => state.currentRoleNames)
  const storePermissionNames = useRBACStore((state) => state.currentPermissionNames)

  if (!isLoaded || !user) {
    return <>{fallback}</>
  }

  const metadataRoles = [
    ...extractRoleNames(user.publicMetadata?.roles),
    ...extractRoleNames(user.publicMetadata?.role),
  ]
  const roleNames = [...new Set([...storeRoleNames, ...metadataRoles])]
  const metadataPermissions = Array.isArray(user.publicMetadata?.permissions)
    ? user.publicMetadata.permissions.filter(
        (value): value is string => typeof value === 'string'
      )
    : typeof user.publicMetadata?.permissions === 'string'
      ? [user.publicMetadata.permissions]
      : []
  const permissionNames = [
    ...new Set([
      ...storePermissionNames,
      ...metadataPermissions,
      ...getFallbackPermissionNamesForRoles(roleNames),
    ]),
  ]

  if (role) {
    const requiredRoles = (Array.isArray(role) ? role : [role]).map(normalizeRoleName)
    const allowed = requiredRoles.some((requiredRole) =>
      roleNames.map(normalizeRoleName).includes(requiredRole)
    )

    if (!allowed) {
      return <>{fallback}</>
    }
  }

  if (permission) {
    const requiredPermissions = Array.isArray(permission)
      ? permission
      : [permission]

    if (!hasAnyPermission(permissionNames, requiredPermissions)) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}
