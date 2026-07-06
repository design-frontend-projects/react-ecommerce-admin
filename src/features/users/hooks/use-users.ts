import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { fetchUsers, updateUserRoles } from '../data/actions'
import type { UpdateUserRolesInput, CreateUserInput } from '../data/types'
import { createUserDirect } from '@/server/fns/create-user'

export const usersQueryKey = ['users'] as const

export function useUsersList(enabled = true) {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: usersQueryKey,
    queryFn: () => fetchUsers(getToken),
    enabled: enabled && isLoaded && isSignedIn,
  })
}

export function useUpdateUserRole() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateUserRolesInput) =>
      updateUserRoles(getToken, input),
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
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      return createUserDirect({ data: input })
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
