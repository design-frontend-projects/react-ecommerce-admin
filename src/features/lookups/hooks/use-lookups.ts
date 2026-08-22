import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import {
  createLookupValue,
  deleteLookupValue,
  fetchLookupTypes,
  fetchLookupValues,
  reorderLookupValues,
  toggleLookupValue,
  updateLookupValue,
} from '../data/actions'
import type { LookupValueFormValues } from '../data/schema'

export const lookupTypesKey = ['lookups', 'types'] as const
export const lookupValuesKey = (typeCode: string) => ['lookups', 'values', typeCode] as const

export function useLookupTypes() {
  return useAuthQuery({
    queryKey: lookupTypesKey,
    queryFn: (getToken) => fetchLookupTypes(getToken),
    rbac: { permission: 'inventory.stock.view' },
  })
}

export function useLookupValues(typeCode?: string | null, includeInactive = true) {
  return useAuthQuery({
    queryKey: typeCode ? lookupValuesKey(typeCode) : ['lookups', 'values', 'none'],
    queryFn: (getToken) => {
      if (!typeCode) return Promise.resolve({ lookupType: { id: '', code: '', name: '', is_system: false }, values: [] })
      return fetchLookupValues(getToken, typeCode, includeInactive)
    },
    enabled: !!typeCode,
    rbac: { permission: 'inventory.stock.view' },
  })
}

export function useCreateLookupValue(typeCode: string) {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: LookupValueFormValues) =>
      createLookupValue(getToken, typeCode, input),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      toast.success('Lookup value created successfully.')
      void queryClient.invalidateQueries({ queryKey: lookupValuesKey(typeCode) })
      void queryClient.invalidateQueries({ queryKey: lookupTypesKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to create lookup value', { description: error.message }),
  })
}

export function useUpdateLookupValue(typeCode: string) {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (
      getToken,
      { id, input }: { id: string; input: Partial<LookupValueFormValues> }
    ) => updateLookupValue(getToken, id, input),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      toast.success('Lookup value updated.')
      void queryClient.invalidateQueries({ queryKey: lookupValuesKey(typeCode) })
    },
    onError: (error: Error) =>
      toast.error('Unable to update lookup value', { description: error.message }),
  })
}

export function useToggleLookupValue(typeCode: string) {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => toggleLookupValue(getToken, id),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      toast.success('Status updated.')
      void queryClient.invalidateQueries({ queryKey: lookupValuesKey(typeCode) })
      void queryClient.invalidateQueries({ queryKey: lookupTypesKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to change status', { description: error.message }),
  })
}

export function useDeleteLookupValue(typeCode: string) {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => deleteLookupValue(getToken, id),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      toast.success('Lookup value deactivated.')
      void queryClient.invalidateQueries({ queryKey: lookupValuesKey(typeCode) })
      void queryClient.invalidateQueries({ queryKey: lookupTypesKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to deactivate lookup value', { description: error.message }),
  })
}

export function useReorderLookupValues(typeCode: string) {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, orderedIds: string[]) =>
      reorderLookupValues(getToken, typeCode, orderedIds),
    rbac: { permission: 'inventory.stock.manage' },
    onSuccess: () => {
      toast.success('Order updated.')
      void queryClient.invalidateQueries({ queryKey: lookupValuesKey(typeCode) })
    },
    onError: (error: Error) =>
      toast.error('Unable to reorder values', { description: error.message }),
  })
}
