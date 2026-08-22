import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import {
  createSupplier,
  deleteSupplier,
  fetchSuppliers,
  updateSupplier,
} from '../data/actions'
import type { SupplierInput, SupplierListItem } from '../data/schema'

export type Supplier = SupplierListItem
export type { SupplierInput }

export const suppliersKey = ['inventory', 'suppliers'] as const

export function useSuppliers() {
  return useAuthQuery({
    queryKey: suppliersKey,
    queryFn: (getToken) => fetchSuppliers(getToken),
    rbac: { permission: 'purchasing.view' },
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, input: SupplierInput) => createSupplier(getToken, input),
    rbac: { permission: 'purchasing.manage' },
    onSuccess: () => {
      toast.success('Supplier created successfully.')
      void queryClient.invalidateQueries({ queryKey: suppliersKey })
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (error: Error) =>
      toast.error('Unable to create supplier', { description: error.message }),
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (
      getToken,
      { id, input }: { id: string; input: Partial<SupplierInput> }
    ) => updateSupplier(getToken, id, input),
    rbac: { permission: 'purchasing.manage' },
    onSuccess: () => {
      toast.success('Supplier updated successfully.')
      void queryClient.invalidateQueries({ queryKey: suppliersKey })
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (error: Error) =>
      toast.error('Unable to update supplier', { description: error.message }),
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => deleteSupplier(getToken, id),
    rbac: { permission: 'purchasing.manage' },
    onSuccess: () => {
      toast.success('Supplier deleted successfully.')
      void queryClient.invalidateQueries({ queryKey: suppliersKey })
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (error: Error) =>
      toast.error('Unable to delete supplier', { description: error.message }),
  })
}
