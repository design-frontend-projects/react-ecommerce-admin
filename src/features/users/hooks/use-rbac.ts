import { useRBACStore } from '../data/store'
import { hasPermission } from '../data/rbac'

export function useRBAC(resource: string, action: 'create' | 'read' | 'update' | 'delete' | 'manage') {
  const permissions = useRBACStore((state) => state.permissions)
  return hasPermission(permissions, resource, action)
}
