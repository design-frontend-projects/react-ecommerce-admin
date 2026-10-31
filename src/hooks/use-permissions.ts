/**
 * src/hooks/use-permissions.ts
 *
 * Client-side permissions hook with TanStack Query caching and O(1) in-memory resolution.
 * Query key: ['me', 'permissions', tenantId ?? 'default']
 */

import { useQuery, type QueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { useRBACStore } from '@/features/users/data/store'
import {
  hasPermission as rbacHasPermission,
  hasAnyPermission as rbacHasAnyPermission,
} from '@/features/users/data/rbac'
import type { MePermissionsData, MePermissionsResponse } from '@/server/fns/me-permissions'

export interface ActionButtonState {
  visible: boolean
  disabled: boolean
  allowed: boolean
  state: 'visible' | 'hidden' | 'disabled'
}

export interface UsePermissionsResult {
  data: MePermissionsData | undefined
  permissions: string[]
  roles: string[]
  isSuperAdmin: boolean
  isOwner: boolean
  scopes: MePermissionsData['scopes']
  modules: string[]
  screens: Record<string, boolean>
  buttons: Record<string, Record<string, 'visible' | 'hidden' | 'disabled'>>
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => Promise<unknown>

  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  canAccessScreen: (screenIdOrRoute: string) => boolean
  getActionButtonState: (actionOrScreen: string, buttonCode?: string) => ActionButtonState
}

const DEFAULT_SCOPES: MePermissionsData['scopes'] = {
  tenantId: '',
  branchIds: [],
  warehouseIds: [],
  storeIds: [],
  ownRecordsOnly: false,
}

const WHITELISTED_SYSTEM_PATHS = new Set([
  '/',
  '/profile',
  '/complete-account',
  '/force-password-change',
  '/subscription-required',
  '/403',
  '/errors/403',
])

export function usePermissions(explicitTenantId?: string): UsePermissionsResult {
  const { getToken, isLoaded, isSignedIn, user } = useAuth()
  const storeRoleNames = useRBACStore((state) => state.currentRoleNames)
  const storePermissionNames = useRBACStore(
    (state) => state.currentPermissionNames
  )

  const tenantKey = explicitTenantId ?? 'default'

  const query = useQuery<MePermissionsData>({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['me', 'permissions', tenantKey],
    queryFn: async () => {
      const token = await getToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      if (explicitTenantId) {
        headers['x-tenant-id'] = explicitTenantId
      }

      const res = await fetch('/api/me/permissions', { headers })
      if (!res.ok) {
        throw new Error(`Failed to fetch permissions: ${res.statusText}`)
      }
      const json = (await res.json()) as MePermissionsResponse
      if (!json.success || !json.data) {
        throw new Error('Invalid response structure from /api/me/permissions')
      }

      // Synchronize into legacy store for backward compatibility
      useRBACStore.getState().setCurrentAccess({
        userId: json.data.userId || user?.id || null,
        roleIds: [],
        roleNames: json.data.roles,
        permissionNames: json.data.permissions,
      })

      return json.data
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 60_000,
  })

  const data = query.data

  // Fallback to Zustand store if query is not yet resolved
  const permissions = data?.permissions ?? storePermissionNames ?? []
  const roles = data?.roles ?? storeRoleNames ?? []
  const isSuperAdmin = Boolean(
    data?.isSuperAdmin ??
      roles.includes('super_admin') ??
      roles.includes('system_owner')
  )
  const isOwner = Boolean(
    data?.isOwner ??
      roles.includes('owner') ??
      roles.includes('system_owner')
  )
  const scopes = data?.scopes ?? DEFAULT_SCOPES
  const modules = data?.modules ?? []
  const screens = data?.screens ?? {}
  const buttons = data?.buttons ?? {}

  const hasPermission = (permission: string): boolean => {
    if (!permission) return true
    if (isSuperAdmin || permissions.includes('*')) return true
    return rbacHasPermission(permissions, permission)
  }

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    if (!requiredPermissions || requiredPermissions.length === 0) return true
    if (isSuperAdmin || permissions.includes('*')) return true
    return rbacHasAnyPermission(permissions, requiredPermissions)
  }

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    if (!requiredPermissions || requiredPermissions.length === 0) return true
    if (isSuperAdmin || permissions.includes('*')) return true
    return requiredPermissions.every((p) => hasPermission(p))
  }

  const canAccessScreen = (screenIdOrRoute: string): boolean => {
    if (!screenIdOrRoute) return false
    if (isSuperAdmin || permissions.includes('*')) return true

    // Whitelisted non-business system paths
    if (WHITELISTED_SYSTEM_PATHS.has(screenIdOrRoute)) return true

    // Direct match (either screen code or exact route)
    if (screenIdOrRoute in screens) {
      return screens[screenIdOrRoute] === true
    }

    // Prefix match for nested routes at path boundaries
    if (screenIdOrRoute.startsWith('/')) {
      let bestRoute: string | undefined
      for (const route of Object.keys(screens)) {
        if (route === '/') continue
        if (!screenIdOrRoute.startsWith(`${route}/`)) continue
        if (!bestRoute || route.length > bestRoute.length) {
          bestRoute = route
        }
      }
      if (bestRoute) {
        return screens[bestRoute] === true
      }
    }

    // Default DENY
    return false
  }

  const getActionButtonState = (
    actionOrScreen: string,
    buttonCode?: string
  ): ActionButtonState => {
    if (buttonCode) {
      const explicitState = buttons[actionOrScreen]?.[buttonCode]
      if (explicitState === 'visible') {
        return { visible: true, disabled: false, allowed: true, state: 'visible' }
      }
      if (explicitState === 'disabled') {
        return { visible: true, disabled: true, allowed: false, state: 'disabled' }
      }
      if (explicitState === 'hidden') {
        return { visible: false, disabled: true, allowed: false, state: 'hidden' }
      }

      // If not in screen buttons map, evaluate permission string
      const permKey = `${actionOrScreen}.${buttonCode}`
      const allowed = hasPermission(permKey) || hasPermission(actionOrScreen)
      return {
        visible: allowed,
        disabled: !allowed,
        allowed,
        state: allowed ? 'visible' : 'hidden',
      }
    }

    // Single permission / action identifier
    const allowed = hasPermission(actionOrScreen)
    return {
      visible: allowed,
      disabled: !allowed,
      allowed,
      state: allowed ? 'visible' : 'hidden',
    }
  }

  return {
    data,
    permissions,
    roles,
    isSuperAdmin,
    isOwner,
    scopes,
    modules,
    screens,
    buttons,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessScreen,
    getActionButtonState,
  }
}

/**
 * Invalidate cached me-permissions in TanStack Query.
 */
export function invalidateMePermissions(
  queryClient: QueryClient,
  _tenantId?: string
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: ['me', 'permissions'],
  })
}
