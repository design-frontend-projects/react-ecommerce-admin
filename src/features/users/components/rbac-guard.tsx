import { useRBACStore } from '../data/store'
import { hasPermission } from '../data/rbac'
import React from 'react'

interface RBACGuardProps {
  children: React.ReactNode
  resource: string
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
  fallback?: React.ReactNode
}

export function RBACGuard({ children, resource, action, fallback = null }: RBACGuardProps) {
  const permissions = useRBACStore((state) => state.permissions)
  
  const allowed = hasPermission(permissions, resource, action)
  
  if (!allowed) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}
