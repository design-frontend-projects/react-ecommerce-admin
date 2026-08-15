import { useEffect, useRef } from 'react'
import { useUser } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'
import { useCurrentUserAccess } from '../data/queries'
import {
  hasPermission,
  normalizeRoleName,
  toPermissionName,
} from '../data/rbac'
import { useRBACStore } from '../data/store'

function useResolvedRBACAccess() {
  const storeRoleNames = useRBACStore((state) => state.currentRoleNames)
  const storePermissionNames = useRBACStore(
    (state) => state.currentPermissionNames
  )

  return { roleNames: storeRoleNames, permissionNames: storePermissionNames }
}

export function useRBACSession() {
  const { user, isLoaded } = useUser()
  const profile = useAuthStore((state) => state.auth.profile)
  const isInitializing = useAuthStore((state) => state.auth.isInitializing)
  const setCurrentAccess = useRBACStore((state) => state.setCurrentAccess)
  const reset = useRBACStore((state) => state.reset)
  const realtimePendingRef = useRef(false)

  const isOnboarded =
    profile?.onboarding_complete === true || profile?.parent_tenant_id != null
  const isAccessEnabled = Boolean(user?.id && !isInitializing && isOnboarded)

  const currentAccessQuery = useCurrentUserAccess(
    user?.id,
    () => {
      realtimePendingRef.current = true
    },
    isAccessEnabled
  )

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (!user) {
      reset()
      return
    }

    // While the access query is loading or errored, keep whatever access is
    // already in the store (the profile-derived fallback from auth-store, or
    // the last known server answer) instead of clobbering it with empty
    // arrays — that wipe is what hid every permission-gated item on sign-in.
    if (!currentAccessQuery.data) {
      return
    }

    setCurrentAccess(
      {
        userId: currentAccessQuery.data.authUserId,
        roleIds: currentAccessQuery.data.roleIds,
        roleNames: currentAccessQuery.data.roleNames,
        permissionNames: currentAccessQuery.data.permissionNames,
      },
      realtimePendingRef.current ? 'realtime' : 'bootstrap'
    )

    realtimePendingRef.current = false
  }, [currentAccessQuery.data, isLoaded, reset, setCurrentAccess, user])

  const roleNames = useRBACStore((state) => state.currentRoleNames)
  const permissionNames = useRBACStore((state) => state.currentPermissionNames)

  return {
    isLoaded,
    isFetching: currentAccessQuery.isFetching,
    roleNames,
    permissionNames,
  }
}

export function useRBAC(
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
) {
  const { permissionNames } = useResolvedRBACAccess()
  return hasPermission(permissionNames, toPermissionName(resource, action))
}

export function useHasPermission(permissionName: string) {
  const { permissionNames } = useResolvedRBACAccess()
  return hasPermission(permissionNames, permissionName)
}

export function useHasRole(roleName: string) {
  const { roleNames } = useResolvedRBACAccess()
  return roleNames.map(normalizeRoleName).includes(normalizeRoleName(roleName))
}
