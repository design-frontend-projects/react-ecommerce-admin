import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import {
  fetchPromotions,
  fetchPromotionById,
  fetchPromotionStats,
  fetchPromotionLookups,
  createPromotion,
  updatePromotion,
  changePromotionStatus,
  duplicatePromotion,
  deletePromotion,
} from '../data/actions'
import type {
  GetPromotionsFilter,
  PromotionMutationInput,
} from '@/server/fns/promotions-crud'
import type { PromotionStatus } from '@/features/promotions/types'

export function useInvPromotions(filter: GetPromotionsFilter = {}) {
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useQuery({
    queryKey: ['inv_promotions', filter, userId],
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated')
      return fetchPromotions(filter)
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
      return fetchPromotionById(promotionId)
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
      return fetchPromotionStats()
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
      return fetchPromotionLookups()
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
      return createPromotion(input)
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
      return updatePromotion(id, input)
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['inv_promotions'] })
      queryClient.invalidateQueries({ queryKey: ['inv_promotion', vars.id] })
      queryClient.invalidateQueries({ queryKey: ['inv_promotion_stats'] })
    },
  })
}

export function useChangePromotionStatus() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.auth.user?.id)

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PromotionStatus }) => {
      if (!userId) throw new Error('User not authenticated')
      return changePromotionStatus(id, status)
    },
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ['inv_promotion', id] })
      await queryClient.cancelQueries({ queryKey: ['inv_promotions'] })

      // Snapshot previous values
      const previousPromotion = queryClient.getQueryData(['inv_promotion', id, userId])
      const previousPromotionsList = queryClient.getQueriesData({ queryKey: ['inv_promotions'] })

      // Optimistically update single promotion query
      queryClient.setQueriesData(
        { queryKey: ['inv_promotion', id] },
        (old: any) => {
          if (!old) return old
          return { ...old, status }
        }
      )

      // Optimistically update list queries
      queryClient.setQueriesData(
        { queryKey: ['inv_promotions'] },
        (old: any) => {
          if (!old?.data) return old
          return {
            ...old,
            data: old.data.map((p: any) => (p.id === id ? { ...p, status } : p)),
          }
        }
      )

      return { previousPromotion, previousPromotionsList }
    },
    onError: (_err, { id }, context) => {
      if (context?.previousPromotion) {
        queryClient.setQueryData(['inv_promotion', id, userId], context.previousPromotion)
      }
      if (context?.previousPromotionsList) {
        for (const [key, data] of context.previousPromotionsList) {
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['inv_promotion', id] })
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
      return duplicatePromotion(id)
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
      return deletePromotion(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv_promotions'] })
      queryClient.invalidateQueries({ queryKey: ['inv_promotion_stats'] })
    },
  })
}
