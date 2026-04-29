import { create } from 'zustand'
import type { PermissionRecord, RoleWithPermissions } from './types'

type SyncSource = 'bootstrap' | 'realtime' | 'mutation'

interface RBACState {
  currentUserId: string | null
  currentRoleIds: string[]
  currentRoleNames: string[]
  currentPermissionNames: string[]
  catalogRoles: RoleWithPermissions[]
  catalogPermissions: PermissionRecord[]
  lastSyncSource: SyncSource | null
  lastSyncedAt: number | null
  notificationVersion: number
  setCatalog: (payload: {
    roles: RoleWithPermissions[]
    permissions: PermissionRecord[]
  }) => void
  setCurrentAccess: (
    payload: {
      userId: string | null
      roleIds: string[]
      roleNames: string[]
      permissionNames: string[]
    },
    source?: SyncSource
  ) => void
  reset: () => void
}

const initialState = {
  currentUserId: null,
  currentRoleIds: [],
  currentRoleNames: [],
  currentPermissionNames: [],
  catalogRoles: [],
  catalogPermissions: [],
  lastSyncSource: null,
  lastSyncedAt: null,
  notificationVersion: 0,
}

export const useRBACStore = create<RBACState>((set) => ({
  ...initialState,
  setCatalog: ({ roles, permissions }) =>
    set({
      catalogRoles: roles,
      catalogPermissions: permissions,
    }),
  setCurrentAccess: (payload, source = 'bootstrap') =>
    set((state) => ({
      currentUserId: payload.userId,
      currentRoleIds: payload.roleIds,
      currentRoleNames: payload.roleNames,
      currentPermissionNames: payload.permissionNames,
      lastSyncSource: source,
      lastSyncedAt: Date.now(),
      notificationVersion:
        source === 'realtime'
          ? state.notificationVersion + 1
          : state.notificationVersion,
    })),
  reset: () => set(initialState),
}))
