import { useEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useUser } from '@/hooks/use-auth'
import {
  currentAccessQueryKey,
  fetchCurrentUserAccess,
} from '@/features/users/data/queries'
import { hasAnyPermission, normalizeRoleName } from '@/features/users/data/rbac'
import type { CurrentUserAccess } from '@/features/users/data/types'

interface RequirePermissionProps {
  /** Any of these permission keys grants access (e.g. `users.manage`). */
  permission?: string | string[]
  /** Any of these role names grants access (e.g. `admin`). */
  role?: string | string[]
  /** Where to send a resolved-but-unauthorized user. Defaults to the 403 page. */
  redirectTo?: string
  children: ReactNode
}

/**
 * Route-level RBAC guard (defense-in-depth, client layer).
 *
 * The server (`requireAuth`) + Postgres RLS remain the authoritative deny; this
 * only prevents unauthorized screens from rendering and redirects to the shared
 * Forbidden (403) page. Access resolution reuses the same helpers as `<Can>` and
 * the sidebar, and matches the sidebar's OR semantics: access is granted when the
 * user satisfies EITHER the required role OR the required permission, so a route
 * is reachable exactly when its sidebar entry is visible.
 */
export function RequirePermission({
  permission,
  role,
  redirectTo = '/403',
  children,
}: RequirePermissionProps) {
  const { user, isLoaded } = useUser()
  const navigate = useNavigate()

  // Read-only view of the RBAC access cache. The realtime subscriptions are owned
  // by useRBACSession() in the _authenticated layout; using a plain useQuery here
  // reuses the same cache key without registering duplicate Supabase channels.
  const accessQuery = useQuery({
    queryKey: currentAccessQueryKey(user?.id),
    queryFn: () => fetchCurrentUserAccess(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  })

  const access = accessQuery.data
  // Deny-by-default: treat "still resolving" as not-yet-allowed so unauthorized
  // content never flashes before the redirect fires. A resolved `null` (no
  // tenant membership row) is a hard deny.
  const isResolving = !isLoaded || !user || access === undefined
  const allowed = !isResolving && access !== null && isAllowed(access, role, permission)

  useEffect(() => {
    if (!isResolving && !allowed) {
      navigate({ to: redirectTo })
    }
  }, [isResolving, allowed, navigate, redirectTo])

  if (isResolving) {
    return (
      <div className='flex h-svh w-full items-center justify-center bg-background'>
        <Loader2 className='h-10 w-10 animate-spin text-primary' />
      </div>
    )
  }

  if (!allowed) {
    return null
  }

  return <>{children}</>
}

function isAllowed(
  access: CurrentUserAccess,
  role?: string | string[],
  permission?: string | string[]
): boolean {
  const requiredRoles = role ? (Array.isArray(role) ? role : [role]) : []
  const requiredPermissions = permission
    ? Array.isArray(permission)
      ? permission
      : [permission]
    : []

  // No constraints declared → allow (auth is already enforced by the layout).
  if (requiredRoles.length === 0 && requiredPermissions.length === 0) {
    return true
  }

  if (requiredRoles.length > 0) {
    const heldRoles = access.roleNames.map(normalizeRoleName)
    if (
      requiredRoles
        .map(normalizeRoleName)
        .some((required) => heldRoles.includes(required))
    ) {
      return true
    }
  }

  if (
    requiredPermissions.length > 0 &&
    hasAnyPermission(access.permissionNames, requiredPermissions)
  ) {
    return true
  }

  return false
}
