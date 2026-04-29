import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchUsers, updateUserRoles } from '../data/actions'
import type { UpdateUserRolesInput } from '../data/types'

export const usersQueryKey = ['users'] as const

export function useUsersList(enabled = true) {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  return useQuery({
    queryKey: usersQueryKey,
    queryFn: () => fetchUsers(getToken),
    enabled: enabled && isLoaded && isSignedIn,
  })
}

export function useUpdateUserRole() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateUserRolesInput) => updateUserRoles(getToken, input),
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
