import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { createRule, deleteRule, fetchRules, updateRule } from '../data/actions'
import type { RuleInput } from '../data/schema'

const rulesKey = ['inventory', 'reorder-rules'] as const

export function useReorderRules() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: rulesKey,
    queryFn: () => fetchRules(getToken),
    enabled: isLoaded && isSignedIn,
  })
}

export function useCreateRule() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RuleInput) => createRule(getToken, input),
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
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<RuleInput> }) =>
      updateRule(getToken, id, input),
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
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteRule(getToken, id),
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
