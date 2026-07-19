import { useLocation } from '@tanstack/react-router'
import { useNavigation } from '@/features/access-control/hooks/use-navigation'
import { ForbiddenError } from '@/features/errors/forbidden'

const SCREEN_GUARD_ENABLED = import.meta.env.VITE_DB_NAV === 'true'

/**
 * Resolve a pathname against the screens catalog: exact route match first,
 * then the longest prefix match at a path boundary (`/products` covers
 * `/products/123`). Returns `undefined` when the route is not cataloged.
 * The root route `/` only ever matches exactly — it would otherwise prefix
 * every path.
 */
export function resolveScreenAccess(
  screens: Record<string, boolean>,
  pathname: string
): boolean | undefined {
  if (pathname in screens) return screens[pathname]

  let bestRoute: string | undefined
  for (const route of Object.keys(screens)) {
    if (route === '/') continue
    if (!pathname.startsWith(`${route}/`)) continue
    if (!bestRoute || route.length > bestRoute.length) {
      bestRoute = route
    }
  }

  return bestRoute ? screens[bestRoute] : undefined
}

interface RequireScreenProps {
  children: React.ReactNode
}

/**
 * Route-level screen guard driven by the access-control catalog. Behavior
 * during the migration (flag `VITE_DB_NAV`):
 * - flag off, catalog loading, or query error -> children render (fail-open)
 * - route cataloged and DENIED -> 403 page
 * - route not in the catalog -> children render (fail-open; flips to
 *   fail-closed in the cleanup phase once the catalog is authoritative)
 */
export function RequireScreen({ children }: RequireScreenProps) {
  const location = useLocation()
  const navigationQuery = useNavigation(SCREEN_GUARD_ENABLED)

  if (!SCREEN_GUARD_ENABLED || !navigationQuery.data) {
    return <>{children}</>
  }

  const allowed = resolveScreenAccess(
    navigationQuery.data.screens,
    location.pathname
  )

  if (allowed === false) {
    return <ForbiddenError />
  }

  return <>{children}</>
}
