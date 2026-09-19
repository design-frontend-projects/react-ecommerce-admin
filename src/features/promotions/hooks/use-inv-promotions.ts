import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import {
  getPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  changePromotionStatus,
  duplicatePromotion,
  deletePromotion,
  getPromotionUsageStats,
  getPromotionLookupData,
  type GetPromotionsFilter,
  type PromotionMutationInput,
} from '@/server/fns/promotions-crud'
import type { PromotionStatus } from '@/features/promotions/types'

export function useInvPromotions(filter: GetPromotionsFilter = {}) {
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useQuery({
    queryKey: ['inv_promotions', filter, userId],
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated')
      return getPromotions(userId, filter)
    },
    enabled: !!userId,
  })
}

export function useInvPromotion(promotionId?: string) {
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useQuery({
    queryKey: ['inv_promotion', promotionId, userId],
    queryFn: async () => {
      if (!userId || !promotionId) throw new Error('Missing parameters')
      return getPromotionById(userId, promotionId)
    },
    enabled: !!userId && !!promotionId,
  })
}

export function usePromotionUsageStats() {
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useQuery({
    queryKey: ['inv_promotion_stats', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated')
      return getPromotionUsageStats(userId)
    },
    enabled: !!userId,
  })
}

export function usePromotionLookupData() {
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useQuery({
    queryKey: ['inv_promotion_lookups', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated')
      return getPromotionLookupData(userId)
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreatePromotion() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useMutation({
    mutationFn: async (input: PromotionMutationInput) => {
      if (!userId) throw new Error('User not authenticated')
      return createPromotion(userId, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv_promotions'] })
      queryClient.invalidateQueries({ queryKey: ['inv_promotion_stats'] })
    },
  })
}

export function useUpdatePromotion() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: PromotionMutationInput }) => {
      if (!userId) throw new Error('User not authenticated')
      return updatePromotion(userId, id, input)
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['inv_promotions'] })
      queryClient.invalidateQueries({ queryKey: ['inv_promotion', vars.id] })
    },
  })
}

export function useChangePromotionStatus() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PromotionStatus }) => {
      if (!userId) throw new Error('User not authenticated')
      return changePromotionStatus(userId, id, status)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv_promotions'] })
      queryClient.invalidateQueries({ queryKey: ['inv_promotion_stats'] })
    },
  })
}

export function useDuplicatePromotion() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated')
      return duplicatePromotion(userId, id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv_promotions'] })
    },
  })
}

export function useDeletePromotion() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated')
      return deletePromotion(userId, id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv_promotions'] })
      queryClient.invalidateQueries({ queryKey: ['inv_promotion_stats'] })
    },
  })
}
