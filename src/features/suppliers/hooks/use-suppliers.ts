import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Supplier {
  supplier_id: number
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  website: string | null
  notes: string | null
  created_at: string
}

export interface SupplierInput {
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  website?: string
  notes?: string
}

export const useSuppliers = () => {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name')

      if (error) throw error
      return data as Supplier[]
    },
  })
}

export const useSupplier = (id: number) => {
  return useQuery({
    queryKey: ['suppliers', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('supplier_id', id)
        .single()

      if (error) throw error
      return data as Supplier
    },
    enabled: !!id,
  })
}

export const useCreateSupplier = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newSupplier: SupplierInput) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(newSupplier)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: SupplierInput & { id: number }) => {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('supplier_id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('supplier_id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}
