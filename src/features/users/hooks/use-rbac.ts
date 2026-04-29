import { useUser } from '@clerk/clerk-react'
import { useEffect, useMemo, useRef } from 'react'
import {
  extractRoleNames,
  getFallbackPermissionNamesForRoles,
  hasPermission,
  normalizeRoleName,
  toPermissionName,
} from '../data/rbac'
import { useCurrentUserAccess } from '../data/queries'
import { useRBACStore } from '../data/store'

function extractPermissionNames(input: unknown) {
  if (Array.isArray(input)) {
    return input.filter((value): value is string => typeof value === 'string')
  }

  if (typeof input === 'string' && input.trim()) {
    return [input.trim()]
  }

  return []
}

function useResolvedRBACAccess() {
  const { user } = useUser()
  const storeRoleNames = useRBACStore((state) => state.currentRoleNames)
  const storePermissionNames = useRBACStore((state) => state.currentPermissionNames)

  const metadataRoleNames = useMemo(
    () =>
      [
        ...extractRoleNames(user?.publicMetadata?.roles),
        ...extractRoleNames(user?.publicMetadata?.role),
      ].map(normalizeRoleName),
    [user?.publicMetadata?.role, user?.publicMetadata?.roles]
  )

  const metadataPermissionNames = useMemo(
    () => extractPermissionNames(user?.publicMetadata?.permissions),
    [user?.publicMetadata?.permissions]
  )

  const roleNames = useMemo(
    () => [...new Set([...storeRoleNames, ...metadataRoleNames])],
    [metadataRoleNames, storeRoleNames]
  )

  const permissionNames = useMemo(
    () =>
      [
        ...new Set([
          ...storePermissionNames,
          ...metadataPermissionNames,
          ...getFallbackPermissionNamesForRoles(roleNames),
        ]),
      ],
    [metadataPermissionNames, roleNames, storePermissionNames]
  )

  return { roleNames, permissionNames }
}

export function useRBACSession() {
  const { user, isLoaded } = useUser()
  const setCurrentAccess = useRBACStore((state) => state.setCurrentAccess)
  const reset = useRBACStore((state) => state.reset)
  const realtimePendingRef = useRef(false)

  const metadataRoleNames = useMemo(
    () =>
      [
        ...extractRoleNames(user?.publicMetadata?.roles),
        ...extractRoleNames(user?.publicMetadata?.role),
      ].map(normalizeRoleName),
    [user?.publicMetadata?.role, user?.publicMetadata?.roles]
  )
  const metadataPermissionNames = useMemo(
    () => [
      ...extractPermissionNames(user?.publicMetadata?.permissions),
      ...getFallbackPermissionNamesForRoles(metadataRoleNames),
    ],
    [metadataRoleNames, user?.publicMetadata?.permissions]
  )

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
          roleNames: metadataRoleNames,
          permissionNames: metadataPermissionNames,
        },
        'bootstrap'
      )
      return
    }

    setCurrentAccess(
      {
        userId: currentAccessQuery.data.clerkUserId,
        roleIds: currentAccessQuery.data.roleIds,
        roleNames:
          currentAccessQuery.data.roleNames.length > 0
            ? currentAccessQuery.data.roleNames
            : metadataRoleNames,
        permissionNames:
          currentAccessQuery.data.permissionNames.length > 0
            ? currentAccessQuery.data.permissionNames
            : metadataPermissionNames,
      },
      realtimePendingRef.current ? 'realtime' : 'bootstrap'
    )

    realtimePendingRef.current = false
  }, [
    currentAccessQuery.data,
    isLoaded,
    metadataPermissionNames,
    metadataRoleNames,
    reset,
    setCurrentAccess,
    user,
  ])

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
