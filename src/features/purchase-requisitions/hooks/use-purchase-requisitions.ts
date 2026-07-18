import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
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
  return useAuthQuery({
    queryKey: requisitionsKey,
    queryFn: (getToken) => fetchRequisitions(getToken),
    rbac: { permission: 'purchasing.view' },
  })
}

export function useRequisition(id: string | undefined) {
  return useAuthQuery({
    queryKey: requisitionKey(id ?? ''),
    queryFn: (getToken) => fetchRequisition(getToken, id as string),
    enabled: Boolean(id),
    rbac: { permission: 'purchasing.view' },
  })
}

export function useCreateRequisition() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: CreateRequisitionInput) =>
      createRequisition(getToken, input),
    rbac: { permission: 'purchasing.manage' },
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
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => cancelRequisition(getToken, id),
    rbac: { permission: 'purchasing.manage' },
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
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, { id, action }: { id: string; action: RequisitionAction }) =>
      actionRequisition(getToken, id, action),
    rbac: { permission: 'purchasing.manage' },
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
