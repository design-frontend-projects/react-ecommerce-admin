import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  InviteUserInput,
  InviteUserResult,
} from '@/server/fns/invitations'
import type { RoleWithPermissions } from '@/server/fns/rbac.types'
import { toast } from 'sonner'

// Placeholder for API client - replace with your actual API transport (e.g. fetch, axios, trpc)
const api = {
  inviteUser: async (data: InviteUserInput): Promise<InviteUserResult> => {
    // In a real app, this would be: await fetch('/api/users/invite', { method: 'POST', body: JSON.stringify(data) })
    console.log('Sending invite payload to server:', data)
    return {
      success: true,
      clerkInvitationId: 'mock_inv_id',
      tenantUserId: 'mock_tenant_id',
    }
  },
  getRoles: async (): Promise<RoleWithPermissions[]> => {
    // In a real app, this would be: await fetch('/api/roles').then(res => res.json())
    console.log('Fetching roles from server...')
    return [
      {
        id: '1',
        name: 'super_admin',
        description: 'System Admin',
        is_active: true,
        created_at: null,
        updated_at: null,
        permissions: [],
      },
      {
        id: '2',
        name: 'admin',
        description: 'Restaurant Admin',
        is_active: true,
        created_at: null,
        updated_at: null,
        permissions: [],
      },
      {
        id: '3',
        name: 'manager',
        description: 'Branch Manager',
        is_active: true,
        created_at: null,
        updated_at: null,
        permissions: [],
      },
      {
        id: '4',
        name: 'cashier',
        description: 'Cashier',
        is_active: true,
        created_at: null,
        updated_at: null,
        permissions: [],
      },
    ]
  },
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: api.getRoles,
  })
}

export function useInviteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.inviteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User invited successfully.')
    },
    onError: (error: Error) => {
      toast.error(`Failed to invite user: ${error.message}`)
    },
  })
}
