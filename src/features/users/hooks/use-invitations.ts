import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchRBACCatalog, inviteUser } from '../data/actions'
import type { InviteUserInput } from '../data/types'

export function useInviteUser() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: InviteUserInput) => inviteUser(getToken, input),
    onSuccess: (result) => {
      toast.success(result.message)
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to send the invitation.')
    },
  })
}

export function useRoles(enabled = true) {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  return useQuery({
    queryKey: ['rbac-catalog'],
    queryFn: () => fetchRBACCatalog(getToken),
    enabled: enabled && isLoaded && isSignedIn,
    select: (catalog) => catalog.roles,
  })
}
