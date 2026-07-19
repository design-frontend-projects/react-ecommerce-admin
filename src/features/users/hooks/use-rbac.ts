import { useEffect, useRef } from 'react'
import { useUser } from '@/hooks/use-auth'
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
  const setCurrentAccess = useRBACStore((state) => state.setCurrentAccess)
  const reset = useRBACStore((state) => state.reset)
  const realtimePendingRef = useRef(false)

  const currentAccessQuery = useCurrentUserAccess(user?.id, () => {
    realtimePendingRef.current = true
  })

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (!user) {
      reset()
      return
    }

    if (!currentAccessQuery.data) {
      setCurrentAccess(
        {
          userId: user.id,
          roleIds: [],
          roleNames: [],
          permissionNames: [],
        },
        'bootstrap'
      )
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
