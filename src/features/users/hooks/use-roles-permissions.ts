import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateUserBranch } from '@/server/fns/users'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import {
  createRole,
  deleteRole,
  fetchRBACCatalog,
  setRolePermissions,
  updateRole,
  updateUserRoles,
} from '../data/actions'
import type { CreateRoleInput, UpdateRoleInput } from '../data/types'

export const rbacCatalogQueryKey = ['rbac-catalog'] as const

export function useRBACCatalog(enabled = true) {
  return useAuthQuery({
    queryKey: rbacCatalogQueryKey,
    queryFn: (getToken) => fetchRBACCatalog(getToken),
    enabled,
    rbac: { permission: 'roles.manage' },
    staleTime: 60_000,
  })
}

export function usePermissions(enabled = true) {
  return useAuthQuery({
    queryKey: rbacCatalogQueryKey,
    queryFn: (getToken) => fetchRBACCatalog(getToken),
    enabled,
    rbac: { permission: 'permissions.manage' },
    select: (catalog) => catalog.allPermissions,
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()

  return useAuthMutation({
    mutationFn: (getToken, input: CreateRoleInput) => createRole(getToken, input),
    rbac: { permission: 'roles.manage' },
    onSuccess: () => {
      toast.success('Role created.')
      void queryClient.invalidateQueries({ queryKey: rbacCatalogQueryKey })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to create the role.')
    },
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()

  return useAuthMutation({
    mutationFn: (getToken, input: UpdateRoleInput) => updateRole(getToken, input),
    rbac: { permission: 'roles.manage' },
    onSuccess: () => {
      toast.success('Role updated.')
      void queryClient.invalidateQueries({ queryKey: rbacCatalogQueryKey })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to update the role.')
    },
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()

  return useAuthMutation({
    mutationFn: (getToken, roleId: string) => deleteRole(getToken, roleId),
    rbac: { permission: 'roles.manage' },
    onSuccess: () => {
      toast.success('Role deleted.')
      void queryClient.invalidateQueries({ queryKey: rbacCatalogQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to delete the role.')
    },
  })
}

export function useSetRolePermissions() {
  const queryClient = useQueryClient()

  return useAuthMutation({
    mutationFn: (getToken, input: { roleId: string; permissionIds: string[] }) =>
      setRolePermissions(getToken, input),
    rbac: { permission: 'permissions.manage' },
    onSuccess: () => {
      toast.success('Role permissions saved.')
      void queryClient.invalidateQueries({ queryKey: rbacCatalogQueryKey })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to update role permissions.')
    },
  })
}

export function useUpdateUserRole() {
  const { getToken, has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      input:
        | { userId: string; role: string }
        | { userId: string; roleIds: string[] }
    ) => {
      if (!has({ permission: 'users.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      if ('roleIds' in input) {
        return updateUserRoles(getToken, input)
      }

      const catalog = await fetchRBACCatalog(getToken)
      const role =
        catalog.roles.find((candidate) => candidate.id === input.role) ??
        catalog.roles.find((candidate) => candidate.name === input.role)

      if (!role) {
        throw new Error('Selected role could not be resolved.')
      }

      return updateUserRoles(getToken, {
        userId: input.userId,
        roleIds: [role.id],
      })
    },
    onSuccess: () => {
      toast.success('User role updated.')
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      void queryClient.invalidateQueries({ queryKey: rbacCatalogQueryKey })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to update the selected role.')
    },
  })
}

export function useUpdateUserBranch() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { userId: string; branchId: string | null }) => {
      const sessionToken = await getToken()
      if (!sessionToken) {
        throw new Error('Your session is not available. Please sign in again.')
      }
      return updateUserBranch({ data: { ...input, sessionToken } })
    },
    onSuccess: () => {
      toast.success('User branch updated.')
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to update user branch.')
    },
  })
}
