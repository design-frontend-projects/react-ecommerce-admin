import { create } from 'zustand'
import type { Permission, Role } from './schema'

interface RBACState {
  permissions: Permission[]
  roles: Role[]
  setPermissions: (permissions: Permission[]) => void
  setRoles: (roles: Role[]) => void
}

export const useRBACStore = create<RBACState>((set) => ({
  permissions: [],
  roles: [],
  setPermissions: (permissions) => set({ permissions }),
  setRoles: (roles) => set({ roles }),
}))
