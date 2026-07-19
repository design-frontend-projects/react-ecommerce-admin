import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createUserDirect } from '@/server/fns/create-user'
import { deactivateUser, changeUserPassword } from '@/server/fns/users'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import { fetchUsers, updateUserRoles } from '../data/actions'
import type { UpdateUserRolesInput, CreateUserInput } from '../data/types'

export const usersQueryKey = ['users'] as const

export function useUsersList(enabled = true) {
  return useAuthQuery({
    queryKey: usersQueryKey,
    queryFn: (getToken) => fetchUsers(getToken),
    enabled,
    rbac: { permission: 'users.view' },
  })
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  return useAuthMutation({
    mutationFn: (getToken, input: UpdateUserRolesInput) =>
      updateUserRoles(getToken, input),
    rbac: { permission: 'users.manage' },
    onSuccess: () => {
      toast.success('User role updated.')
      void queryClient.invalidateQueries({ queryKey: usersQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['rbac-catalog'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to update the selected role.')
    },
  })
}

export function useCreateUser() {
  const { has, getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      if (!has({ permission: 'users.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }
      const sessionToken = await getToken()
      if (!sessionToken) {
        throw new Error('Your session is not available. Please sign in again.')
      }
      return createUserDirect({ data: { ...input, sessionToken } })
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message)
        void queryClient.invalidateQueries({ queryKey: usersQueryKey })
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to create user.')
    },
  })
}

export function useDeactivateUser() {
  const { has, getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!has({ permission: 'users.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }
      const sessionToken = await getToken()
      if (!sessionToken) {
        throw new Error('Your session is not available. Please sign in again.')
      }
      return deactivateUser({ data: { userId, sessionToken } })
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('User deactivated successfully.')
        void queryClient.invalidateQueries({ queryKey: usersQueryKey })
      } else {
        toast.error('Failed to deactivate user.')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to deactivate user.')
    },
  })
}

export function useResetUserPassword() {
  const { has, getToken } = useAuth()

  return useMutation({
    mutationFn: async ({
      userId,
      password,
    }: {
      userId: string
      password: string
    }) => {
      if (!has({ permission: 'users.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }
      const sessionToken = await getToken()
      if (!sessionToken) {
        throw new Error('Your session is not available. Please sign in again.')
      }
      return changeUserPassword({ data: { userId, password, sessionToken } })
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Password reset successfully.')
      } else {
        toast.error('Failed to reset password.')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to reset password.')
    },
  })
}
