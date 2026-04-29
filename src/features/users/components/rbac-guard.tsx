import type { ReactNode } from 'react'
import { useRBAC } from '../hooks/use-rbac'

interface RBACGuardProps {
  children: ReactNode
  resource: string
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
  fallback?: ReactNode
}

export function RBACGuard({
  children,
  resource,
  action,
  fallback = null,
}: RBACGuardProps) {
  const allowed = useRBAC(resource, action)

  if (!allowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
