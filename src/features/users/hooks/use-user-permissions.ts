import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import {
  fetchUserPermissionOverrides,
  setUserPermissionOverrides,
} from '../data/actions'

export const userPermissionOverridesQueryKey = (tenantUserId: string) =>
  ['user-permission-overrides', tenantUserId] as const

/** A user's per-permission grant/deny overrides (permission ids). */
export function useUserPermissionOverrides(
  tenantUserId: string | undefined,
  enabled = true
) {
  return useAuthQuery({
    queryKey: userPermissionOverridesQueryKey(tenantUserId ?? 'none'),
    queryFn: (getToken) => fetchUserPermissionOverrides(getToken, tenantUserId!),
    enabled: enabled && !!tenantUserId,
    rbac: { permission: 'access_control.users.manage' },
  })
}

export function useSetUserPermissionOverrides() {
  const queryClient = useQueryClient()

  return useAuthMutation({
    mutationFn: (
      getToken,
      input: { tenantUserId: string; grants: string[]; denies: string[] }
    ) => setUserPermissionOverrides(getToken, input),
    rbac: { permission: 'access_control.users.manage' },
    onSuccess: (_effectiveNames, variables) => {
      toast.success('Permission overrides saved.')
      void queryClient.invalidateQueries({
        queryKey: userPermissionOverridesQueryKey(variables.tenantUserId),
      })
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      void queryClient.invalidateQueries({ queryKey: ['current-user-access'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to save permission overrides.')
    },
  })
}
