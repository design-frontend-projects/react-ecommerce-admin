import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type PromotionActivity = 'dine_in' | 'takeaway' | 'delivery'
export type PromotionType = 'order_discount' | 'item_discount' | 'buy_x_get_y'
export type PromotionScopeRole = 'target' | 'buy' | 'get'

export interface PromotionScope {
  scope_id?: number
  promotion_id?: number
  menu_item_id?: string | null
  menu_category_id?: string | null
  scope_role: PromotionScopeRole
}

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
  activities: PromotionActivity[]
  promo_type: PromotionType
  buy_quantity: number | null
  get_quantity: number | null
  get_discount_value: number | null
  scopes?: PromotionScope[]
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
  usage_limit?: number | null
  usage_per_customer?: number | null
  activities: PromotionActivity[]
  promo_type: PromotionType
  buy_quantity?: number | null
  get_quantity?: number | null
  get_discount_value?: number | null
  scopes?: PromotionScope[]
}

function splitInput(input: PromotionInput): {
  row: Omit<PromotionInput, 'scopes'>
  scopes: PromotionScope[]
} {
  const { scopes, ...row } = input
  return { row, scopes: scopes ?? [] }
}

async function replaceScopes(
  promotionId: number,
  scopes: PromotionScope[]
): Promise<void> {
  // Delete-then-insert: scope sets are small and this keeps updates simple
  // and correct.
  const { error: deleteError } = await supabase
    .from('promotion_menu_scopes')
    .delete()
    .eq('promotion_id', promotionId)
  if (deleteError) throw deleteError

  if (scopes.length === 0) return

  const { error: insertError } = await supabase
    .from('promotion_menu_scopes')
    .insert(
      scopes.map((scope) => ({
        promotion_id: promotionId,
        menu_item_id: scope.menu_item_id ?? null,
        menu_category_id: scope.menu_category_id ?? null,
        scope_role: scope.scope_role,
      }))
    )
  if (insertError) throw insertError
}

export const usePromotions = () => {
  return useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*, scopes:promotion_menu_scopes(*)')
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
      const { row, scopes } = splitInput(newPromotion)
      const { data, error } = await supabase
        .from('promotions')
        .insert(row)
        .select()
        .maybeSingle()

      if (error) throw error
      if (data && scopes.length > 0) {
        await replaceScopes(data.promotion_id, scopes)
      }
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
      const { row, scopes } = splitInput(updates)
      const { data, error } = await supabase
        .from('promotions')
        .update(row)
        .eq('promotion_id', id)
        .select()
        .maybeSingle()

      if (error) throw error
      await replaceScopes(id, scopes)
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
