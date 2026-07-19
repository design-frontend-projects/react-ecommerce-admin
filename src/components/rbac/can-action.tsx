import { useNavigation } from '@/features/access-control/hooks/use-navigation'
import { hasPermission } from '@/features/users/data/rbac'
import { useRBACStore } from '@/features/users/data/store'

interface CanActionProps {
  /** Screen code from the access-control catalog (e.g. 'products'). */
  screen?: string
  /** Button code from the catalog (e.g. 'create', 'delete'). */
  button?: string
  /**
   * Explicit permission fallback — used when the screen/button pair is not
   * in the catalog (or the catalog has not loaded), so gating still works
   * without DB data.
   */
  permission?: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Action-level guard driven by the screen_buttons catalog: resolves the
 * required permission for a screen/button pair from the navigation payload
 * and checks it against the RBAC store (alias- and wildcard-aware).
 * Resolution order: catalog mapping first, then the `permission` prop.
 * When neither yields a permission the action renders (no rule defined).
 */
export function CanAction({
  screen,
  button,
  permission,
  children,
  fallback = null,
}: CanActionProps) {
  const permissionNames = useRBACStore((state) => state.currentPermissionNames)
  const navigationQuery = useNavigation()

  const catalogPermission =
    screen && button
      ? navigationQuery.data?.buttons[screen]?.[button]
      : undefined
  const requiredPermission = catalogPermission ?? permission

  if (!requiredPermission) return <>{children}</>

  return hasPermission(permissionNames, requiredPermission) ? (
    <>{children}</>
  ) : (
    <>{fallback}</>
  )
}
