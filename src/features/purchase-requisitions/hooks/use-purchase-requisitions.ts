import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import {
  actionRequisition,
  cancelRequisition,
  createRequisition,
  fetchRequisition,
  fetchRequisitions,
} from '../data/actions'
import type { CreateRequisitionInput, RequisitionAction } from '../data/schema'

const requisitionsKey = ['inventory', 'purchase-requisitions'] as const
const requisitionKey = (id: string) =>
  ['inventory', 'purchase-requisitions', id] as const

const ACTION_SUCCESS: Record<RequisitionAction, string> = {
  submit: 'Requisition submitted for approval.',
  approve: 'Requisition approved.',
  reject: 'Requisition rejected.',
  convert: 'Requisition converted to a purchase order.',
}

export function useRequisitions() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: requisitionsKey,
    queryFn: () => fetchRequisitions(getToken),
    enabled: isLoaded && isSignedIn,
  })
}

export function useRequisition(id: string | undefined) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: requisitionKey(id ?? ''),
    queryFn: () => fetchRequisition(getToken, id as string),
    enabled: Boolean(id) && isLoaded && isSignedIn,
  })
}

export function useCreateRequisition() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateRequisitionInput) =>
      createRequisition(getToken, input),
    onSuccess: () => {
      toast.success('Requisition created as draft.')
      void queryClient.invalidateQueries({ queryKey: requisitionsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to create requisition', {
        description: error.message,
      }),
  })
}

export function useCancelRequisition() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelRequisition(getToken, id),
    onSuccess: () => {
      toast.success('Requisition cancelled.')
      void queryClient.invalidateQueries({ queryKey: requisitionsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to cancel requisition', {
        description: error.message,
      }),
  })
}

export function useRequisitionAction() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: RequisitionAction }) =>
      actionRequisition(getToken, id, action),
    onSuccess: (_data, variables) => {
      toast.success(ACTION_SUCCESS[variables.action])
      void queryClient.invalidateQueries({ queryKey: requisitionsKey })
      if (variables.action === 'convert') {
        void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      }
    },
    onError: (error: Error) =>
      toast.error('Unable to update requisition', {
        description: error.message,
      }),
  })
}
