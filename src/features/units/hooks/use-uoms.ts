import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
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
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: uomsKey,
    queryFn: () => fetchUoms(getToken),
    enabled: isLoaded && isSignedIn,
  })
}

export function useConversions() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: conversionsKey,
    queryFn: () => fetchConversions(getToken),
    enabled: isLoaded && isSignedIn,
  })
}

export function useCreateUom() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UomInput) => createUom(getToken, input),
    onSuccess: () => {
      toast.success('Unit created.')
      void queryClient.invalidateQueries({ queryKey: uomsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to create unit', { description: error.message }),
  })
}

export function useUpdateUom() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<UomInput> }) =>
      updateUom(getToken, id, input),
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
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteUom(getToken, id),
    onSuccess: () => {
      toast.success('Unit deleted.')
      void queryClient.invalidateQueries({ queryKey: uomsKey })
    },
    onError: (error: Error) =>
      toast.error('Unable to delete unit', { description: error.message }),
  })
}

export function useCreateConversion() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ConversionInput) => createConversion(getToken, input),
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
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteConversion(getToken, id),
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
