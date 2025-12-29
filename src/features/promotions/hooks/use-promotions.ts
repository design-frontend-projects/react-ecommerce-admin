import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Promotion {
  promotion_id: number
  name: string
  code: string
  description: string | null
  discount_type: string
  discount_value: number
  minimum_purchase: number
  start_date: string | null
  end_date: string | null
  is_active: boolean
  usage_limit: number | null
  usage_per_customer: number | null
  created_at: string
}

export interface PromotionInput {
  name: string
  code: string
  description?: string
  discount_type: string
  discount_value: number
  minimum_purchase?: number
  start_date?: string
  end_date?: string
  is_active?: boolean
  usage_limit?: number
  usage_per_customer?: number
}

export const usePromotions = () => {
  return useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Promotion[]
    },
  })
}

export const useCreatePromotion = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newPromotion: PromotionInput) => {
      const { data, error } = await supabase
        .from('promotions')
        .insert(newPromotion)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] })
    },
  })
}

export const useUpdatePromotion = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: PromotionInput & { id: number }) => {
      const { data, error } = await supabase
        .from('promotions')
        .update(updates)
        .eq('promotion_id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] })
    },
  })
}

export const useDeletePromotion = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('promotion_id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] })
    },
  })
}
