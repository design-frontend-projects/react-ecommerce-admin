import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import {
  createConversion,
  createUom,
  deleteConversion,
  deleteUom,
  fetchConversions,
  fetchUoms,
  updateUom,
} from '../data/actions'
import type { ConversionInput, UomInput } from '../data/schema'

const uomsKey = ['inventory', 'uoms'] as const
const conversionsKey = ['inventory', 'unit-conversions'] as const

export function useUoms() {
  return useAuthQuery({
    queryKey: uomsKey,
    queryFn: (getToken) => fetchUoms(getToken),
    rbac: { permission: 'inventory.view' },
  })
}

export function useConversions() {
  return useAuthQuery({
    queryKey: conversionsKey,
    queryFn: (getToken) => fetchConversions(getToken),
    rbac: { permission: 'inventory.view' },
  })
}

export function useCreateUom() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: UomInput) => createUom(getToken, input),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success('Unit created.')
      void queryClient.invalidateQueries({ queryKey: uomsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to create unit', { description: error.message }),
  })
}

export function useUpdateUom() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, { id, input }: { id: string; input: Partial<UomInput> }) =>
      updateUom(getToken, id, input),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success('Unit updated.')
      void queryClient.invalidateQueries({ queryKey: uomsKey })
      void queryClient.invalidateQueries({ queryKey: conversionsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to update unit', { description: error.message }),
  })
}

export function useDeleteUom() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => deleteUom(getToken, id),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success('Unit deleted.')
      void queryClient.invalidateQueries({ queryKey: uomsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to delete unit', { description: error.message }),
  })
}

export function useCreateConversion() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: ConversionInput) => createConversion(getToken, input),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success('Conversion added.')
      void queryClient.invalidateQueries({ queryKey: conversionsKey })
      void queryClient.invalidateQueries({ queryKey: uomsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to add conversion', { description: error.message }),
  })
}

export function useDeleteConversion() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => deleteConversion(getToken, id),
    rbac: { permission: 'inventory.manage' },
    onSuccess: () => {
      toast.success('Conversion deleted.')
      void queryClient.invalidateQueries({ queryKey: conversionsKey })
      void queryClient.invalidateQueries({ queryKey: uomsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to delete conversion', {
        description: error.message,
      }),
  })
}
