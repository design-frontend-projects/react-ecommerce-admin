import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
  const { getToken, isLoaded, isSignedIn } = useAuth()

  return useQuery({
    queryKey: rbacCatalogQueryKey,
    queryFn: () => fetchRBACCatalog(getToken),
    enabled: enabled && isLoaded && isSignedIn,
    staleTime: 60_000,
  })
}

export function usePermissions(enabled = true) {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  return useQuery({
    queryKey: rbacCatalogQueryKey,
    queryFn: () => fetchRBACCatalog(getToken),
    enabled: enabled && isLoaded && isSignedIn,
    select: (catalog) => catalog.allPermissions,
  })
}

export function useCreateRole() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateRoleInput) => createRole(getToken, input),
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
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateRoleInput) => updateRole(getToken, input),
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
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (roleId: string) => deleteRole(getToken, roleId),
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
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { roleId: string; permissionIds: string[] }) =>
      setRolePermissions(getToken, input),
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
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { userId: string; role: string } | { userId: string; roleIds: string[] }) => {
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
