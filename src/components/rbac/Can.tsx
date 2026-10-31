import type { ReactNode } from 'react'
import { useUser } from '@/hooks/use-auth'
import { normalizeRoleName } from '@/features/users/data/rbac'
import { usePermissions } from '@/hooks/use-permissions'

export interface CanProps {
  role?: string | string[]
  permission?: string | string[]
  any?: string[]
  all?: string[]
  not?: boolean
  children: ReactNode
  fallback?: ReactNode
}

export function Can({
  role,
  permission,
  any: anyPerms,
  all: allPerms,
  not = false,
  children,
  fallback = null,
}: CanProps) {
  const { user, isLoaded } = useUser()
  const permissionsHook = usePermissions()

  if (!isLoaded || !user) {
    return <>{not ? children : fallback}</>
  }

  // Fail-closed while loading initial permission set
  if (permissionsHook.isLoading && !permissionsHook.data) {
    return <>{not ? children : fallback}</>
  }

  const { roles, isSuperAdmin, hasAnyPermission, hasAllPermissions } =
    permissionsHook

  let allowed = true

  // 1. Role Check
  if (role) {
    const requiredRoles = (Array.isArray(role) ? role : [role]).map(
      normalizeRoleName
    )
    const roleAllowed =
      isSuperAdmin ||
      requiredRoles.some((requiredRole) =>
        roles.map(normalizeRoleName).includes(requiredRole)
      )

    if (!roleAllowed) {
      allowed = false
    }
  }

  // 2. Permission Check (string or array)
  if (allowed && permission) {
    const perms = Array.isArray(permission) ? permission : [permission]
    if (!hasAnyPermission(perms)) {
      allowed = false
    }
  }

  // 3. ANY Permissions Check
  if (allowed && anyPerms && anyPerms.length > 0) {
    if (!hasAnyPermission(anyPerms)) {
      allowed = false
    }
  }

  // 4. ALL Permissions Check
  if (allowed && allPerms && allPerms.length > 0) {
    if (!hasAllPermissions(allPerms)) {
      allowed = false
    }
  }

  // 5. Inversion (not prop)
  const finalAllowed = not ? !allowed : allowed

  if (!finalAllowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
