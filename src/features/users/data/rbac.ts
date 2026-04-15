import type { Permission } from './schema';

export function hasPermission(
  userPermissions: Permission[],
  requiredResource: string,
  requiredAction: 'create' | 'read' | 'update' | 'delete' | 'manage'
): boolean {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  
  return userPermissions.some(
    p => 
      (p.resource === requiredResource || p.resource === '*') && 
      (p.action === requiredAction || p.action === 'manage')
  );
}
