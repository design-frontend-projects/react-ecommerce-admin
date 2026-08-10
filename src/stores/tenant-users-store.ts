import { create } from 'zustand'
import type { TenantUser } from '@/features/users/data/schema'

interface TenantUsersState {
  /** All users created by the current tenant, scoped by parent_auth_user_id */
  tenantUsers: TenantUser[]
  /** Loading state */
  isLoading: boolean
  /** Set all tenant users (replaces the list) */
  setTenantUsers: (users: TenantUser[]) => void
  /** Add a single tenant user to the list */
  addTenantUser: (user: TenantUser) => void
  /** Add multiple tenant users (e.g., from onboarding batch) */
  addTenantUsers: (users: TenantUser[]) => void
  /** Remove a tenant user by authUserId */
  removeTenantUser: (authUserId: string) => void
  /** Set loading state */
  setIsLoading: (loading: boolean) => void
  /** Reset the store */
  reset: () => void
}

const initialState = {
  tenantUsers: [] as TenantUser[],
  isLoading: false,
}

export const useTenantUsersStore = create<TenantUsersState>((set) => ({
  ...initialState,

  setTenantUsers: (users) =>
    set({ tenantUsers: users }),

  addTenantUser: (user) =>
    set((state) => ({
      tenantUsers: [...state.tenantUsers, user],
    })),

  addTenantUsers: (users) =>
    set((state) => ({
      tenantUsers: [...state.tenantUsers, ...users],
    })),

  removeTenantUser: (authUserId) =>
    set((state) => ({
      tenantUsers: state.tenantUsers.filter(
        (u) => u.authUserId !== authUserId
      ),
    })),

  setIsLoading: (isLoading) =>
    set({ isLoading }),

  reset: () => set(initialState),
}))
