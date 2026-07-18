import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import {
  convertSuggestions,
  dismissSuggestion,
  fetchSuggestions,
  runReorderCheck,
} from '../data/actions'

const suggestionsKey = ['inventory', 'reorder-suggestions'] as const

export function useSuggestions() {
  return useAuthQuery({
    queryKey: suggestionsKey,
    queryFn: (getToken) => fetchSuggestions(getToken),
    rbac: { permission: 'purchasing.view' },
  })
}

export function useRunReorderCheck() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, storeId?: string) => runReorderCheck(getToken, storeId),
    rbac: { permission: 'purchasing.manage' },
    onSuccess: (data) => {
      toast.success('Reorder check complete.', {
        description: `${data.suggestions_open} suggestion(s) currently open.`,
      })
      void queryClient.invalidateQueries({ queryKey: suggestionsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to run the reorder check', {
        description: error.message,
      }),
  })
}

export function useConvertSuggestions() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, ids: string[]) => convertSuggestions(getToken, ids),
    rbac: { permission: 'purchasing.manage' },
    onSuccess: (data) => {
      toast.success('Requisition created.', {
        description: `${data.suggestions_converted} suggestion(s) converted into a purchase requisition.`,
      })
      void queryClient.invalidateQueries({ queryKey: suggestionsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to convert suggestions', {
        description: error.message,
      }),
  })
}

export function useDismissSuggestion() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => dismissSuggestion(getToken, id),
    rbac: { permission: 'purchasing.manage' },
    onSuccess: () => {
      toast.success('Suggestion dismissed.')
      void queryClient.invalidateQueries({ queryKey: suggestionsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to dismiss suggestion', {
        description: error.message,
      }),
  })
}
