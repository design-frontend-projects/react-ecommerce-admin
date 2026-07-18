import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import { createRule, deleteRule, fetchRules, updateRule } from '../data/actions'
import type { RuleInput } from '../data/schema'

const rulesKey = ['inventory', 'reorder-rules'] as const

export function useReorderRules() {
  return useAuthQuery({
    queryKey: rulesKey,
    queryFn: (getToken) => fetchRules(getToken),
    rbac: { permission: 'inventory.view' },
  })
}

export function useCreateRule() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: RuleInput) => createRule(getToken, input),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success('Reorder rule created.')
      void queryClient.invalidateQueries({ queryKey: rulesKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to create reorder rule', {
        description: error.message,
      }),
  })
}

export function useUpdateRule() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, { id, input }: { id: string; input: Partial<RuleInput> }) =>
      updateRule(getToken, id, input),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success('Reorder rule updated.')
      void queryClient.invalidateQueries({ queryKey: rulesKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to update reorder rule', {
        description: error.message,
      }),
  })
}

export function useDeleteRule() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => deleteRule(getToken, id),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success('Reorder rule deleted.')
      void queryClient.invalidateQueries({ queryKey: rulesKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to delete reorder rule', {
        description: error.message,
      }),
  })
}
