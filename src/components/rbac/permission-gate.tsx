/**
 * src/components/rbac/permission-gate.tsx
 *
 * Declarative UI gates for component-level and screen-level authorization.
 */

import type { ReactNode } from 'react'
import { Can, type CanProps } from '@/components/rbac/Can'
import { usePermissions } from '@/hooks/use-permissions'
import { useUser } from '@/hooks/use-auth'

export interface PermissionGateProps extends CanProps {
  loadingFallback?: ReactNode
}

export function PermissionGate({
  loadingFallback,
  fallback = null,
  ...props
}: PermissionGateProps) {
  const { user, isLoaded } = useUser()
  const { isLoading, data } = usePermissions()

  if (!isLoaded || (isLoading && !data)) {
    return <>{loadingFallback ?? fallback}</>
  }

  return <Can fallback={fallback} {...props} />
}

export interface ScreenGateProps {
  screen: string
  fallback?: ReactNode
  loadingFallback?: ReactNode
  children: ReactNode
}

export function ScreenGate({
  screen,
  fallback = null,
  loadingFallback,
  children,
}: ScreenGateProps) {
  const { user, isLoaded } = useUser()
  const { canAccessScreen, isLoading, data } = usePermissions()

  if (!isLoaded || (isLoading && !data)) {
    return <>{loadingFallback ?? fallback}</>
  }

  if (!user) {
    return <>{fallback}</>
  }

  const allowed = canAccessScreen(screen)
  if (!allowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
