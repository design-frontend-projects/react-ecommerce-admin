import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import {
  cancelCount,
  createCount,
  fetchCount,
  fetchCounts,
  runCountAction,
} from '../data/actions'
import type {
  CountAction,
  CountEntryInput,
  CreateCountInput,
} from '../data/schema'

const countsKey = ['inventory', 'stock-counts'] as const
const countKey = (id: string) => ['inventory', 'stock-counts', id] as const

const ACTION_SUCCESS: Record<CountAction, string> = {
  snapshot: 'Counting started. Expected quantities frozen.',
  save: 'Counts saved.',
  review: 'Count sent to review. Variances computed.',
  post: 'Count posted. Variances applied as an adjustment.',
}

export function useCounts() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: countsKey,
    queryFn: () => fetchCounts(getToken),
    enabled: isLoaded && isSignedIn,
  })
}

export function useCount(id: string | undefined) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: countKey(id ?? ''),
    queryFn: () => fetchCount(getToken, id as string),
    enabled: Boolean(id) && isLoaded && isSignedIn,
  })
}

export function useCreateCount() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCountInput) => createCount(getToken, input),
    onSuccess: () => {
      toast.success('Stock count created.')
      void queryClient.invalidateQueries({ queryKey: countsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to create stock count', {
        description: error.message,
      }),
  })
}

export function useCancelCount() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelCount(getToken, id),
    onSuccess: () => {
      toast.success('Stock count cancelled.')
      void queryClient.invalidateQueries({ queryKey: countsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to cancel stock count', {
        description: error.message,
      }),
  })
}

export function useCountAction() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      action,
      entries,
    }: {
      id: string
      action: CountAction
      entries?: CountEntryInput[]
    }) => runCountAction(getToken, id, action, entries),
    onSuccess: (_data, variables) => {
      toast.success(ACTION_SUCCESS[variables.action])
      void queryClient.invalidateQueries({ queryKey: countsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to update stock count', {
        description: error.message,
      }),
  })
}
