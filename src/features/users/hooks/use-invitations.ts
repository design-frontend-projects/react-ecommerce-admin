import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import { fetchRBACCatalog, inviteUser } from '../data/actions'
import type { InviteUserInput } from '../data/types'

export function useInviteUser() {
  const queryClient = useQueryClient()

  return useAuthMutation({
    mutationFn: (getToken, input: InviteUserInput) => inviteUser(getToken, input),
    rbac: { permission: 'users.manage' },
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
  return useAuthQuery({
    queryKey: ['rbac-catalog'],
    queryFn: (getToken) => fetchRBACCatalog(getToken),
    enabled,
    rbac: { permission: 'users.view' },
    select: (catalog) => catalog.roles,
  })
}
