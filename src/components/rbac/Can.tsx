import type { ReactNode } from 'react'
import { useUser } from '@/hooks/use-auth'
import {
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

export function Can({ role, permission, children, fallback = null }: CanProps) {
  const { user, isLoaded } = useUser()
  const storeRoleNames = useRBACStore((state) => state.currentRoleNames)
  const storePermissionNames = useRBACStore(
    (state) => state.currentPermissionNames
  )

  if (!isLoaded || !user) {
    return <>{fallback}</>
  }

  const roleNames = storeRoleNames
  const permissionNames = storePermissionNames

  if (role) {
    const requiredRoles = (Array.isArray(role) ? role : [role]).map(
      normalizeRoleName
    )
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
