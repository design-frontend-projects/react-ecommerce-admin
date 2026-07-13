import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import {
  convertSuggestions,
  dismissSuggestion,
  fetchSuggestions,
  runReorderCheck,
} from '../data/actions'

const suggestionsKey = ['inventory', 'reorder-suggestions'] as const

export function useSuggestions() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: suggestionsKey,
    queryFn: () => fetchSuggestions(getToken),
    enabled: isLoaded && isSignedIn,
  })
}

export function useRunReorderCheck() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (storeId?: string) => runReorderCheck(getToken, storeId),
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
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => convertSuggestions(getToken, ids),
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
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => dismissSuggestion(getToken, id),
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
